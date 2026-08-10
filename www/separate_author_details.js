const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

console.log('Starting separation of Author details...\n');

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Find Author Chapter (Page 13)
        const authorChapter = data.chapters.find(c => c.pageNumber === 13);

        if (authorChapter && authorChapter.verses) {
            const authorInfo = authorChapter.verses.find(v => v.id === 'AuthorInfo');

            if (authorInfo && authorInfo.text) {
                // Check if it already starts with newlines to avoid duplicate runs
                if (!authorInfo.text.startsWith('\n\n')) {
                    authorInfo.text = '\n\n' + authorInfo.text;
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});

console.log('\nSeparation complete!');
