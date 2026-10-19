import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import type {VideoProps} from '../../src/JudicialMemory/model';
const id=process.argv[2];
if(!id||!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid lesson id');
const dir=`out/${id}`;
const props:VideoProps=JSON.parse(fs.readFileSync(`${dir}/props.json`,'utf8'));
fs.mkdirSync(`${dir}/layout`,{recursive:true});
const kinds=['hook','question','answer','map','trap-answer','recall-question','recall-answer','review'];
for(const kind of kinds) {
  const s=props.segments.find(s=>s.kind===kind);
  if(!s) continue;
  execFileSync('npx',['remotion','still','src/index.ts','JudicialMemory',`${dir}/layout/${kind}.png`,`--props=${dir}/props.json`,`--frame=${s.from+30}`,'--scale=0.6666666666666666'],{stdio:'inherit'});
}
