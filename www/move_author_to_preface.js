const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'eternal_life_languages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let processed = 0;
let skipped = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const chapters = data.chapters;

    // Find the Author chapter (last chapter)
    const lastChapter = chapters[chapters.length - 1];
    const authorVerse = lastChapter.verses && lastChapter.verses.find(v => v.id === 'AuthorInfo');

    if (!authorVerse) {
        console.log(`SKIP: ${file} - no AuthorInfo found in last chapter`);
        skipped++;
        return;
    }

    // Find the Preface chapter (index 1, after Front Cover)
    const prefaceChapter = chapters[1];
    if (!prefaceChapter || !prefaceChapter.verses) {
        console.log(`SKIP: ${file} - no Preface chapter found at index 1`);
        skipped++;
        return;
    }

    // Insert AuthorInfo at the beginning of Preface verses
    prefaceChapter.verses.unshift({ ...authorVerse });

    // Remove the Author chapter (last chapter)
    chapters.pop();

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`OK: ${file} - moved AuthorInfo to preface, removed Author chapter`);
    processed++;
});

console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}`);
