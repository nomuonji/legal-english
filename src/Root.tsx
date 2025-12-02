import "./index.css";
import { Composition } from "remotion";
import { LawEnglishVideo, lawEnglishSchema } from "./LawEnglish";
import { z } from "zod";
import data from "./data/law-english-data.json";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LawEnglish"
        component={LawEnglishVideo}
        durationInFrames={930}
        fps={30}
        width={1080}
        height={1920}
        schema={lawEnglishSchema}
        defaultProps={data as z.infer<typeof lawEnglishSchema>}
      />
    </>
  );
};
