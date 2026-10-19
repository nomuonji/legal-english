// Input: exact GitHub fetch_file export {path, blobSha, content}. Raw notes stay ignored.
import fs from 'node:fs';
import crypto from 'node:crypto';
const files=process.argv.slice(2);
if(!files.length) throw new Error('Usage: tsx scripts/memory/import-catalog.ts .source-cache/<export>.json ...');
const catalog:{repository:string;sections:unknown[]}={repository:'nomuonji/learning-os',sections:[]};
for(const file of files) {
  const note=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!note.path?.startsWith('data/sources/judicial-scrivener/2026-10-10-user-notes/raw/試験勉強/')||!note.path.endsWith('.md')) throw new Error('Not an original judicial study Markdown');
  const blob=crypto.createHash('sha1').update(`blob ${Buffer.byteLength(note.content)}\0`).update(note.content).digest('hex');
  if(blob!==note.blobSha) throw new Error('Git blob hash mismatch');
  const lines:string[]=note.content.split(/\r?\n/);
  let fenced=false;
  const headings:{line:number;level:number;heading:string}[]=[];
  lines.forEach((line,i)=> {
    if(/^\s*```/.test(line)) fenced=!fenced;
    const m=!fenced&&/^(#{1,6})\s+(.+)$/.exec(line);
    if(m) headings.push({line:i,level:m[1].length,heading:m[2]});
    else if(!fenced&&/^【[^】]+】/.test(line)) headings.push({line:i,level:3,heading:line.trim()});
  });
  for(const [i,h] of headings.entries()) {
    const end=headings.slice(i+1).find(x=>x.level<=h.level)?.line??lines.length;
    const body=lines.slice(h.line,end).join('\n').trim();
    const tags=[...new Set(body.match(/#[\p{L}\p{N}_-]+/gu)??[])];
    const id=crypto.createHash('sha256').update(`${note.path}\0${h.heading}`).digest('hex').slice(0,16);
    catalog.sections.push({id,path:note.path,blobSha:blob,heading:h.heading,lineStart:h.line+1,lineEnd:end,sectionSha256:crypto.createHash('sha256').update(body).digest('hex'),tags,priority:tags.includes('#絶対覚えられない')?1:tags.includes('#覚えられない')?2:tags.includes('#まだ覚えてない')?3:4,hasEmbeddedImages:/!\[\[/.test(body)});
  }
}
fs.mkdirSync('sources',{recursive:true});
fs.writeFileSync('sources/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`Indexed ${catalog.sections.length} sections from ${files.length} original study notes (raw text stays private).`);
