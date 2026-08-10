const fs = require('fs');
const path = require('path');

const dir = 'www/eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log('Removing titles from numbered pages...');

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Iterate through chapters
    content.chapters.forEach(chapter => {
        // If it's a numbered page (type of pageNumber is number) and it has a title
        // Special case: Page "End" is a string, so checks for type number handles it.
        // "Front Cover" usually has isCover: true, and no pageNumber or pageNumber is 0? 
        // English.json: Page 1, 2... are numbers. Page "End" is not.

        if (typeof chapter.pageNumber === 'number' && chapter.title) {
            console.log(`[Removing Title] ${file} - Page ${chapter.pageNumber}: "${chapter.title}"`);
            delete chapter.title;
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    }
});

console.log('Title removal complete.');
