import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lessonSchema, makeBeats, buildTimeline, makeChapters, makeCaptions } from '../../src/JudicialMemory/model';

async function main() {
  const id=process.argv[2];
  if(!id||!/^[a-z0-9-]+$/.test(id)) throw new Error('Usage: npm run memory:prepare -- <lesson-id> [--voice]');
  const lesson=lessonSchema.parse(JSON.parse(fs.readFileSync(`lessons/${id}.json`,'utf8')));
  if(lesson.id!==id) throw new Error('Lesson id/file mismatch');
  const catalog=JSON.parse(fs.readFileSync('sources/catalog.json','utf8'));
  const source=catalog.sections.find((s:{id:string})=>s.id===lesson.source.sectionId);
  if(!source||source.path!==lesson.source.path||source.blobSha!==lesson.source.blobSha||source.sectionSha256!==lesson.source.sectionSha256) throw new Error('Lesson does not match original study Markdown provenance');
  const noteLinks=JSON.parse(fs.readFileSync('sources/video-notes.json','utf8'));
  const publicNote=noteLinks[id];
  if(!publicNote || publicNote.publicationStatus!=='published' || !/^https:\/\/shihoshoshi\.antonbase\.com\/notes\/[a-z0-9-]+$/.test(publicNote.url)) throw new Error('Publish and link the matching review note in sources/video-notes.json before preparing a video');
  const voiced=process.argv.includes('--voice');
  const dir=`out/${id}`;
  fs.mkdirSync(dir,{recursive:true});
  const beats=makeBeats(lesson);
  const clips:{file:string;seconds:number}[]=[];
  if(voiced) {
    const base=process.env.VOICEVOX_URL??'http://127.0.0.1:50021';
    const speaker=Number(process.env.VOICEVOX_SPEAKER??13); // 青山龍星 ノーマル
    fs.mkdirSync(`public/memory-audio/${id}`,{recursive:true});
    for(const [i,b] of beats.entries()) {
      const queryResponse=await fetch(`${base}/audio_query?text=${encodeURIComponent(b.say)}&speaker=${speaker}`,{method:'POST'});
      if(!queryResponse.ok) throw new Error(`VOICEVOX audio_query failed (${queryResponse.status})`);
      const query=await queryResponse.json();
      query.speedScale=1.05;
      const response=await fetch(`${base}/synthesis?speaker=${speaker}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});
      if(!response.ok) throw new Error(`VOICEVOX synthesis failed (${response.status})`);
      const file=`memory-audio/${id}/${i}.wav`;
      fs.writeFileSync(`public/${file}`,Buffer.from(await response.arrayBuffer()));
      const seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',`public/${file}`],{encoding:'utf8'}).trim());
      if(!Number.isFinite(seconds)||seconds<=0) throw new Error('Empty voice clip');
      clips.push({file,seconds});
    }
  }
  const segments=buildTimeline(lesson,clips);
  const props={lesson,segments,voiced};
  fs.writeFileSync(`${dir}/props.json`,JSON.stringify(props,null,2));
  const stamp=(frames:number)=>{const seconds=Math.floor(frames/30);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
  const chapters=makeChapters(lesson,segments).map(c=>`${stamp(c.from)} ${c.title}`);
  const description=['📖 この動画の復習ノート（比較表・確認問題）',publicNote.url,'外部リンクが開けない場合は、URLをコピーしてブラウザで開いてください。','',lesson.promise,'', 'Learning OSに保存した学習用Markdownから、事例・図解・想起テストへ。','再生中は答えを見る前に、声に出して答えてください。','復習の目安：明日・3日後・7日後。思い出せない問題は早めに再挑戦。','',`法令確認日：${lesson.asOf}`,`前提：${lesson.conditions}`,`対象範囲：${lesson.scope}`,'',...chapters,'','根拠・確認先',...lesson.legalSources.map(s=>`${s.label}\n${s.url}（確認 ${s.checkedAt}）`),'','音声：VOICEVOX:青山龍星','問題・図解：司法書士 暗記ラボ（独自編集）','#司法書士 #司法書士試験 #暗記'].join('\n');
  fs.writeFileSync(`${dir}/metadata.json`,JSON.stringify({lessonId:id,title:lesson.title,description,publicNoteUrl:publicNote.url,tags:['司法書士','司法書士試験','暗記',lesson.subject],defaultLanguage:'ja',privacyStatus:'private',voiced,sourceHash:source.sectionSha256,lessonHash:crypto.createHash('sha256').update(JSON.stringify(lesson)).digest('hex')},null,2));
  const t=(f:number)=>new Date(Math.round(f/30*1000)).toISOString().slice(11,23).replace('.',',');
  const srt=makeCaptions(segments).map((c,i)=>`${i+1}\n${t(c.from)} --> ${t(c.to)}\n${c.text}\n`).join('\n');
  fs.writeFileSync(`${dir}/narration.srt`,srt);
  fs.writeFileSync(`${dir}/chapters.txt`,chapters.join('\n'));
  fs.writeFileSync(`${dir}/review.json`,JSON.stringify({lessonId:id,voiced,sourceHash:source.sectionSha256,durationSeconds:segments.reduce((n,s)=>n+s.frames,0)/30,questionCount:segments.filter(s=>s.pauseSeconds).length,visualReviewed:false,audioReviewed:false,learningEffectMeasured:false},null,2));
  console.log(`${id}: ${segments.length} scenes, ${Math.round(segments.reduce((n,s)=>n+s.frames,0)/30)}s, ${voiced?'voiced':'silent preview'}`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
