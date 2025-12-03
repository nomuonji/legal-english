
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const INPUT_DIR = path.join(__dirname, '../input');
const DATA_FILE = path.join(__dirname, '../src/data/law-english-data.json');

async function main() {
    console.log('Scanning input directory:', INPUT_DIR);

    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`Input directory not found: ${INPUT_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        console.error('No JSON files found in input directory.');
        process.exit(1);
    }

    let selectedFile = null;
    let selectedData = null;
    let remainingData = [];

    // Shuffle files to pick a random category? Or just iterate?
    // Let's iterate and find the first file with data.
    for (const file of files) {
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
            console.warn(`Error reading ${file}:`, e.message);
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

    // Run generation commands
    try {
        console.log('Generating audio...');
        execSync('npx ts-node scripts/generate-audio.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log('Rendering video...');
        const outputVideo = `out/video_${Date.now()}.mp4`;
        execSync(`npx remotion render src/index.ts LawEnglish ${outputVideo}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log('Cleaning up audio...');
        execSync('npx ts-node scripts/cleanup-audio.ts', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

        console.log(`\nSuccess! Video generated at: ${outputVideo}`);
    } catch (e) {
        console.error('Error during video generation process:', e.message);
        process.exit(1);
    }
}

main();
