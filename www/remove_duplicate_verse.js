const fs = require('fs');
const path = require('path');

const dir = 'eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'english.json');

console.log(`Checking ${files.length} files for structural duplicates...\n`);

let totalRemoved = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    content.chapters.forEach(chapter => {
        if (!chapter.verses) return;
        const originalLength = chapter.verses.length;
        chapter.verses = chapter.verses.filter(v => v.id !== 'John 5:24 cont.');

        if (chapter.verses.length !== originalLength) {
            changed = true;
            totalRemoved++;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`Removed duplicate 'John 5:24 cont.' from ${file}`);
    }
});

console.log(`\nFinished. Total duplicates removed: ${totalRemoved}`);
