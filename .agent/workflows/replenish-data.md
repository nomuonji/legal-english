---
description: Replenish input data using the agent and web search
---

1. List the files in the `input` directory to understand existing categories and data.
2. Use `search_web` to find 3-5 important Japanese legal terms that are NOT yet in the input data. Focus on Civil Code, Companies Act, or Civil Procedure.
   - Search for: "Japanese legal term [Term] English translation definition article"
   - Verify the English translation, definition, and relevant legal article (e.g., Article number of the Code).
   - Find a good example sentence in a legal context.
3. Construct a JSON array with the found data. Each item must follow this schema:
   ```json
   {
       "category": "String (e.g., 'Civil Code (民法)')",
       "titleText": "Mastering\nJapanese Legal English",
       "word": "English Term",
       "definition": "English definition",
       "japaneseDefinition": "Japanese definition",
       "japaneseWordTranslation": "Japanese Term (Reading in Hiragana)",
       "legalContext": "Relevant Article or legal principle in English",
       "japaneseLegalContext": "Relevant Article or legal principle in Japanese",
       "exampleSentence": "An example sentence using the English term in a legal context.",
       "exampleTranslation": "Japanese translation of the example sentence.",
       "vocabularyList": [
           { "word": "Term", "translation": "Translation" }
       ]
   }
   ```
4. For each item in the array:
   - Determine the appropriate filename based on the category (e.g., "Civil Code" -> `civil_code.json`).
   - Read the existing file (if it exists).
   - Append the new item to the array (create a new array if file doesn't exist).
   - Write the updated array back to the file using `write_to_file` or `replace_file_content`.

caution: npm run generate-inputは使わずに、直接補充して下さい