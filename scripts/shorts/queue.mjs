// Queue helper for the scheduled publisher.
//   node scripts/shorts/queue.mjs next       -> prints the oldest queued id (empty if none)
//   node scripts/shorts/queue.mjs count      -> number of queued scripts
//   node scripts/shorts/queue.mjs complete <id> <videoId> -> move queue/<id>.json to published/ with the video id
import fs from 'node:fs';
const Q='shorts/queue', P='shorts/published';
const queued=()=>fs.readdirSync(Q).filter(f=>f.endsWith('.json')).map(f=>{
  const s=JSON.parse(fs.readFileSync(`${Q}/${f}`,'utf8'));
  return {id:f.replace(/\.json$/,''),queuedAt:s.queuedAt??'9999'};
}).sort((a,b)=>a.queuedAt.localeCompare(b.queuedAt)||a.id.localeCompare(b.id));
const [cmd,id,videoId]=process.argv.slice(2);
if(cmd==='next') process.stdout.write(queued()[0]?.id??'');
else if(cmd==='count') process.stdout.write(String(queued().length));
else if(cmd==='complete') {
  if(!/^[a-z0-9-]+$/.test(id||'')||!/^[\w-]{11}$/.test(videoId||'')) throw Error('Usage: complete <id> <videoId>');
  const s=JSON.parse(fs.readFileSync(`${Q}/${id}.json`,'utf8'));
  fs.mkdirSync(P,{recursive:true});
  fs.writeFileSync(`${P}/${id}.json`,JSON.stringify({...s,published:{videoId,at:new Date().toISOString()}},null,2)+'\n');
  fs.rmSync(`${Q}/${id}.json`);
} else throw Error('Unknown command');
