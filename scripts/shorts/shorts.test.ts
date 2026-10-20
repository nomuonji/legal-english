import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shortSchema, buildShortTimeline, toDictRows, verifyAgainstDictionary, totalFrames, endingBeat} from '../../src/LegalShorts/model';
import {loadShort, DICT_PATH, allShortIds, shortPath} from './prepare';

const rows = toDictRows(fs.readFileSync(DICT_PATH, 'utf8'));
const ids = allShortIds();

test('Dictionary snapshot parses completely (quoted commas and line breaks)', () => {
  assert.equal(rows.length, 5248);
  assert.ok(rows.some(r => r.headword === '善意で' && r.en === 'in good faith' && r.note.includes('without knowledge')));
});
test('Every short passes the schema and matches the official dictionary verbatim', () => {
  assert.ok(ids.length >= 3);
  for (const id of ids) assert.doesNotThrow(() => loadShort(id), id);
});
test('An invented translation is rejected even when it sounds plausible', () => {
  const s = shortSchema.parse(JSON.parse(fs.readFileSync(shortPath('shain-member'), 'utf8')));
  assert.throws(() => verifyAgainstDictionary({...s, refs: [{headword: '社員', en: 'employee', via: 'candidate'}]}, rows), /not a listed translation/);
  assert.throws(() => shortSchema.parse({...s, beats: s.beats.map((b, i) => i === 1 ? {...b, lines: [{lang: 'en', text: 'staff member'}]} : b)}), /not from the dictionary/);
});
test('Japanese voice lines never contain Latin text (VOICEVOX would spell it out)', () => {
  const s = JSON.parse(fs.readFileSync(shortPath('zeni-good-faith'), 'utf8'));
  s.beats[1].lines[1] = {lang: 'ja', text: '標準対訳は in good faith です。'};
  assert.throws(() => shortSchema.parse(s), /cannot read Latin/);
});
test('Speech never eats the thinking pause, and scripts land in the 40-100s target', () => {
  for (const id of ids.filter(i => !loadShort(i).published)) {
    const s = loadShort(id);
    const long = s.beats.map(b => b.lines.map(l => ({seconds: 4.2, lang: l.lang, text: l.text})));
    for (const seg of buildShortTimeline(s, long)) if (seg.pause) assert.ok(seg.frames - seg.speechFrames >= seg.pause * 30, `${id}/${seg.kind}`);
    const secs = totalFrames(buildShortTimeline(s)) / 30;
    assert.ok(secs >= 40 && secs < 100, `${id}: ${secs.toFixed(1)}s outside the 40-100s target`);
  }
});
test('Short ids are unique across queue and published', () => {
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.doesNotThrow(() => shortPath(id));
});
test('No two scripts teach the same term', () => {
  const terms = ids.map(id => loadShort(id).term);
  assert.equal(new Set(terms).size, terms.length);
});
test('Every short ends with a closing scene that holds before the fade (no abrupt cut)', () => {
  for (const id of ids) {
    const s = loadShort(id);
    const full = {...s, beats: [...s.beats, endingBeat(s, {term: '時効'})]};
    const last = buildShortTimeline(full).at(-1)!;
    assert.equal(last.kind, 'ending');
    assert.ok(last.frames - last.speechFrames >= 90, `${id}: ending must hold >=3s after the closing line`);
    assert.ok(!/[A-Za-z]/.test(last.lines[0].say ?? last.lines[0].text));
  }
  assert.throws(() => shortSchema.parse({...loadShort(ids[0]), beats: [...loadShort(ids[0]).beats, {kind: 'ending', lines: [{lang: 'ja', text: 'x'}]}]}), /ending/);
});
test('Scripts teach more than one point: at least two recall questions and a related-terms beat', () => {
  for (const id of ids.filter(i => !loadShort(i).published)) {
    const s = loadShort(id);
    assert.ok(s.beats.filter(b => b.kind === 'recall').length >= 2, `${id}: needs 2 recall questions`);
    assert.ok(s.beats.some(b => b.kind === 'related'), `${id}: needs a related-terms beat`);
  }
});
