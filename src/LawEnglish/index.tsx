import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
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
});

const Background: React.FC = () => {
    return (
        <AbsoluteFill className="bg-overlay" />
    );
}

const TitleScene: React.FC<{ title: string; category: string; durationInFrames: number }> = ({ title, category, durationInFrames }) => {
    const frame = useCurrentFrame();

    const opacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const scale = interpolate(frame, [0, 100], [0.95, 1], { extrapolateRight: "clamp" });

    return (
        <AbsoluteFill className="container">
            <Background />
            <div className="content-wrapper">
                <div className="title-frame" style={{ opacity, transform: `scale(${scale})` }}>
                    <div className="category-badge">{category}</div>
                    <h1 className="title">
                        {title}
                    </h1>
                    <div className="subtitle">Essential Legal Terminology</div>
                </div>
            </div>
        </AbsoluteFill>
    );
};

const VocabularyListScene: React.FC<{ vocabularyList: { word: string; translation: string }[]; durationInFrames: number }> = ({ vocabularyList, durationInFrames }) => {
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
                            const delay = index * 5;
                            const opacity = spring({
                                frame: frame - delay,
                                fps,
                                config: { damping: 200 },
                            });
                            const translateX = interpolate(opacity, [0, 1], [-20, 0]);

                            return (
                                <div key={index} className="vocab-item" style={{ opacity, transform: `translateX(${translateX}px)` }}>
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

const DefinitionCard: React.FC<{ definition: string; japaneseDefinition: string; delay?: number }> = ({ definition, japaneseDefinition, delay = 0 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const opacity = spring({ frame: frame - delay, fps, config: { damping: 200 } });

    return (
        <div className="card" style={{ opacity }}>
            <div className="card-label">Definition</div>
            <div className="definition-en">{definition}</div>
            <div className="definition-jp">{japaneseDefinition}</div>
        </div>
    );
}

const WordScene: React.FC<{ word: string; japaneseWordTranslation: string; definition: string; japaneseDefinition: string; durationInFrames: number }> = ({ word, japaneseWordTranslation, definition, japaneseDefinition, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const fade = spring({ frame, fps, config: { damping: 200 } });
    const slideUp = interpolate(fade, [0, 1], [50, 0]);

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Background />
            <div className="content-wrapper">
                <div className="word-section" style={{ opacity: fade, transform: `translateY(${slideUp}px)` }}>
                    <div className="word">{word}</div>
                    <div className="word-translation">{japaneseWordTranslation}</div>
                </div>

                <DefinitionCard
                    definition={definition}
                    japaneseDefinition={japaneseDefinition}
                    delay={20}
                />
            </div>
        </AbsoluteFill>
    );
};

const ContextScene: React.FC<{ context: string; japaneseContext: string; durationInFrames: number }> = ({ context, japaneseContext, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const opacity = spring({ frame, fps, config: { damping: 200 } });
    const slide = interpolate(opacity, [0, 1], [20, 0]);

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
            <Background />
            <div className="content-wrapper">
                <div className="card" style={{ opacity, transform: `translateY(${slide}px)`, borderLeftColor: 'var(--primary-color)' }}>
                    <div className="card-label" style={{ backgroundColor: 'var(--primary-color)', color: '#fff' }}>Legal Context</div>
                    <div className="context-text">{context}</div>
                    <div className="context-jp">{japaneseContext}</div>
                </div>
            </div>
        </AbsoluteFill>
    );
}

const ExampleScene: React.FC<{ sentence: string; translation: string; durationInFrames: number }> = ({ sentence, translation, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const containerOpacity = interpolate(
        frame,
        [0, 20, durationInFrames - 20, durationInFrames],
        [0, 1, 1, 0]
    );

    const opacity = spring({ frame, fps, config: { damping: 200 } });

    return (
        <AbsoluteFill className="container" style={{ opacity: containerOpacity }}>
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
}

const getThemeStyle = (category: string) => {
    if (category.includes("Civil Code") || category.includes("民法")) {
        return {
            "--primary-color": "#c0392b", // Red
            "--accent-color": "#d4af37", // Gold
            "--bg-start": "#2c3e50",
            "--bg-end": "#000000",
            "--text-dark": "#2c3e50",
        } as React.CSSProperties;
    } else if (category.includes("Companies Act") || category.includes("会社法")) {
        return {
            "--primary-color": "#2980b9", // Blue
            "--accent-color": "#f1c40f", // Yellow
            "--bg-start": "#34495e",
            "--bg-end": "#1a252f",
            "--text-dark": "#2c3e50",
        } as React.CSSProperties;
    } else if (category.includes("Criminal") || category.includes("刑法")) {
        return {
            "--primary-color": "#8e44ad", // Purple
            "--accent-color": "#bdc3c7", // Silver
            "--bg-start": "#2c3e50",
            "--bg-end": "#000000",
            "--text-dark": "#2c3e50",
        } as React.CSSProperties;
    }
    // Default
    return {
        "--primary-color": "#c0392b",
        "--accent-color": "#d4af37",
        "--bg-start": "#2c3e50",
        "--bg-end": "#000000",
        "--text-dark": "#2c3e50",
    } as React.CSSProperties;
};

export const LawEnglishVideo: React.FC<z.infer<typeof lawEnglishSchema>> = (props) => {
    const themeStyle = getThemeStyle(props.category);

    return (
        <AbsoluteFill style={themeStyle}>
            <Sequence durationInFrames={90}>
                <TitleScene title={props.titleText} category={props.category} durationInFrames={90} />
            </Sequence>
            <Sequence from={90} durationInFrames={180}>
                <WordScene
                    word={props.word}
                    japaneseWordTranslation={props.japaneseWordTranslation}
                    definition={props.definition}
                    japaneseDefinition={props.japaneseDefinition}
                    durationInFrames={180}
                />
            </Sequence>
            <Sequence from={270} durationInFrames={210}>
                <ContextScene context={props.legalContext} japaneseContext={props.japaneseLegalContext} durationInFrames={210} />
            </Sequence>
            <Sequence from={480} durationInFrames={210}>
                <ExampleScene sentence={props.exampleSentence} translation={props.exampleTranslation} durationInFrames={210} />
            </Sequence>
            <Sequence from={690} durationInFrames={240}>
                <VocabularyListScene vocabularyList={props.vocabularyList} durationInFrames={240} />
            </Sequence>
            <ProgressBar />
        </AbsoluteFill>
    );
};
