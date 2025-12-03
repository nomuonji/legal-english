import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, Audio, staticFile, Img } from "remotion";
import { z } from "zod";
import "./style.css";

export const lawEnglishSchema = z.object({
    category: z.string(),
    titleText: z.string(),
    word: z.string(),
    definition: z.string(),
    japaneseDefinition: z.string(),
    japaneseWordTranslation: z.string(),
    legalContext: z.string(),
    japaneseLegalContext: z.string(),
    exampleSentence: z.string(),
    exampleTranslation: z.string(),
    vocabularyList: z.array(z.object({
        word: z.string(),
        translation: z.string(),
    })),
    audioDurations: z.object({
        title: z.number(),
        word_en: z.number(),
        word_jp: z.number(),
        definition_en: z.number(),
        definition_jp: z.number(),
        context_en: z.number(),
        context_jp: z.number(),
        example_en: z.number(),
        example_jp: z.number(),
        vocab: z.array(z.number()),
    }).optional(),
});

const Background: React.FC = () => {
    return <div className="bg-overlay" />;
};

const Character: React.FC<{ audioIntervals: { start: number; end: number }[]; visibleFrom: number }> = ({ audioIntervals, visibleFrom }) => {
    const frame = useCurrentFrame();

    if (frame < visibleFrom) {
        return null;
    }

    // Check if current frame is within any talking interval
    const isTalking = audioIntervals.some(interval => frame >= interval.start && frame < interval.end);

    // Toggle mouth every 4 frames (approx 7.5 times per second at 30fps) for "paku paku" effect
    const mouthOpen = isTalking && (Math.floor(frame / 4) % 2 === 0);

    const imageSrc = mouthOpen ? staticFile("images/mouth-open.png") : staticFile("images/mouth-closed.png");

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '540px',
            zIndex: 100,
            pointerEvents: 'none', // Ensure it doesn't block interactions if any
        }}>
            <Img src={imageSrc} style={{ width: '100%', display: 'block' }} />
        </div>
    );
};

