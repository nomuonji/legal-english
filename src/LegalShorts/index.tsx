import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame, interpolate, delayRender, continueRender, cancelRender} from 'remotion';
import type {ShortProps, ShortSegment, Short} from './model';
import {totalFrames} from './model';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';
import './style.css';

const KIND_LABEL: Record<ShortSegment['kind'], string> = {hook: 'クイズ', reveal: '答え', twist: 'ここが落とし穴', example: '条文の英訳', recall: 'もう1問', answer: '答え', outro: 'まとめ'};

// Highlights the target phrase inside the official example sentence.
const Highlighted: React.FC<{text: string; mark: string}> = ({text, mark}) => {
  const i = text.indexOf(mark);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{mark}</mark>{text.slice(i + mark.length)}</>;
};

// Content width is ~858px: size the headline so short phrases never orphan one character.
const bigSize = (t: string) => t.length <= 5 ? 138 : t.length <= 7 ? 112 : t.length <= 9 ? 92 : 80;

// The channel's teacher character narrates every line: mouth flaps only while a voice clip plays.
const Teacher: React.FC<{s: ShortSegment}> = ({s}) => {
  const frame = useCurrentFrame();
  const talking = s.clips.some(c => frame >= c.from && frame < c.from + Math.ceil(c.seconds * 30));
  const open = talking && Math.floor(frame / 4) % 2 === 0;
  const bob = Math.sin(frame / 18) * 4;
  return <Img className="ls-teacher" style={{transform: `translateY(${bob}px)`}} src={staticFile(open ? 'images/mouth-open.png' : 'images/mouth-closed.png')}/>;
};
// Subtitle bubble beside the character's chalk hand, for viewers watching with sound off.
const Bubble: React.FC<{s: ShortSegment}> = ({s}) => {
  const frame = useCurrentFrame();
  const current = [...s.clips].reverse().find(c => frame >= c.from);
  if (!current) return null;
  const thinking = s.pause !== undefined && s.pause > 0 && frame >= s.speechFrames;
  return <div className={`ls-bubble ${current.lang}`}>{thinking ? '…考え中' : current.lang === 'en' && current.text.length > 40 ? '英文を読み上げ中（上の条文）' : current.text}</div>;
};

const Scene: React.FC<{props: ShortProps; s: ShortSegment}> = ({props, s}) => {
  const frame = useCurrentFrame();
  const short: Short = props.short;
  const thinking = s.pause !== undefined && s.pause > 0 && frame >= s.speechFrames;
  const remaining = Math.max(1, Math.ceil((s.frames - frame - 10) / 30));
  const pop = interpolate(frame, [0, 8], [0.94, 1], {extrapolateRight: 'clamp'});
  const fade = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  // English terms appear in sync with the English voice clip that names them.
  const enShownAt = (t: string) => {
    const c = s.clips.find(c => c.lang === 'en' && c.text === t);
    return c ? c.from : 0;
  };
  const progress = (s.from + frame) / totalFrames(props.segments);
  return <AbsoluteFill className="ls-scene">
    {s.clips.map((c, i) => c.file && <Sequence key={i} from={c.from}><Audio src={staticFile(c.file)}/></Sequence>)}
    <div className="ls-top"><span className="ls-brand">法律英語</span><span className="ls-term">{short.term}</span></div>
    <div className="ls-progress"><div style={{width: `${progress * 100}%`}}/></div>
    <main style={{opacity: fade, transform: `scale(${pop})`}}>
      <div className={`ls-kind ls-${s.kind}`}>{s.label ?? KIND_LABEL[s.kind]}</div>
      {s.big && <h1 style={{fontSize: bigSize(s.big)}}>{s.big}</h1>}
      {s.kind === 'example' && short.example && <div className="ls-example">
        <p className="en"><Highlighted text={short.example.en} mark={short.example.highlight}/></p>
        <p className="ja">{short.example.ja}</p>
        <p className="src">{short.example.source}（日本法令外国語訳DB）</p>
      </div>}
      {s.en && <div className={`ls-en ${s.en.length > 2 ? 'compact' : ''}`}>{s.en.map(t => {
        const at = enShownAt(t.text);
        const o = interpolate(frame, [at, at + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return <div key={t.text} className="ls-en-item" style={{opacity: o}}>
          {t.tag && <span className="tag">{t.tag}</span>}<span className="word">{t.text}</span>
        </div>;
      })}</div>}
      {s.body && <p className="ls-body">{s.body}</p>}
      {s.pause !== undefined && s.pause > 0 && <div className={`ls-think ${thinking ? 'on' : ''}`}>
        <strong>{thinking ? remaining : '？'}</strong><span>{thinking ? '口に出して答える' : '問題を聞く'}</span>
      </div>}
    </main>
    <Bubble s={s}/>
    <Teacher s={s}/>
    <footer>出典：法令用語日英標準対訳辞書 v{short.dictVersion}（法務省）{props.voiced ? '' : '／無音プレビュー'}</footer>
  </AbsoluteFill>;
};

export const LegalShort: React.FC<ShortProps> = (props) => {
  const [handle] = useState(() => delayRender('Load fonts'));
  const sample = JSON.stringify(props.short);
  useEffect(() => {
    Promise.all(['500', '700', '900'].map(w => document.fonts.load(`${w} 64px "Noto Sans JP"`, sample)))
      .then(() => continueRender(handle)).catch(cancelRender);
  }, [handle, sample]);
  return <AbsoluteFill>{props.segments.map((s, i) => <Sequence key={i} from={s.from} durationInFrames={s.frames}><Scene props={props} s={s}/></Sequence>)}</AbsoluteFill>;
};
