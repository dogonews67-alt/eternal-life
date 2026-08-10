const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

console.log('Starting reordering of Author page content...\n');

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Find Author Chapter (Page 13)
        const authorChapter = data.chapters.find(c => c.pageNumber === 13);

        if (authorChapter && authorChapter.verses) {
            const authorInfoIndex = authorChapter.verses.findIndex(v => v.id === 'AuthorInfo');
            const backCoverIndex = authorChapter.verses.findIndex(v => v.id === 'Back Cover');

            // If both exist and AuthorInfo is before Back Cover, swap them
            // We want AuthorInfo at the bottom (last)
            if (authorInfoIndex !== -1 && backCoverIndex !== -1) {
                // Remove them from current positions
                const authorInfo = authorChapter.verses.find(v => v.id === 'AuthorInfo');
                const backCover = authorChapter.verses.find(v => v.id === 'Back Cover');

                // Filter out both
                authorChapter.verses = authorChapter.verses.filter(v => v.id !== 'AuthorInfo' && v.id !== 'Back Cover');

                // Add in desired order: Back Cover first, then AuthorInfo
                authorChapter.verses.push(backCover);
                authorChapter.verses.push(authorInfo);

                modified = true;
                // console.log(`✓ ${file}: Reordered Author page (AuthorInfo moved to bottom)`);
            } else if (authorInfoIndex !== -1) {
                // If only AuthorInfo exists, make sure it is last (though if it's the only one, it is last/first)
                // But maybe there are other verses?
                // Let's assume the previous task put BackCover there.
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Updated ${file}`);
        }
    }
});

console.log('\nReordering complete!');
