import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTimeline, makeBeats, lessonSchema} from '../../src/JudicialMemory/model';
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
