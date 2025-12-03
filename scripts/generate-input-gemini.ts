
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const INPUT_DIR = path.join(__dirname, '../input');

if (!API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface VocabularyItem {
    word: string;
    translation: string;
}

interface LawData {
    category: string;
    titleText: string;
    word: string;
    definition: string;
    japaneseDefinition: string;
    japaneseWordTranslation: string;
    legalContext: string;
    japaneseLegalContext: string;
    exampleSentence: string;
    exampleTranslation: string;
    vocabularyList: VocabularyItem[];
}

async function getExistingWords(): Promise<Set<string>> {
    const existingWords = new Set<string>();
    if (!fs.existsSync(INPUT_DIR)) return existingWords;

    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        try {
            const content = await fs.readJson(path.join(INPUT_DIR, file));
            if (Array.isArray(content)) {
                content.forEach((item: any) => {
                    if (item.word) existingWords.add(item.word.toLowerCase());
                });
            }
        } catch (e) {
            // Ignore errors reading individual files
        }
    }
    return existingWords;
}

function getCategoryFilename(category: string): string {
    // Map category names to filenames roughly
    // e.g. "Civil Code (民法)" -> "civil_code.json"
    // "Civil Procedure (民事訴訟法)" -> "civil_procedure.json"

    // Extract English part
    const englishPart = category.split('(')[0].trim();
    const snakeCase = englishPart.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return `${snakeCase}.json`;
}

async function main() {
    const existingWords = await getExistingWords();
    console.log(`Found ${existingWords.size} existing words. Generating new data...`);

    const prompt = `
    You are an expert in Japanese Law and Legal English.
    Generate 3 NEW entries for a video series "Mastering Japanese Legal English".
    
    The entries should be about important Japanese legal terms (Civil Code, Criminal Code, Civil Procedure, Companies Act, etc.).
    Do NOT use these words: ${Array.from(existingWords).join(', ')}.

    Output strictly a JSON array of objects. Each object must follow this schema:
    {
        "category": "String (e.g., 'Civil Code (民法)', 'Companies Act (会社法)')",
        "titleText": "Mastering\\nJapanese Legal English",
        "word": "English Term",
        "definition": "English definition",
        "japaneseDefinition": "Japanese definition",
        "japaneseWordTranslation": "Japanese Term (Reading in Hiragana)",
        "legalContext": "Relevant Article or legal principle in English (e.g., 'Civil Code Art. 96: ...')",
        "japaneseLegalContext": "Relevant Article or legal principle in Japanese",
        "exampleSentence": "An example sentence using the English term in a legal context.",
        "exampleTranslation": "Japanese translation of the example sentence.",
        "vocabularyList": [
            { "word": "Term from context/example", "translation": "Japanese translation" },
            ... (5-8 items)
        ]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Cleanup markdown code blocks if present
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        const data: LawData[] = JSON.parse(text);

        if (!Array.isArray(data)) {
            throw new Error('Generated data is not an array');
        }

        console.log(`Generated ${data.length} new entries.`);

        for (const item of data) {
            const filename = getCategoryFilename(item.category);
            const filePath = path.join(INPUT_DIR, filename);

            let fileContent: LawData[] = [];
            if (fs.existsSync(filePath)) {
                try {
                    fileContent = await fs.readJson(filePath);
                } catch (e) {
                    console.warn(`Could not read ${filename}, starting fresh.`);
                }
            } else {
                // If file doesn't exist, check if we should create it or append to a 'misc.json'
                // For now, let's create it.
            }

            // Check for duplicates again just in case
            if (!fileContent.some(existing => existing.word.toLowerCase() === item.word.toLowerCase())) {
                fileContent.push(item);
                await fs.writeJson(filePath, fileContent, { spaces: 2 });
                console.log(`Added "${item.word}" to ${filename}`);
            } else {
                console.log(`Skipped duplicate "${item.word}"`);
            }
        }

    } catch (error) {
        console.error('Error generating data:', error);
        process.exit(1);
    }
}

main();
