// @ts-nocheck
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const getMP3Duration = require('mp3-duration');
const data = require('../src/data/law-english-data.json');

const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env:', result.error);
}

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
console.log('API_KEY present:', !!API_KEY);

const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

async function generateAudio(text, filename, lang = 'en-US') {
    if (!API_KEY) {
        console.error('GOOGLE_TTS_API_KEY is not set in .env');
        return 0;
    }

    const voiceName = lang === 'ja-JP' ? 'ja-JP-Neural2-B' : 'en-US-Journey-F';

    const requestBody = {
        input: { text: text },
        voice: { languageCode: lang, name: voiceName, ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    try {
        const response = await axios.post(TTS_API_URL, requestBody);
        const audioContent = response.data.audioContent;
        const buffer = Buffer.from(audioContent, 'base64');

        const filepath = path.join(__dirname, '../public/audio', filename);
        await fs.ensureDir(path.dirname(filepath));
        await fs.writeFile(filepath, buffer);

        const duration = await new Promise((resolve, reject) => {
            getMP3Duration(filepath, (err, duration) => {
                if (err) reject(err);
                else resolve(duration);
            });
        });

        console.log(`Generated: ${filename} (${duration.toFixed(2)}s)`);
        return duration;
    } catch (error) {
        console.error(`Error generating ${filename}:`, error.response ? error.response.data : error.message);
        return 0;
    }
}

async function main() {
    console.log('Generating audio...');

    const metadata = {};

    metadata['title'] = await generateAudio(data.titleText.replace('\n', ' '), 'title.mp3');

    // Word
    metadata['word_en'] = await generateAudio(data.word, 'word_en.mp3');
    metadata['word_jp'] = await generateAudio(data.japaneseWordTranslation, 'word_jp.mp3', 'ja-JP');

    // Definition
    metadata['definition_en'] = await generateAudio(data.definition, 'definition_en.mp3');
    metadata['definition_jp'] = await generateAudio(data.japaneseDefinition, 'definition_jp.mp3', 'ja-JP');

    // Context
    metadata['context_en'] = await generateAudio(data.legalContext, 'context_en.mp3');
    metadata['context_jp'] = await generateAudio(data.japaneseLegalContext, 'context_jp.mp3', 'ja-JP');

    // Example
    metadata['example_en'] = await generateAudio(data.exampleSentence, 'example_en.mp3');
    metadata['example_jp'] = await generateAudio(data.exampleTranslation, 'example_jp.mp3', 'ja-JP');

    // Vocab (English only)
    metadata['vocab'] = [];
    for (let i = 0; i < data.vocabularyList.length; i++) {
        const item = data.vocabularyList[i];
        const duration = await generateAudio(item.word, `vocab_${i}.mp3`);
        metadata['vocab'].push(duration);
    }

    await fs.writeJson(path.join(__dirname, '../src/data/audio-metadata.json'), metadata, { spaces: 2 });
    console.log('Audio generation complete. Metadata saved.');
}

main();
