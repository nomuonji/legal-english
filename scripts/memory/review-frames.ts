import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import type {VideoProps} from '../../src/JudicialMemory/model';
const id=process.argv[2];
if(!id||!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid lesson id');
const dir=`out/${id}`;
const props:VideoProps=JSON.parse(fs.readFileSync(`${dir}/props.json`,'utf8'));
fs.mkdirSync(`${dir}/frames`,{recursive:true});
for(const [i,s] of props.segments.entries()) {
  const frame=s.from+Math.min(30,s.frames-1);
  execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(frame/30),'-i',`${dir}/video.mp4`,'-frames:v','1',`${dir}/frames/${String(i).padStart(2,'0')}.png`]);
}
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-pattern_type','glob','-i',`${dir}/frames/*.png`,'-vf','scale=640:360,tile=3x6','-frames:v','1',`${dir}/contact-sheet.jpg`]);
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',`${dir}/video.mp4`,'-vf','scale=426:240','-t','12','-an',`${dir}/first-frame-phone.mp4`]);
console.log('Review images saved. Automated checks do not imply memory benefit or editorial approval.');