const TitleScene: React.FC<{ title: string; category: string; word: string; durationInFrames: number; hasAudio: boolean }> = ({ title, category, word, durationInFrames, hasAudio }) => {
    const frame = useCurrentFrame();

    // Itatsuki: Start visible, fade out at the end
    const opacity = interpolate(
        frame,
        [durationInFrames - 20, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp" }
    );

    return (
        <AbsoluteFill className="container">
            {hasAudio && <Audio src={staticFile("audio/title.mp3")} />}
            <Background />
            <div className="content-wrapper">
                <div className="title-panel" style={{
                    position: 'absolute',
                    top: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    opacity,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: '20px 100px',
                    borderRadius: '50px',
                    border: '1px solid var(--accent-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                    width: 'auto',
                    minWidth: '80%',
                    maxWidth: '95%',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.6)'
                }}>
                    <h1 className="title" style={{ fontSize: '45px', margin: 0, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                        {title}
                    </h1>
                </div>

                <div className="title-frame" style={{ opacity, padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="category-badge" style={{
                        fontSize: '50px',
                        padding: '15px 50px',
                        boxShadow: '0 0 20px var(--primary-color)',
                        border: '3px solid #fff',
                        marginBottom: '40px'
                    }}>{category}</div>

                    <div className="target-word" style={{
                        fontSize: '140px',
                        marginTop: '10px',
                        color: '#fff',
                        fontWeight: '800',
                        textShadow: '0 0 40px var(--accent-color), 5px 5px 0px #000',
                        lineHeight: '1.1',
                        borderBottom: '8px solid var(--accent-color)',
                        display: 'inline-block',
                        paddingBottom: '15px'
                    }}>
                        {word}
                    </div>
                    <div className="subtitle" style={{ marginTop: '50px', fontSize: '30px', color: '#ccc' }}>Essential Legal Terminology</div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const VocabularyListScene: React.FC<{ vocabularyList: { word: string; translation: string }[]; durationInFrames: number; audioDurations?: number[] }> = ({ vocabularyList, durationInFrames, audioDurations }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Background />
            <div className="content-wrapper">
                <div className="vocab-list-container">
                    <div className="vocab-title">Vocabulary Review</div>
                    <div className="vocab-grid">
                        {vocabularyList.map((item, index) => {
                            // Calculate start time for each word audio
                            let audioStartFrame = 0;
                            if (audioDurations) {
                                for (let i = 0; i < index; i++) {
                                    audioStartFrame += Math.ceil(audioDurations[i] * fps) + 15;
                                }
                            } else {
                                audioStartFrame = index * 30; // Fallback
                            }

                            const delay = index * 5; // Visual delay
                            const opacity = spring({
                                frame: frame - delay,
                                fps,
                                config: { damping: 200 },
                            });
                            const translateX = interpolate(opacity, [0, 1], [-20, 0]);

                            return (
                                <div key={index} className="vocab-item" style={{ opacity, transform: `translateX(${translateX}px)` }}>
                                    <Sequence from={delay}>
                                        <Audio src={staticFile("se/graph.mp3")} volume={0.5} />
                                    </Sequence>
                                    {audioDurations && (
                                        <Sequence from={audioStartFrame}>
                                            <Audio src={staticFile(`audio/vocab_${index}.mp3`)} />
                                        </Sequence>
                                    )}
                                    <span className="vocab-word">{item.word}</span>
                                    <span className="vocab-translation">{item.translation}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const DefinitionCard: React.FC<{ definition: string; japaneseDefinition: string; delay: number }> = ({ definition, japaneseDefinition, delay }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const opacity = spring({ frame: frame - delay, fps, config: { damping: 200 } });
    const slide = interpolate(opacity, [0, 1], [20, 0]);

    return (
        <div className="card" style={{ opacity, transform: `translateY(${slide}px)` }}>
            <Sequence from={delay}>
                <Audio src={staticFile("se/paper.mp3")} volume={0.5} />
            </Sequence>
            <div className="card-label">Definition</div>
            <div className="definition-en">{definition}</div>
            <div className="definition-jp">{japaneseDefinition}</div>
        </div>
    );
};

const WordScene: React.FC<{ word: string; japaneseWordTranslation: string; definition: string; japaneseDefinition: string; durationInFrames: number; audioDurations?: { word_en: number; word_jp: number; definition_en: number; definition_jp: number } }> = ({ word, japaneseWordTranslation, definition, japaneseDefinition, durationInFrames, audioDurations }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const fade = spring({ frame, fps, config: { damping: 200 } });
    const slideUp = interpolate(fade, [0, 1], [50, 0]);

    // Calculate start times
    const wordJpStart = audioDurations ? Math.ceil(audioDurations.word_en * fps) + 10 : 45;
    const definitionEnStart = audioDurations ? wordJpStart + Math.ceil(audioDurations.word_jp * fps) + 15 : 90;
    const definitionJpStart = audioDurations ? definitionEnStart + Math.ceil(audioDurations.definition_en * fps) + 10 : 180;

    const definitionDelay = definitionEnStart;

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Sequence from={0}>
                <Audio src={staticFile("se/click.mp3")} volume={0.5} />
            </Sequence>
            {audioDurations && (
                <>
                    <Audio src={staticFile("audio/word_en.mp3")} />
                    <Sequence from={wordJpStart}>
                        <Audio src={staticFile("audio/word_jp.mp3")} />
                    </Sequence>
                    <Sequence from={definitionEnStart}>
                        <Audio src={staticFile("audio/definition_en.mp3")} />
                    </Sequence>
                    <Sequence from={definitionJpStart}>
                        <Audio src={staticFile("audio/definition_jp.mp3")} />
                    </Sequence>
                </>
            )}
            <Background />
            <div className="content-wrapper">
                <div className="word-section" style={{ opacity: fade, transform: `translateY(${slideUp}px)` }}>
                    <div className="word">{word}</div>
                    <div className="word-translation">{japaneseWordTranslation}</div>
                </div>

                <DefinitionCard
                    definition={definition}
                    japaneseDefinition={japaneseDefinition}
                    delay={definitionDelay}
                />
            </div>
        </AbsoluteFill>
    );
};

const ContextScene: React.FC<{ context: string; japaneseContext: string; durationInFrames: number; audioDurations?: { en: number; jp: number } }> = ({ context, japaneseContext, durationInFrames, audioDurations }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const opacity = spring({ frame, fps, config: { damping: 200 } });
    const slide = interpolate(opacity, [0, 1], [20, 0]);

    const jpAudioStart = audioDurations ? Math.ceil(audioDurations.en * fps) + 15 : 150;

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Sequence from={0}>
                <Audio src={staticFile("se/paper.mp3")} volume={0.5} />
            </Sequence>
            {audioDurations && (
                <>
                    <Audio src={staticFile("audio/context_en.mp3")} />
                    <Sequence from={jpAudioStart}>
                        <Audio src={staticFile("audio/context_jp.mp3")} />
                    </Sequence>
                </>
            )}
            <Background />
            <div className="content-wrapper">
                <div className="card context-card" style={{ opacity, transform: `translateY(${slide}px)`, borderLeftColor: 'var(--primary-color)' }}>
                    <div className="card-label" style={{ backgroundColor: 'var(--primary-color)', color: '#fff' }}>Legal Context</div>
                    <div className="context-text">{context}</div>
                    <div className="context-jp">{japaneseContext}</div>
                </div>
            </div>
        </AbsoluteFill>
    );
}

const ExampleScene: React.FC<{ sentence: string; translation: string; durationInFrames: number; audioDurations?: { en: number; jp: number } }> = ({ sentence, translation, durationInFrames, audioDurations }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const opacity = spring({ frame, fps, config: { damping: 200 } });

    const jpAudioStart = audioDurations ? Math.ceil(audioDurations.en * fps) + 15 : 150;

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Sequence from={0}>
                <Audio src={staticFile("se/paper.mp3")} volume={0.5} />
            </Sequence>
            {audioDurations && (
                <>
                    <Audio src={staticFile("audio/example_en.mp3")} />
                    <Sequence from={jpAudioStart}>
                        <Audio src={staticFile("audio/example_jp.mp3")} />
                    </Sequence>
                </>
            )}
            <Background />
            <div className="content-wrapper">
                <div className="card" style={{ opacity, borderLeftColor: 'var(--accent-color)' }}>
                    <div className="card-label" style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-dark)' }}>Example</div>
                    <div className="example-en">{sentence}</div>
                    <div className="example-jp">{translation}</div>
                </div>
            </div>
        </AbsoluteFill>
    );
}

const ProgressBar: React.FC = () => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const progress = frame / durationInFrames;
    return (
        <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
    );
};

const getThemeStyle = (category: string): React.CSSProperties => {
    // Default theme
    let theme = {
        '--primary-color': '#c0392b',
        '--accent-color': '#d4af37',
    };

    if (category === 'Civil Law') {
        theme = {
            '--primary-color': '#2980b9',
            '--accent-color': '#bdc3c7',
        };
    } else if (category === 'Corporate Law') {
        theme = {
            '--primary-color': '#27ae60',
            '--accent-color': '#f1c40f',
        };
    }

    return theme as React.CSSProperties;
};

export const LawEnglishVideo: React.FC<z.infer<typeof lawEnglishSchema>> = (props) => {
    const themeStyle = getThemeStyle(props.category);
    const { audioDurations } = props;
    const fps = 30;
    const BUFFER = 30;

    // Calculate scene durations based on audio if available
    const titleDuration = audioDurations ? Math.ceil(audioDurations.title * fps) + BUFFER : 90;
    const wordDuration = audioDurations ? Math.ceil((audioDurations.word_en + audioDurations.word_jp + audioDurations.definition_en + audioDurations.definition_jp) * fps) + BUFFER * 4 : 300;
    const contextDuration = audioDurations ? Math.ceil((audioDurations.context_en + audioDurations.context_jp) * fps) + BUFFER * 2 : 300;
    const exampleDuration = audioDurations ? Math.ceil((audioDurations.example_en + audioDurations.example_jp) * fps) + BUFFER * 2 : 300;

    let vocabDuration = 240;
    if (audioDurations && audioDurations.vocab) {
        vocabDuration = audioDurations.vocab.reduce((acc, dur) => acc + Math.ceil(dur * fps) + 15, 0) + BUFFER;
    }

    const scene1End = titleDuration;
    const scene2End = scene1End + wordDuration;
    const scene3End = scene2End + contextDuration;
    const scene4End = scene3End + exampleDuration;
    const totalDuration = scene4End + vocabDuration;

    // Calculate audio intervals for lip-sync
    const audioIntervals: { start: number; end: number }[] = [];
    if (audioDurations) {
        // Title Scene - Skipped (English only)

        // Word Scene
        const wordBase = scene1End;
        const wordEnDur = Math.ceil(audioDurations.word_en * fps);
        const wordJpDur = Math.ceil(audioDurations.word_jp * fps);
        const defEnDur = Math.ceil(audioDurations.definition_en * fps);
        const defJpDur = Math.ceil(audioDurations.definition_jp * fps);

        const wordJpStart = wordEnDur + 10;
        const defEnStart = wordJpStart + wordJpDur + 15;
        const defJpStart = defEnStart + defEnDur + 10;

        // Only Japanese parts
        audioIntervals.push({ start: wordBase + wordJpStart, end: wordBase + wordJpStart + wordJpDur });
        audioIntervals.push({ start: wordBase + defJpStart, end: wordBase + defJpStart + defJpDur });

        // Context Scene
        const contextBase = scene2End;
        const ctxEnDur = Math.ceil(audioDurations.context_en * fps);
        const ctxJpDur = Math.ceil(audioDurations.context_jp * fps);
        const ctxJpStart = ctxEnDur + 15;

        // Only Japanese part
        audioIntervals.push({ start: contextBase + ctxJpStart, end: contextBase + ctxJpStart + ctxJpDur });

        // Example Scene
        const exampleBase = scene3End;
        const exEnDur = Math.ceil(audioDurations.example_en * fps);
        const exJpDur = Math.ceil(audioDurations.example_jp * fps);
        const exJpStart = exEnDur + 15;

        // Only Japanese part
        audioIntervals.push({ start: exampleBase + exJpStart, end: exampleBase + exJpStart + exJpDur });

        // Vocab Scene - Skipped (Mixed/English)
    }

    return (
        <AbsoluteFill style={themeStyle}>
            <Audio src={staticFile("bgm/caravan.mp3")} loop volume={0.3} />
            <Sequence durationInFrames={titleDuration}>
                <TitleScene
                    title={props.titleText}
                    category={props.category}
                    word={props.word}
                    durationInFrames={titleDuration}
                    hasAudio={!!audioDurations}
                />
            </Sequence>
            <Sequence from={scene1End} durationInFrames={wordDuration}>
                <WordScene
                    word={props.word}
                    japaneseWordTranslation={props.japaneseWordTranslation}
                    definition={props.definition}
                    japaneseDefinition={props.japaneseDefinition}
                    durationInFrames={wordDuration}
                    audioDurations={audioDurations ? { word_en: audioDurations.word_en, word_jp: audioDurations.word_jp, definition_en: audioDurations.definition_en, definition_jp: audioDurations.definition_jp } : undefined}
                />
            </Sequence>
            <Sequence from={scene2End} durationInFrames={contextDuration}>
                <ContextScene context={props.legalContext} japaneseContext={props.japaneseLegalContext} durationInFrames={contextDuration} audioDurations={audioDurations ? { en: audioDurations.context_en, jp: audioDurations.context_jp } : undefined} />
            </Sequence>
            <Sequence from={scene3End} durationInFrames={exampleDuration}>
                <ExampleScene sentence={props.exampleSentence} translation={props.exampleTranslation} durationInFrames={exampleDuration} audioDurations={audioDurations ? { en: audioDurations.example_en, jp: audioDurations.example_jp } : undefined} />
            </Sequence>
            <Sequence from={scene4End} durationInFrames={vocabDuration}>
                <VocabularyListScene vocabularyList={props.vocabularyList} durationInFrames={vocabDuration} audioDurations={audioDurations?.vocab} />
            </Sequence>
            <Character audioIntervals={audioIntervals} visibleFrom={scene1End} />
            <ProgressBar />
        </AbsoluteFill>
    );
};
