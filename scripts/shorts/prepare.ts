import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {shortSchema, buildShortTimeline, toDictRows, verifyAgainstDictionary, totalFrames, endingBeat, recapOf} from '../../src/LegalShorts/model';
import type {Clip} from '../../src/LegalShorts/model';

export const DICT_PATH = 'sources/jlt/law-je-dic-19.0.csv';
// Scripts live in shorts/queue/ until published, then move to shorts/published/.
export const SHORT_DIRS = ['shorts/queue', 'shorts/published'];
export const shortPath = (id: string) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid short id');
  const found = SHORT_DIRS.map(d => `${d}/${id}.json`).filter(p => fs.existsSync(p));
  if (found.length !== 1) throw new Error(found.length ? `Duplicate short id ${id} in queue and published` : `Short ${id} not found`);
  return found[0];
};
export const allShortIds = () => SHORT_DIRS.flatMap(d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')) : []);
export const loadShort = (id: string) => {
  const path = shortPath(id);
  const short = shortSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8')));
  if (path.startsWith('shorts/queue/') && !short.queuedAt) throw new Error(`${id}: queued scripts need queuedAt`);
  if (short.id !== id) throw new Error('Short id/file mismatch');
  verifyAgainstDictionary(short, toDictRows(fs.readFileSync(DICT_PATH, 'utf8')));
  return short;
};
const seconds = (file: string) => {
  const s = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], {encoding: 'utf8'}).trim());
  if (!Number.isFinite(s) || s <= 0) throw new Error(`Empty voice clip ${file}`);
  return s;
};

