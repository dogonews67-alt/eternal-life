const fs = require('fs');
const path = require('path');

const dir = 'www/eternal_life_languages';
const titleTransFile = 'special_titles_translations.json';
const titleTrans = JSON.parse(fs.readFileSync(titleTransFile, 'utf8'));

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'english.json');

// Helper to find language key in translations (mapping formatting)
// The JSON keys are lowercase, filenames are lowercase.
// Exceptions: 'bhutanese' vs 'dzongkha'? (File is bhutanese.json)
// We assume 1-1 mapping based on filename.

console.log('Restoring Conclusion and Preface titles...');

files.forEach(file => {
    const langKey = file.replace('.json', '');
    const trans = titleTrans[langKey] || titleTrans['english']; // Fallback

    if (!titleTrans[langKey]) {
        console.log(`  > Warning: No specific translation for ${langKey}, using English.`);
    }

    const filePath = path.join(dir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Logic: 
    // "Conclusion" should be the chapter following Page 11.
    // "Preface" should be the chapter following Conclusion.
    // Structure: Cover, 1..11, Conclusion, Preface, Author.

    // Find Page 11 index
    const page11Index = content.chapters.findIndex(c => c.pageNumber === 11);

    if (page11Index !== -1 && content.chapters.length > page11Index + 1) {
        // Conclusion is likely at page11Index + 1
        const conclusionIndex = page11Index + 1;
        const conclusionChapter = content.chapters[conclusionIndex];

        // Safety check: Don't overwrite if it's "Author" or something unexpectedly
        // But usually it's the next one.

        // Update Conclusion
        // Ensure it has the title
        conclusionChapter.title = trans.conclusion;
        // Ensure it DOES NOT have pageNumber (matching English)
        if (conclusionChapter.pageNumber !== undefined) {
            delete conclusionChapter.pageNumber;
        }
        modified = true;
        console.log(`[UPDATED] ${file} - Conclusion set to "${trans.conclusion}"`);

        // Preface is likely at conclusionIndex + 1
        if (content.chapters.length > conclusionIndex + 1) {
            const prefaceIndex = conclusionIndex + 1;
            const prefaceChapter = content.chapters[prefaceIndex];

            // Safety check: is it Author?
            // "Author" usually has pageNumber: "End" or title "Author".
            // Preface usually has Back Cover text.

            // Only update if it's NOT the Author page (check verses/id if unsure, but relying on order 12->13)
            // English structure: Page 11 -> Conclusion -> Preface -> Author.

            prefaceChapter.title = trans.preface;
            // Remove pageNumber
            if (prefaceChapter.pageNumber !== undefined) {
                delete prefaceChapter.pageNumber;
            }
            modified = true;
            console.log(`[UPDATED] ${file} - Preface set to "${trans.preface}"`);
        }
    } else {
        console.log(`[SKIPPED] ${file} - Could not locate Page 11 to anchor position.`);
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    }
});

console.log('Special titles restoration complete.');
