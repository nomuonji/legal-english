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
    reason: text.max(100),
    distinction: text.max(70),
    citation: text.max(40),
    narration: text,
    diagram: z.object({ before: text.max(20), risk: text.max(25), protect: text.max(25) }),
    recall: z.object({ question: text.max(85), answer: text.max(45), narration: text })
  })).min(2).max(6),
  trap: z.object({ question: text.max(80), answer: text.max(70), explanation: text.max(110), narration: text }),
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

// Both the renderer and the audio builder use this single timeline definition.
export function makeBeats(l: Lesson): Beat[] {
  const beats: Beat[] = [{ kind: 'hook', say: `${l.promise}。答えを隠して出題します。声に出して答えてください。`, minSeconds: 8 }];
  l.cards.forEach((c, cardIndex) => {
    beats.push({kind:'question', cardIndex, say:c.question, pauseSeconds:5, minSeconds:8});
    beats.push({kind:'answer', cardIndex, say:c.narration, minSeconds:17});
  });
  beats.push({kind:'map', say:`見分ける軸は、${l.cue}。${l.cards.map(c=>`${c.cue}なら、${c.answer}`).join('。')}。ここからは、言い方を変えて出題します。`, minSeconds:15});
  beats.push({kind:'trap-question',say:l.trap.question,pauseSeconds:6,minSeconds:10});
  beats.push({kind:'trap-answer',say:l.trap.narration,minSeconds:14});
  // Shuffle deterministically away from presentation order. No random render output.
  [...l.cards.keys()].reverse().forEach(cardIndex=> {
    const c=l.cards[cardIndex];
    beats.push({kind:'recall-question',cardIndex,say:c.recall.question,pauseSeconds:6,minSeconds:9});
    beats.push({kind:'recall-answer',cardIndex,say:c.recall.narration,minSeconds:8});
  });
  beats.push({kind:'review',say:`${l.cue}。今、三つを何も見ずに言えますか。言えなかった問題だけ、明日もう一度。三日後、七日後にも試してください。ノートは概要欄です。`,minSeconds:12});
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
