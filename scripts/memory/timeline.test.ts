import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTimeline, makeBeats, lessonSchema, makeChapters, makeCaptions} from '../../src/JudicialMemory/model';
const lesson=lessonSchema.parse(JSON.parse(fs.readFileSync('lessons/shareholder-proposal-numbers.json','utf8')));

test('Long question audio cannot consume the learner’s silent recall interval',()=> {
  const beats=makeBeats(lesson);
  const audio=beats.map((_,i)=>({file:`${i}.wav`,seconds:37.7}));
  const segments=buildTimeline(lesson,audio);
  segments.forEach((s,i)=> {
    if(s.pauseSeconds) assert.ok(s.frames-s.speechFrames>=s.pauseSeconds*30);
    if(i>0) assert.equal(s.from,segments[i-1].from+segments[i-1].frames);
  });
});
test('All three concepts return as independently phrased questions before their answers',()=> {
  const beats=makeBeats(lesson);
  for(const [cardIndex,card] of lesson.cards.entries()) {
    const q=beats.findIndex(s=>s.kind==='recall-question'&&s.cardIndex===cardIndex);
    assert.ok(q>beats.findIndex(s=>s.kind==='map'));
    assert.equal(beats[q+1].kind,'recall-answer');
    assert.notEqual(beats[q].say,card.question);
  }
});
test('Partial audio must fail rather than create a silently truncated published lesson',()=> {
  assert.throws(()=>buildTimeline(lesson,[{file:'one.wav',seconds:1}]),/count mismatch/);
});
test('YouTube chapters start at 0:00 and each lasts at least 10 seconds',()=> {
  for(const seconds of [0.5,4,12]) {
    const segments=buildTimeline(lesson,makeBeats(lesson).map((_,i)=>({file:`${i}.wav`,seconds})));
    const total=segments.reduce((n,s)=>n+s.frames,0);
    const chapters=makeChapters(lesson,segments);
    assert.equal(chapters[0].from,0);
    assert.ok(chapters.length>=3);
    chapters.forEach((c,i)=>assert.ok((chapters[i+1]?.from??total)-c.from>=300,`${c.title} shorter than 10s`));
  }
});
test('Captions are sentence-sized and stay inside the spoken audio',()=> {
  const segments=buildTimeline(lesson);
  const cues=makeCaptions(segments);
  assert.ok(cues.length>segments.length);
  for(const c of cues) {
    assert.ok(c.text.length<=60,`caption too long: ${c.text}`);
    const s=segments.find(s=>c.from>=s.from&&c.from<s.from+s.frames)!;
    assert.ok(c.to<=s.from+s.speechFrames&&c.to>c.from);
  }
});
test('Answer narration opens with the direct answer, not only the name of the right',()=> {
  for(const c of lesson.cards) assert.ok(!c.narration.startsWith(c.answer),`${c.id} opens with the label`);
});
test('Comparison table has one row per card and no blank cells',()=> {
  assert.ok(lesson.matrix);
  assert.equal(lesson.matrix!.rows.length,lesson.cards.length);
  assert.throws(()=>lessonSchema.parse({...lesson,matrix:{...lesson.matrix!,rows:lesson.matrix!.rows.slice(1)}}));
});
