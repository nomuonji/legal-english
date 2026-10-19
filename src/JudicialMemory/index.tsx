import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from 'remotion';
import type { VideoProps, Segment, Lesson } from './model';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import './style.css';

const panelColors=['#28c6bd','#f5b85c','#b7a1fa'];
const AnswerMap: React.FC<{lesson:Lesson; selected?:number; detailed?:boolean}>=({lesson,selected,detailed})=> <div className="memory-map">{lesson.cards.map((c,i)=><div key={c.id} className="memory-lane" style={{borderColor:panelColors[i%3],opacity:selected===undefined||i===selected?1:0.32}}>
  <div className="memory-node" style={{color:panelColors[i%3]}}>{c.diagram.before}</div>
  <div className="memory-risk">↓ {c.diagram.risk}</div>
  <div className="memory-protect">{lesson.mapLabel}：{c.diagram.protect}</div>
  <div className="memory-arrow">↓</div>
  <div className="memory-answer">{c.answer}</div>
  {detailed&&<div className="memory-citation">{c.citation}</div>}
</div>)}</div>;

const Scene:React.FC<{props:VideoProps;segment:Segment;index:number}>=({props,segment:s,index})=> {
  const frame=useCurrentFrame();
  const l=props.lesson, c=s.cardIndex===undefined?undefined:l.cards[s.cardIndex];
  const isQuestion=['question','recall-question','trap-question'].includes(s.kind);
  const isRecall=s.kind.startsWith('recall');
  const remaining=Math.max(0, Math.ceil((s.frames-frame-21)/30));
  const pauseStarted=frame>=s.speechFrames;
  const enter=interpolate(frame,[0,10],[14,0],{extrapolateRight:'clamp'});
  const badge=isQuestion?(isRecall?'最後のテスト':'まず、思い出す'):s.kind==='answer'?'理由で区別する':s.kind==='map'?'3つを並べて比較':s.kind==='trap-answer'?'ひっかけをほどく':s.kind==='recall-answer'?'答え合わせ':'司法書士 暗記ラボ';
  return <AbsoluteFill className="memory-scene">
    {s.audio&&<Audio src={staticFile(s.audio)}/>}
    <header><span>{l.subject} <b>／</b> 暗記ラボ</span><span>{String(index+1).padStart(2,'0')} / {props.segments.length}</span></header>
    <main style={{transform:`translateY(${enter}px)`}}>
      <div className="memory-badge">{badge}</div>
      {s.kind==='hook'&&<><h1>{l.promise}</h1><div className="memory-cover">{l.cards.map(c=><span key={c.id}>{c.cue}</span>)}</div><p className="memory-sub">思い出す → 理由をつかむ → もう一度答える</p><p className="memory-small">{l.conditions}</p></>}
      {isQuestion&&<><h1 className="memory-question">{s.kind==='trap-question'?l.trap.question:isRecall?c?.recall.question:c?.question}</h1><div className="memory-retrieval"><span>{pauseStarted?'声に出して、答える':'問題を聞く'}</span><strong>{pauseStarted?remaining:'？'}</strong></div><p className="memory-sub">答えは、次の画面で。</p></>}
      {s.kind==='answer'&&c&&<><h1>{c.answer}</h1><AnswerMap lesson={l} selected={s.cardIndex}/><p className="memory-reason">{c.reason}</p><div className="memory-trap">混同注意 <b>{c.distinction}</b></div></>}
      {s.kind==='map'&&<><h1>{l.cue}</h1><AnswerMap lesson={l} detailed/><p className="memory-small">{l.conditions}</p><p className="memory-sub">次は、言い方を変えて出題します。</p></>}
      {s.kind==='trap-answer'&&<><h1>{l.trap.answer}</h1><p className="memory-reason large">{l.trap.explanation}</p><AnswerMap lesson={l}/></>}
      {s.kind==='recall-answer'&&c&&<><h1>{c.recall.answer}</h1><p className="memory-reason large">{c.reason}</p><div className="memory-rule">{c.citation}</div><p className="memory-sub">自分の答えと、理由まで照合する。</p></>}
      {s.kind==='review'&&<><h1>何も見ずに、言える？</h1><div className="memory-cover">{l.cards.map(c=><span key={c.id}>{c.cue} → ？</span>)}</div><p className="memory-sub">言えなかった問題だけ、もう一度。</p><div className="memory-days"><span>明日</span><span>3日後</span><span>7日後</span></div><p className="memory-small">次の復習の目安。すぐ言えたら間隔をあける。根拠は概要欄。</p></>}
    </main>
    <footer><span>{c?.citation??'Learning OS 学習用Markdownから'}</span><span>法令確認 {l.asOf} {props.voiced?'':'／ 無音プレビュー'}</span></footer>
    <div className="memory-progress" style={{width:`${(s.from+frame)/props.segments.reduce((n,x)=>n+x.frames,0)*100}%`}}/>
  </AbsoluteFill>;
};

export const JudicialMemory:React.FC<VideoProps>=(props)=><AbsoluteFill>{props.segments.map((s,i)=><Sequence key={`${i}-${s.kind}`} from={s.from} durationInFrames={s.frames}><Scene props={props} segment={s} index={i}/></Sequence>)}</AbsoluteFill>;
