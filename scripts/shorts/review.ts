import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import type {ShortProps} from '../../src/LegalShorts/model';
// Stills of every beat (after its English term appears) + a phone-size contact sheet.
const id = process.argv[2];
if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid short id');
const dir = `out/shorts/${id}`;
const props: ShortProps = JSON.parse(fs.readFileSync(`${dir}/props.json`, 'utf8'));
const fromVideo = fs.existsSync(`${dir}/video.mp4`);
fs.mkdirSync(`${dir}/frames`, {recursive: true});
for (const [i, s] of props.segments.entries()) {
  const frame = s.from + Math.min(s.frames - 2, Math.max(s.speechFrames - 6, 20));
  const out = `${dir}/frames/${String(i).padStart(2, '0')}.png`;
  if (fromVideo) execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(frame / 30), '-i', `${dir}/video.mp4`, '-frames:v', '1', out]);
  else execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'LegalShort', out, `--props=${dir}/props.json`, `--frame=${frame}`, '--scale=0.5'], {stdio: 'ignore'});
}
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-pattern_type', 'glob', '-i', `${dir}/frames/*.png`, '-vf', `scale=360:640,tile=${props.segments.length}x1`, '-frames:v', '1', `${dir}/contact-sheet.jpg`]);
console.log(`Review frames saved in ${dir}. Visual checks do not imply audio or viewer approval.`);
