
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const INPUT_DIR = path.join(__dirname, '../input');
const DATA_FILE = path.join(__dirname, '../src/data/law-english-data.json');
const HISTORY_FILE = path.join(__dirname, '../src/data/history.json');

async function main() {
    console.log('Scanning input directory:', INPUT_DIR);

    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`Input directory not found: ${INPUT_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(INPUT_DIR).filter((f: string) => f.endsWith('.json'));

    if (files.length === 0) {
        console.error('No JSON files found in input directory.');
        process.exit(1);
    }

    let selectedFile = null;
    let selectedData = null;
    let remainingData = [];

    // Shuffle files to pick a random category
    const shuffledFiles = files.sort(() => 0.5 - Math.random());

    for (const file of shuffledFiles) {
        const filePath = path.join(INPUT_DIR, file);
        try {
            const content = await fs.readJson(filePath);
            if (Array.isArray(content) && content.length > 0) {
                selectedFile = filePath;
                selectedData = content[0];
                remainingData = content.slice(1);
                break;
            }
        } catch (e) {
            console.warn(`Error reading ${file}:`, (e as Error).message);
        }
    }

    if (!selectedFile || !selectedData) {
        console.error('No data found in any input files. Please populate the JSON files in the input directory.');
        process.exit(1);
    }

    console.log(`Selected data from: ${path.basename(selectedFile)}`);
    console.log(`Word: ${selectedData.word}`);

    // Update the input file (remove the used item)
    await fs.writeJson(selectedFile, remainingData, { spaces: 2 });
    console.log(`Updated ${path.basename(selectedFile)} (remaining items: ${remainingData.length})`);

    // Write to src/data/law-english-data.json
    await fs.writeJson(DATA_FILE, selectedData, { spaces: 2 });
    console.log(`Updated ${DATA_FILE}`);

    // Update history
    let history = [];
    try {
        history = await fs.readJson(HISTORY_FILE);
    } catch (e) {
        // ignore if file doesn't exist or is empty
    }
    if (!Array.isArray(history)) history = [];

    history.push({
        word: selectedData.word,
        category: selectedData.category,
        date: new Date().toISOString()
    });
    await fs.writeJson(HISTORY_FILE, history, { spaces: 2 });
    console.log(`Added "${selectedData.word}" to history.`);

    // Run generation commands
    try {
        console.log('Generating audio...');
        execSync('npx ts-node scripts/generate-audio.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log('Rendering video...');
        const category = selectedData.category.replace(/[^a-z0-9]+/gi, '_').toLowerCase().replace(/^_+|_+$/g, '');
        const word = selectedData.word.replace(/[^a-z0-9]+/gi, '_').toLowerCase().replace(/^_+|_+$/g, '');
        const outputVideo = `out/${category}_${word}.mp4`;
        execSync(`npx remotion render src/index.ts LawEnglish ${outputVideo}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log('Cleaning up audio...');
        execSync('npx ts-node scripts/cleanup-audio.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log('Preparing YouTube upload...');
        const metadata = {
            title: `Legal English: ${selectedData.word} (${selectedData.japaneseWordTranslation})`,
            description: `Mastering Japanese Legal English\n\nWord: ${selectedData.word}\nMeaning: ${selectedData.definition}\nJapanese Meaning: ${selectedData.japaneseDefinition}\n\nLegal Context:\n${selectedData.legalContext}\n${selectedData.japaneseLegalContext}\n\nExample:\n${selectedData.exampleSentence}\n${selectedData.exampleTranslation}\n\n#LegalEnglish #Law #EnglishLearning #JapaneseLaw`,
            tags: ['Legal English', 'Law', 'English Learning', 'Japanese Law', selectedData.word]
        };
        const metadataPath = path.join(__dirname, '../out/metadata.json');
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });

        console.log('Uploading to YouTube...');
        execSync(`npx ts-node scripts/upload-youtube.ts "${outputVideo}" "${metadataPath}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });


        console.log(`\nSuccess! Video generated at: ${outputVideo}`);
    } catch (e) {
        console.error('Error during video generation process:', (e as Error).message);
        process.exit(1);
    }
}

main();
