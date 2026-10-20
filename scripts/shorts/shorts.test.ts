import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shortSchema, buildShortTimeline, toDictRows, verifyAgainstDictionary, totalFrames} from '../../src/LegalShorts/model';
import {loadShort, DICT_PATH} from './prepare';

const rows = toDictRows(fs.readFileSync(DICT_PATH, 'utf8'));
const ids = fs.readdirSync('shorts').filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));

test('Dictionary snapshot parses completely (quoted commas and line breaks)', () => {
  assert.equal(rows.length, 5248);
  assert.ok(rows.some(r => r.headword === '善意で' && r.en === 'in good faith' && r.note.includes('without knowledge')));
});
test('Every short passes the schema and matches the official dictionary verbatim', () => {
  assert.ok(ids.length >= 3);
  for (const id of ids) assert.doesNotThrow(() => loadShort(id), id);
});
test('An invented translation is rejected even when it sounds plausible', () => {
  const s = shortSchema.parse(JSON.parse(fs.readFileSync('shorts/shain-member.json', 'utf8')));
  assert.throws(() => verifyAgainstDictionary({...s, refs: [{headword: '社員', en: 'employee', via: 'candidate'}]}, rows), /not a listed translation/);
  assert.throws(() => shortSchema.parse({...s, beats: s.beats.map((b, i) => i === 1 ? {...b, lines: [{lang: 'en', text: 'staff member'}]} : b)}), /not from the dictionary/);
});
test('Japanese voice lines never contain Latin text (VOICEVOX would spell it out)', () => {
  const s = JSON.parse(fs.readFileSync('shorts/zeni-good-faith.json', 'utf8'));
  s.beats[1].lines[1] = {lang: 'ja', text: '標準対訳は in good faith です。'};
  assert.throws(() => shortSchema.parse(s), /cannot read Latin/);
});
test('Speech never eats the thinking pause, and pilots stay under a minute', () => {
  for (const id of ids) {
    const s = loadShort(id);
    const long = s.beats.map(b => b.lines.map(l => ({seconds: 4.2, lang: l.lang, text: l.text})));
    for (const seg of buildShortTimeline(s, long)) if (seg.pause) assert.ok(seg.frames - seg.speechFrames >= seg.pause * 30, `${id}/${seg.kind}`);
    assert.ok(totalFrames(buildShortTimeline(s)) / 30 < 60, `${id} estimate too long`);
  }
});
