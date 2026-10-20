import { z } from 'zod';

// Legal English Shorts. Every English legal term on screen or in the voice must come from
// the Ministry of Justice "Standard Legal Terms Dictionary" (法令用語日英標準対訳辞書) snapshot.
const text = z.string().min(1);
const line = z.object({
  lang: z.enum(['ja', 'en']),
  text,
  // Spoken form when it differs from the caption (kana for readings VOICEVOX gets wrong).
  say: text.optional(),
});
const term = z.object({ text: text.max(32), tag: text.max(10).optional() });
const beat = z.object({
  kind: z.enum(['hook', 'reveal', 'twist', 'example', 'recall', 'answer', 'outro']),
  label: text.max(14).optional(),
  big: text.max(16).optional(),
  en: z.array(term).max(3).optional(),
  body: text.max(64).optional(),
  lines: z.array(line).min(1),
  // Silent thinking time after the voice. Required for hook and recall.
  pause: z.number().min(0).max(4).optional(),
});
export const refSchema = z.object({
  headword: text,
  en: text,
  // 'candidate' = 訳語候補 column; 'note' = phrase quoted inside the row's 注釈.
  via: z.enum(['candidate', 'note']).default('candidate'),
});
export const shortSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: text.max(70),
  term: text.max(16),
  dictVersion: z.literal('19.0'),
  refs: z.array(refSchema).min(1),
  example: z.object({ headword: text, ja: text, en: text, source: text, highlight: text }).optional(),
  beats: z.array(beat).min(4).max(9),
  // Optional; defaults to the channel's licensed track. Only files listed in public/bgm/credits.json are allowed.
  bgm: z.string().regex(/^[a-z0-9-]+\.mp3$/).optional(),
  // Queue ordering (oldest first). Required for files in shorts/queue/.
  published: z.object({ videoId: z.string(), at: z.string() }).optional(),
  queuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/).optional(),
}).superRefine((s, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const allowed = new Set([...s.refs.map(r => r.en)]);
  if (s.example && !s.example.en.includes(s.example.highlight)) issue('example.highlight must occur in example.en');
  if (s.beats[0].kind !== 'hook' || !(s.beats[0].pause && s.beats[0].pause >= 2)) issue('First beat must be a hook with >=2s silent thinking time');
  if (s.beats.at(-1)!.kind !== 'outro') issue('Last beat must be the outro (loops back to the hook)');
  s.beats.forEach((b, i) => {
    if (b.kind === 'recall' && !(b.pause && b.pause >= 2)) issue(`beat ${i}: recall needs >=2s pause`);
    if (b.kind === 'recall' && s.beats[i + 1]?.kind !== 'answer') issue(`beat ${i}: recall must be followed by its answer`);
    if (b.kind === 'example' && !s.example) issue(`beat ${i}: example beat without example`);
    for (const t of b.en ?? []) if (!allowed.has(t.text)) issue(`beat ${i}: "${t.text}" is not a dictionary reference`);
    for (const l of b.lines) if (l.lang === 'en' && !allowed.has(l.text) && l.text !== s.example?.en) issue(`beat ${i}: spoken English "${l.text}" is not from the dictionary`);
    for (const l of b.lines) if (l.lang === 'ja' && /[A-Za-z]{2,}/.test(l.say ?? l.text)) issue(`beat ${i}: Japanese voice cannot read Latin text "${l.text}"; use an en line or katakana say`);
  });
  if (!s.beats.some(b => b.kind === 'recall')) issue('Needs at least one recall question');
});
export type Short = z.infer<typeof shortSchema>;
export type ShortBeat = Short['beats'][number];
export type Clip = { file?: string; seconds: number; lang: 'ja' | 'en'; text: string };
export type ShortSegment = ShortBeat & { from: number; frames: number; speechFrames: number; clips: (Clip & { from: number })[] };
export type ShortProps = { short: Short; segments: ShortSegment[]; voiced: boolean; bgm?: string };

const GAP = 0.18;
// Silent previews estimate speech time; published renders always use measured clips.
export const estimate = (l: { lang: 'ja' | 'en'; text: string }) => Math.max(0.6, l.lang === 'ja' ? l.text.length / 7.5 : l.text.split(/\s+/).length / 2.6);

export function buildShortTimeline(s: Short, audio: Clip[][] = [], fps = 30): ShortSegment[] {
  if (audio.length && audio.length !== s.beats.length) throw new Error('Audio/beat count mismatch');
  let from = 0;
  return s.beats.map((b, i) => {
    if (audio[i] && audio[i].length !== b.lines.length) throw new Error(`Beat ${i}: audio/line count mismatch`);
    let at = 0.15;
    const clips = b.lines.map((l, j) => {
      const seconds = audio[i]?.[j]?.seconds ?? estimate(l);
      const clip = { file: audio[i]?.[j]?.file, seconds, lang: l.lang, text: l.text, from: Math.round(at * fps) };
      at += seconds + GAP;
      return clip;
    });
    const speechFrames = Math.ceil(at * fps);
    const frames = Math.ceil(Math.max(2.2, at + (b.pause ?? 0) + 0.35) * fps);
    const seg = { ...b, from, frames, speechFrames, clips };
    from += frames;
    return seg;
  });
}
export const totalFrames = (segments: { frames: number }[]) => segments.reduce((n, s) => n + s.frames, 0);

// Dictionary snapshot rows (CSV columns of 法令用語日英標準対訳辞書 v19.0).
export type DictRow = { headword: string; en: string; usage: string; exJa: string; exEn: string; exSource: string; note: string };
export function parseCsv(textIn: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  const t = textIn.replace(/^\uFEFF/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
export const toDictRows = (csv: string): DictRow[] => parseCsv(csv).slice(1).filter(r => r.length >= 9).map(r => ({ headword: r[0], en: r[3], usage: r[4], exJa: r[5], exEn: r[6], exSource: r[7], note: `${r[8]} ${r[9] ?? ''}` }));

// Throws unless every reference and the example are found verbatim in the official dictionary.
export function verifyAgainstDictionary(s: Short, rows: DictRow[]) {
  const problems: string[] = [];
  for (const r of s.refs) {
    const hits = rows.filter(x => x.headword === r.headword);
    if (!hits.length) problems.push(`headword not in dictionary: ${r.headword}`);
    else if (r.via === 'candidate' && !hits.some(x => x.en === r.en)) problems.push(`${r.headword}: "${r.en}" is not a listed translation (${[...new Set(hits.map(x => x.en))].join(' / ')})`);
    else if (r.via === 'note' && !hits.some(x => x.note.includes(r.en))) problems.push(`${r.headword}: "${r.en}" does not appear in its notes`);
  }
  if (s.example) {
    const e = s.example;
    if (!rows.some(x => x.headword === e.headword && x.exJa === e.ja && x.exEn === e.en && x.exSource === e.source)) problems.push(`example for ${e.headword} does not match the dictionary verbatim`);
  }
  if (problems.length) throw new Error(`Dictionary check failed:\n- ${problems.join('\n- ')}`);
}
