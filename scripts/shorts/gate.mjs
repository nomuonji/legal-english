// Automatic pre-upload gate: the file must be a real voiced vertical short of sane length and loudness.
import fs from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';
const id = process.argv[2];
if (!/^[a-z0-9-]+$/.test(id || '')) throw Error('Invalid id');
const dir = `out/shorts/${id}`;
const meta = JSON.parse(fs.readFileSync(`${dir}/metadata.json`, 'utf8'));
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', `${dir}/video.mp4`], {encoding: 'utf8'}));
const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
const seconds = Number(probe.format.duration);
const problems = [];
if (!meta.voiced) problems.push('not voiced');
if (!video || video.width !== 1080 || video.height !== 1920) problems.push('not 1080x1920');
if (!audio) problems.push('no audio stream');
if (!(seconds > 10 && seconds <= 120)) problems.push(`duration ${seconds.toFixed(1)}s outside 10-120s`);
// Silent or clipped audio means voice synthesis or mixing failed.
const vd = spawnSync('ffmpeg', ['-hide_banner', '-i', `${dir}/video.mp4`, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(vd)?.[1]);
const max = Number(/max_volume: (-?[\d.]+) dB/.exec(vd)?.[1]);
if (!(mean > -40)) problems.push(`audio too quiet (mean ${mean} dB)`);
if (max >= 0) problems.push(`audio clipping (max ${max} dB)`);
fs.writeFileSync(`${dir}/gate.json`, JSON.stringify({id, seconds, width: video?.width, height: video?.height, meanVolumeDb: mean, maxVolumeDb: max, passed: !problems.length, problems}, null, 2));
if (problems.length) { console.error(`Gate failed for ${id}: ${problems.join('; ')}`); process.exit(1); }
console.log(`Gate passed for ${id}: ${seconds.toFixed(1)}s, mean ${mean} dB, max ${max} dB`);
