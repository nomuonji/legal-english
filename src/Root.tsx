import './index.css';
import { Composition } from 'remotion';
import { JudicialMemory } from './JudicialMemory';
import { buildTimeline, lessonSchema } from './JudicialMemory/model';
import type { VideoProps } from './JudicialMemory/model';
import rawLesson from '../lessons/shareholder-proposal-numbers.json';

const lesson=lessonSchema.parse(rawLesson);
const defaults:VideoProps={lesson,segments:buildTimeline(lesson),voiced:false};
export const RemotionRoot:React.FC=()=> <Composition
  id="JudicialMemory"
  component={JudicialMemory}
  width={1920}
  height={1080}
  fps={30}
  durationInFrames={defaults.segments.reduce((n,s)=>n+s.frames,0)}
  defaultProps={defaults}
  calculateMetadata={({props})=>({durationInFrames:props.segments.reduce((n,s)=>n+s.frames,0)})}
/>;
