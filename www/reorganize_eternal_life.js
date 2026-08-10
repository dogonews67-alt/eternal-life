const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

console.log('Starting reorganization of Eternal Life content...\n');

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Find the relevant chapters
        const conclusionChapter = data.chapters.find(c => c.pageNumber === 12);
        const authorChapter = data.chapters.find(c => c.pageNumber === 13);
        const endChapter = data.chapters.find(c => c.pageNumber === 'End');

        if (conclusionChapter && authorChapter && endChapter) {
            // Find the verses
            const blessingIndex = authorChapter.verses.findIndex(v => v.id === 'Blessing');
            const backCoverIndex = endChapter.verses.findIndex(v => v.id === 'Back Cover');

            if (blessingIndex !== -1 && backCoverIndex !== -1) {
                // Extract the verses
                const blessingVerse = authorChapter.verses[blessingIndex];
                const backCoverVerse = endChapter.verses[backCoverIndex];

                // Move Blessing from Author (Page 13) to Conclusion (Page 12)
                conclusionChapter.verses.push(blessingVerse);

                // Remove Blessing from Author chapter
                authorChapter.verses.splice(blessingIndex, 1);

                // Move Back Cover from End page to Author (Page 13)
                authorChapter.verses.push(backCoverVerse);

                // Remove Back Cover from End page
                endChapter.verses.splice(backCoverIndex, 1);

                modified = true;
                console.log(`✓ ${file}: Reorganized content`);
                console.log(`  - Moved "Blessing" to Conclusion (Page 12)`);
                console.log(`  - Moved "Back Cover" to Author (Page 13)`);
            } else {
                console.log(`⚠ ${file}: Could not find Blessing or Back Cover verses`);
            }
        } else {
            console.log(`⚠ ${file}: Could not find required chapters`);
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        }
    }
});

console.log('\nReorganization complete!');
