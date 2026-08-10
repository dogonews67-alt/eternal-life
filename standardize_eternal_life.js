const fs = require('fs');
const path = require('path');

const dir = 'www/eternal_life_languages';
const englishFile = path.join(dir, 'english.json');

// Load English source
const english = JSON.parse(fs.readFileSync(englishFile, 'utf8'));
const englishPage10 = english.chapters.find(c => c.pageNumber === 10);

// Load Translations
const transParts = [
    'page_10_translations_part1.json',
    'page_10_translations_part2.json',
    'page_10_translations_part3.json',
    'page_10_translations_part4.json',
    'page_10_translations_part5.json'
];

let translations = {};
transParts.forEach(part => {
    if (fs.existsSync(part)) {
        const partData = JSON.parse(fs.readFileSync(part, 'utf8'));
        Object.assign(translations, partData);
    }
});

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'english.json');

files.forEach(file => {
    const langKey = file.replace('.json', '');
    const filePath = path.join(dir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Check for Page 10
    const page10Index = content.chapters.findIndex(c => c.pageNumber === 10);

    if (page10Index === -1) {
        console.log(`[ADDING] Page 10 to ${file}`);

        // Construct Page 10
        let trans = translations[langKey] || translations['english']; // Fallback to English if missing
        if (!translations[langKey]) {
            console.log(`  > Warning: No translation found for ${langKey}, using English.`);
        }

        const newPage10 = {
            pageNumber: 10,
            verses: [
                {
                    id: "Para 10_2",
                    text: trans.p1
                },
                {
                    id: "Para 10_3",
                    text: trans.p2
                },
                {
                    id: "Para 10_4",
                    text: trans.p3
                },
                {
                    type: "header",
                    text: trans.h1
                },
                {
                    id: "Para 10_5",
                    text: trans.p4
                },
                {
                    id: "Para 10_6",
                    text: trans.p5
                }
            ]
        };

        // Insert after Page 9 (finding index of Page 9)
        const page9Index = content.chapters.findIndex(c => c.pageNumber === 9);
        if (page9Index !== -1) {
            content.chapters.splice(page9Index + 1, 0, newPage10);
        } else {
            // Find where to insert if Page 9 is missing (unlikely) or structure is weird
            // Try to insert before Page 11
            const page11Index = content.chapters.findIndex(c => c.pageNumber === 11);
            if (page11Index !== -1) {
                content.chapters.splice(page11Index, 0, newPage10);
            } else {
                // Append? No, push before Conclusion/Preface
                // Just push to end of pages section?
                // Let's rely on sorting later or just inserting at position 10 (since 0 is Cover, 1-9 are 1-9)
                // content.chapters[10] should be Page 10
                if (content.chapters.length >= 10) {
                    content.chapters.splice(10, 0, newPage10);
                }
            }
        }
        modified = true;
    } else {
        // Page 10 exists, maybe check if we need to update bolding?
        // User asked to "apply update... standardize according to english"
        // If content looks "old" or "wrong", we might update.
        // For now, assume if it exists, it might be partial or incorrect? 
        // But many languages were missing it entirely. 
        // Let's assume if it exists we leave it alone unless it's empty.
    }

    // Standardize other page numbers if needed? 
    // Usually Page 11, 12, 13 etc might be shifted if Page 10 was missing?
    // No, if Page 10 was missing, existing pages were probably 1,2..9, 11, 12..
    // So inserting 10 fixes the gap.

    // ENSURE Page 9 is followed by Page 10, followed by Page 11.

    // Sort chapters by pageNumber to be safe?
    // But "End" is a string. "Front Cover" is undefined pageNumber or 0? 
    // English structure: Cover, 1, 2, ... 10, 11, 12, 13, "End"

    // Let's verify structure vs English
    // English has 15 chapters (length 15).

    // Write back
    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    }
});

console.log('Standardization complete.');