// VOICEVOX in CI can accept the health check and still reset early requests while the engine warms up.
async function fetchRetry(url: string, init: RequestInit, label: string) {
  let last: unknown;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const r = await fetch(url, init);
      if (r.ok) return r;
      last = new Error(`${label} HTTP ${r.status}`);
      if (r.status < 500) break;
    } catch (e) { last = e; }
    await new Promise(res => setTimeout(res, Math.min(30000, 2000 * attempt)));
  }
  throw new Error(`${label} failed after retries: ${(last as Error)?.message ?? last}`);
}

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('Usage: npm run shorts:prepare -- <short-id> [--voice]');
  const script = loadShort(id);
  // The next script in the queue (oldest queuedAt after this one) becomes the teaser in the ending scene.
  const queued = fs.existsSync('shorts/queue') ? fs.readdirSync('shorts/queue').filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).filter(x => x !== id).map(x => loadShort(x)) : [];
  const order = (a: {queuedAt?: string; id: string}) => `${a.queuedAt ?? ''}|${a.id}`;
  const next = queued.filter(x => order(x) > order(script)).sort((a, b) => order(a).localeCompare(order(b)))[0];
  const short = {...script, beats: [...script.beats, endingBeat(script, next && {term: next.term, reading: next.reading})]};
  const voiced = process.argv.includes('--voice');
  const dir = `out/shorts/${id}`;
  fs.mkdirSync(dir, {recursive: true});
  const audio: Clip[][] = [];
  if (voiced) {
    const base = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
    const speaker = Number(process.env.VOICEVOX_SPEAKER ?? 14); // 冥鳴ひまり ノーマル（キャラクターに合わせた女性声）
    const piperModel = process.env.PIPER_MODEL ?? 'voices/en_US-kristin-medium.onnx'; // public-domain dataset, female
    if (!fs.existsSync(piperModel)) throw new Error(`English voice model missing: ${piperModel}`);
    const outDir = `public/shorts-audio/${id}`;
    fs.mkdirSync(outDir, {recursive: true});
    for (const [i, b] of short.beats.entries()) {
      const clips: Clip[] = [];
      for (const [j, l] of b.lines.entries()) {
        const file = `shorts-audio/${id}/${i}-${j}.wav`;
        const spoken = l.say ?? l.text;
        if (l.lang === 'ja') {
          const q = await fetchRetry(`${base}/audio_query?text=${encodeURIComponent(spoken)}&speaker=${speaker}`, {method: 'POST'}, 'VOICEVOX audio_query');
          const query = await q.json();
          query.speedScale = 1.15;
          query.prePhonemeLength = 0.05;
          query.postPhonemeLength = 0.05;
          const r = await fetchRetry(`${base}/synthesis?speaker=${speaker}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(query)}, 'VOICEVOX synthesis');
          fs.writeFileSync(`public/${file}`, Buffer.from(await r.arrayBuffer()));
        } else {
          // Piper reads stdin; a slightly slower length scale keeps legal terms clear.
          execFileSync('python3', ['-m', 'piper', '-m', piperModel, '--length-scale', '1.08', '--sentence-silence', '0.1', '-f', `public/${file}`], {input: spoken});
        }
        clips.push({file, seconds: seconds(`public/${file}`), lang: l.lang, text: l.text});
      }
      audio.push(clips);
    }
  }
  const segments = buildShortTimeline(short, audio);
  const duration = totalFrames(segments) / 30;
  if (duration > 100) console.warn(`Warning: ${duration.toFixed(1)}s. Target 40-100s; trim beats that repeat a point.`);
  const credits = JSON.parse(fs.readFileSync('public/bgm/credits.json', 'utf8'));
  const bgm = short.bgm ?? 'kyoto.mp3';
  if (!credits[bgm] || !fs.existsSync(`public/bgm/${bgm}`)) throw new Error(`BGM ${bgm} is not in public/bgm/credits.json (licence unverified)`);
  fs.writeFileSync(`${dir}/props.json`, JSON.stringify({short, segments, voiced, bgm, ending: {recap: recapOf(script), nextTerm: next?.term}}, null, 2));
  const terms = [...new Set(short.refs.map(r => `${r.headword}：${r.en}`))];
  const description = [
    short.title.replace(/\s*#\S+/g, ''),
    '',
    '今回の訳語（法令用語日英標準対訳辞書より）',
    ...terms.map(t => `・${t}`),
    ...(short.example ? ['', '条文の英訳例', short.example.en, short.example.ja, `（${short.example.source}）`] : []),
    '',
    '出典：日本法令外国語訳データベースシステム「法令用語日英標準対訳辞書」第19.0版（法務省）https://www.japaneselawtranslation.go.jp/',
    '翻訳は参考資料であり、法的効力を有するのは日本語の法令です。日本語の説明は当チャンネルの独自編集。',
    '音声：VOICEVOX:冥鳴ひまり／英語音声 Piper kristin（パブリックドメイン音源）',
    credits[bgm].credit,
    '',
    '#法律英語 #司法書士 #Shorts',
  ].join('\n');
  // Hash the script as stored (before schema defaults) so the uploader can recompute it from shorts/<id>.json.
  const hash = crypto.createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(shortPath(id), 'utf8')))).digest('hex');
  fs.writeFileSync(`${dir}/metadata.json`, JSON.stringify({shortId: id, title: short.title, description, tags: ['法律英語', '司法書士', '法令英訳', short.term], defaultLanguage: 'ja', privacyStatus: 'private', voiced, shortHash: hash, durationSeconds: duration}, null, 2));
  const t = (f: number) => new Date(Math.round(f / 30 * 1000)).toISOString().slice(11, 23).replace('.', ',');
  const srt = segments.flatMap(s => s.clips.map(c => ({from: s.from + c.from, to: s.from + c.from + Math.ceil(c.seconds * 30), text: c.text}))).map((c, i) => `${i + 1}\n${t(c.from)} --> ${t(c.to)}\n${c.text}\n`).join('\n');
  fs.writeFileSync(`${dir}/captions.srt`, srt);
  fs.writeFileSync(`${dir}/review.json`, JSON.stringify({shortId: id, voiced, durationSeconds: duration, dictionaryVerified: true, visualReviewed: false, audioReviewed: false, viewerResponseMeasured: false}, null, 2));
  console.log(`${id}: ${segments.length} beats, ${duration.toFixed(1)}s, ${voiced ? 'voiced' : 'silent preview'}`);
}
if (process.argv[1]?.endsWith('prepare.ts')) main().catch(e => { console.error(e.message); process.exitCode = 1; });
