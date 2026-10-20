import { z } from 'zod';

const text = z.string().min(1);
export const lessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: text.max(70),
  subject: text,
  promise: text.max(65),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: text,
  source: z.object({ repository: z.literal('nomuonji/learning-os'), path: text, blobSha: z.string().length(40), sectionId: text, sectionSha256: z.string().length(64) }),
  legalSources: z.array(z.object({ label: text, url: z.string().url(), checkedAt: text })).min(1),
  cue: text.max(35),
  mapLabel: text.max(8),
  conditions: text.max(100),
  cards: z.array(z.object({
    id: text,
    cue: text.max(18),
    question: text.max(80),
    answer: text.max(32),
    // Direct answer to the question as asked. The right's name alone does not answer "how many / is it needed".
    verdict: text.max(40),
    matrixColumn: z.number().int().min(0).optional(),
    reason: text.max(100),
    distinction: text.max(70),
    citation: text.max(40),
    narration: text,
    diagram: z.object({ before: text.max(20), risk: text.max(25), protect: text.max(25) }),
    recall: z.object({ question: text.max(85), answer: text.max(45), narration: text })
  })).min(2).max(6),
  // Optional comparison table: rows are cards (same order), columns are the conditions that change the answer.
  matrix: z.object({ title: text.max(30), columns: z.array(text.max(16)).min(2).max(4), rows: z.array(z.array(text.max(22))) }).optional(),
  trap: z.object({ question: text.max(80), answer: text.max(70), explanation: text.max(110), narration: text, matrixColumn: z.number().int().min(0).optional() }),
}).superRefine((l,ctx)=> {
  if(!l.matrix) return;
  if(l.matrix.rows.length!==l.cards.length) ctx.addIssue({code:'custom',message:'matrix.rows must have one row per card'});
  l.matrix.rows.forEach((r,i)=>{ if(r.length!==l.matrix!.columns.length) ctx.addIssue({code:'custom',message:`matrix row ${i} column count mismatch`}); });
  if(l.trap.matrixColumn!==undefined&&l.trap.matrixColumn>=l.matrix.columns.length) ctx.addIssue({code:'custom',message:'trap.matrixColumn out of range'});
});
export type Lesson = z.infer<typeof lessonSchema>;

export type Beat = {
  kind: 'hook' | 'question' | 'answer' | 'map' | 'trap-question' | 'trap-answer' | 'recall-question' | 'recall-answer' | 'review';
  cardIndex?: number;
  say: string;
  // Pause follows the spoken question, never runs underneath it.
  pauseSeconds?: number;
  minSeconds: number;
};
export type Segment = Beat & { from: number; frames: number; audio?: string; speechFrames: number };
export type VideoProps = { lesson: Lesson; segments: Segment[]; voiced: boolean };

const NUM=['零','一','二','三','四','五','六'];
// Arrows and slashes are read literally by TTS; turn them into spoken connectors.
export const speakable=(t:string)=>t.replace(/\s*→\s*/g,'、次に、').replace(/／/g,'、');
const sentence=(t:string)=>/[。？！?!]$/.test(t)?t:`${t}。`;

// Both the renderer and the audio builder use this single timeline definition.
export function makeBeats(l: Lesson): Beat[] {
  const beats: Beat[] = [{ kind: 'hook', say: `${sentence(l.promise)}答えを隠して出題します。声に出して答えてください。`, minSeconds: 8 }];
  l.cards.forEach((c, cardIndex) => {
    beats.push({kind:'question', cardIndex, say:c.question, pauseSeconds:5, minSeconds:8});
    beats.push({kind:'answer', cardIndex, say:c.narration, minSeconds:17});
  });
  beats.push({kind:'map', say:`見分ける軸は、${speakable(l.cue)}。${l.cards.map(c=>`${c.cue}なら、${c.answer}`).join('。')}。ここからは、言い方を変えて出題します。`, minSeconds:15});
  beats.push({kind:'trap-question',say:l.trap.question,pauseSeconds:6,minSeconds:10});
  beats.push({kind:'trap-answer',say:l.trap.narration,minSeconds:14});
  // Shuffle deterministically away from presentation order. No random render output.
  [...l.cards.keys()].reverse().forEach(cardIndex=> {
    const c=l.cards[cardIndex];
    beats.push({kind:'recall-question',cardIndex,say:c.recall.question,pauseSeconds:6,minSeconds:9});
    beats.push({kind:'recall-answer',cardIndex,say:c.recall.narration,minSeconds:8});
  });
  beats.push({kind:'review',say:`${speakable(l.cue)}。今、${NUM[l.cards.length]}つを何も見ずに言えますか。言えなかった問題だけ、明日もう一度。三日後、七日後にも試してください。ノートは概要欄です。`,minSeconds:12});
  return beats;
}

export function buildTimeline(l: Lesson, audio: {file: string; seconds: number}[] = [], fps=30): Segment[] {
  const beats=makeBeats(l);
  if(audio.length && audio.length!==beats.length) throw new Error('Audio/beat count mismatch');
  let from=0;
  return beats.map((b,i)=> {
    // Silent previews estimate reading time; public renders require measured audio.
    const speechSeconds=audio[i]?.seconds ?? Math.max(3,b.say.length/5.2);
    const speechFrames=Math.ceil(speechSeconds*fps);
    const frames=Math.ceil(Math.max(b.minSeconds,speechSeconds+(b.pauseSeconds??0)+0.7)*fps);
    const segment={...b,from,frames,speechFrames,audio:audio[i]?.file};
    from+=frames;
    return segment;
  });
}

const chapterName=(l:Lesson,s:Beat)=> s.kind==='hook'?'導入':(s.kind==='question'||s.kind==='answer')&&s.cardIndex!==undefined?`${s.cardIndex+1}. ${l.cards[s.cardIndex].cue}`:s.kind==='map'?'比較表':s.kind.startsWith('trap')?'ひっかけ問題':s.kind.startsWith('recall')?'条件を変えて再テスト':'復習の予定';
// YouTube ignores all chapters if any is shorter than 10s, so group scenes and merge short groups backwards.
export function makeChapters(l:Lesson,segments:Segment[],fps=30):{from:number;title:string}[] {
  const out:{from:number;title:string;end:number}[]=[];
  for(const s of segments) {
    const title=chapterName(l,s);
    const last=out[out.length-1];
    if(last&&last.title===title) last.end=s.from+s.frames; else out.push({from:s.from,title,end:s.from+s.frames});
  }
  for(let i=out.length-1;i>0;i--) if(out[i].end-out[i].from<10*fps){out[i-1].end=out[i].end;out.splice(i,1);}
  if(out.length>1&&out[0].end-out[0].from<10*fps){out[1].from=0;out.shift();}
  return out.map(({from,title})=>({from,title}));
}
// Caption cues split at sentence ends, timed by character share of the measured speech.
export function makeCaptions(segments:Segment[]):{from:number;to:number;text:string}[] {
  return segments.flatMap(s=> {
    const parts=s.say.match(/[^。？！?!]+[。？！?!]?/g)?.map(p=>p.trim()).filter(Boolean)??[s.say];
    const total=parts.reduce((n,p)=>n+p.length,0);
    let at=s.from;
    return parts.map(p=>{const len=Math.max(15,Math.round(s.speechFrames*p.length/total));const cue={from:at,to:Math.min(at+len,s.from+s.speechFrames),text:p};at=cue.to;return cue;});
  });
}
