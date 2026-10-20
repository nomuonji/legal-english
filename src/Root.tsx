import './index.css';
import { Composition } from 'remotion';
import { JudicialMemory } from './JudicialMemory';
import { buildTimeline, lessonSchema } from './JudicialMemory/model';
import type { VideoProps } from './JudicialMemory/model';
import rawLesson from '../lessons/shareholder-proposal-numbers.json';
import { LegalShort } from './LegalShorts';
import { buildShortTimeline, shortSchema, totalFrames } from './LegalShorts/model';
import type { ShortProps } from './LegalShorts/model';
import rawShort from '../shorts/queue/zeni-good-faith.json';

const lesson=lessonSchema.parse(rawLesson);
const defaults:VideoProps={lesson,segments:buildTimeline(lesson),voiced:false};
const short=shortSchema.parse(rawShort);
const shortDefaults:ShortProps={short,segments:buildShortTimeline(short),voiced:false};
export const RemotionRoot:React.FC=()=> <><Composition
  id="JudicialMemory"
  component={JudicialMemory}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={defaults.segments.reduce((n,s)=>n+s.frames,0)}
  defaultProps={defaults}
  calculateMetadata={({props})=>({durationInFrames:props.segments.reduce((n,s)=>n+s.frames,0)})}
/>
<Composition
  id="LegalShort"
  component={LegalShort}
  width={1080}
  height={1920}
  fps={30}
  durationInFrames={totalFrames(shortDefaults.segments)}
  defaultProps={shortDefaults}
  calculateMetadata={({props})=>({durationInFrames:totalFrames(props.segments)})}
/></>;
