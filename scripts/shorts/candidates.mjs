// Lists dictionary headwords worth a Short and not yet used (queue or published).
// Ranked: has usage criteria or notes (a real nuance to teach) + has an official example + exam-relevant wording.
//   node scripts/shorts/candidates.mjs [limit] [keyword]
import fs from 'node:fs';
const csv=fs.readFileSync('sources/jlt/law-je-dic-19.0.csv','utf8').replace(/^﻿/,'');
const rows=[];let row=[],cell='',q=false;
for(let i=0;i<csv.length;i++){const c=csv[i];if(q){if(c==='"'&&csv[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}
const used=new Set();
for(const d of ['shorts/queue','shorts/published']) if(fs.existsSync(d)) for(const f of fs.readdirSync(d).filter(f=>f.endsWith('.json'))){
  const s=JSON.parse(fs.readFileSync(`${d}/${f}`,'utf8'));used.add(s.term);for(const r of s.refs) used.add(r.headword);
}
const exam=/登記|抵当|根抵当|供託|執行|保全|訴訟|判決|相続|遺言|会社|株|取締役|社員|債権|債務|時効|代理|善意|悪意|取消|無効|解除|撤回|担保|質権|地上権|賃借|占有|所有|共有|仮登記|仮処分|差押/;
const heads=new Map();
for(const r of rows.slice(1)){if(r.length<9)continue;const h=heads.get(r[0])??{headword:r[0],en:new Set(),usage:0,note:0,example:0};h.en.add(r[3]);if(r[4])h.usage++;if((r[8]||'').includes('【注】'))h.note++;if(r[6])h.example++;heads.set(r[0],h);}
const [limit='30',kw]=process.argv.slice(2);
const list=[...heads.values()].filter(h=>!used.has(h.headword)&&(!kw||h.headword.includes(kw)))
  .map(h=>({...h,score:(h.en.size>1?2:0)+(h.usage?2:0)+(h.note?2:0)+(h.example?1:0)+(exam.test(h.headword)?3:0)}))
  .filter(h=>h.score>=4).sort((a,b)=>b.score-a.score||a.headword.localeCompare(b.headword)).slice(0,Number(limit));
for(const h of list) console.log(`${h.score}\t${h.headword}\t${[...h.en].join(' / ')}${h.usage?'\t[使い分け]':''}${h.note?'\t[注]':''}${h.example?'\t[用例]':''}`);
