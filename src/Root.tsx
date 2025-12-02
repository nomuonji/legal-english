import "./index.css";
import { Composition } from "remotion";
import { LawEnglishVideo, lawEnglishSchema } from "./LawEnglish";
import { z } from "zod";
import data from "./data/law-english-data.json";

let audioMetadata: any = null;
try {
  // @ts-ignore
  audioMetadata = require("./data/audio-metadata.json");
} catch (e) {
  console.log("No audio metadata found");
}

export const RemotionRoot: React.FC = () => {
  const fps = 30;
  const BUFFER = 30;

  let audioDurations = undefined;
  let totalDuration = 930;

  // Check if valid metadata exists (at least one duration > 0)
  const hasValidAudio = audioMetadata && Object.values(audioMetadata).some((v: any) => typeof v === 'number' && v > 0);

  if (hasValidAudio) {
    const titleDuration = Math.ceil(audioMetadata.title * fps) + BUFFER;
    const wordDuration = Math.ceil((audioMetadata.word_en + audioMetadata.word_jp + audioMetadata.definition_en + audioMetadata.definition_jp) * fps) + BUFFER * 4;
    const contextDuration = Math.ceil((audioMetadata.context_en + audioMetadata.context_jp) * fps) + BUFFER * 2;
    const exampleDuration = Math.ceil((audioMetadata.example_en + audioMetadata.example_jp) * fps) + BUFFER * 2;

    let vocabDuration = 0;
    const vocabDurations: number[] = [];
    for (let i = 0; i < data.vocabularyList.length; i++) {
      const dur = audioMetadata[`vocab_${i}`] || 1.5;
      vocabDurations.push(dur);
      vocabDuration += Math.ceil(dur * fps) + 15;
    }
    vocabDuration += BUFFER;

    totalDuration = titleDuration + wordDuration + contextDuration + exampleDuration + vocabDuration;

    audioDurations = {
      title: audioMetadata.title,
      word_en: audioMetadata.word_en,
      word_jp: audioMetadata.word_jp,
      definition_en: audioMetadata.definition_en,
      definition_jp: audioMetadata.definition_jp,
      context_en: audioMetadata.context_en,
      context_jp: audioMetadata.context_jp,
      example_en: audioMetadata.example_en,
      example_jp: audioMetadata.example_jp,
      vocab: vocabDurations,
    };
  }

  return (
    <>
      <Composition
        id="LawEnglish"
        component={LawEnglishVideo}
        durationInFrames={totalDuration}
        fps={30}
        width={1080}
        height={1920}
        schema={lawEnglishSchema}
        defaultProps={{
          ...data,
          audioDurations: audioDurations
        } as z.infer<typeof lawEnglishSchema>}
      />
    </>
  );
};
