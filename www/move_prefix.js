const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

console.log('Starting reorganization of Eternal Life content (Prefix Move & Renumbering)...\n');

let updatedCount = 0;

if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
}

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let modified = false;

            // 1. Find the Preface chapter
            let prefaceChapterIndex = -1;

            for (let i = 0; i < data.chapters.length; i++) {
                const chapter = data.chapters[i];
                const hasBackCover = chapter.verses.some(v => v.id === 'Back Cover');
                const hasBlessing = chapter.verses.some(v => v.id === 'Blessing');

                if (hasBackCover || hasBlessing) {
                    prefaceChapterIndex = i;
                    break;
                }
            }

            // 2. Move Preface if needed
            if (prefaceChapterIndex !== -1) {
                const prefaceChapter = data.chapters[prefaceChapterIndex];

                // If it's not at index 1, move it
                if (prefaceChapterIndex !== 1) {
                    data.chapters.splice(prefaceChapterIndex, 1);
                    if (data.chapters.length >= 1) {
                        data.chapters.splice(1, 0, prefaceChapter);
                    } else {
                        data.chapters.push(prefaceChapter);
                    }
                    modified = true;
                    // console.log(`✓ ${file}: Moved Preface to index 1`);
                } else {
                    // Check if it already has page number 1, if so, we might have already run the script partially?
                    // But we need to ensure numbering is correct regardless.
                }

                // 3. Renumber Pages
                // We want Preface to be Page 1.
                // We want subsequent numeric pages to be incremented (Old Page 1 -> Page 2)

                // Set Preface to Page 1
                if (prefaceChapter.pageNumber !== 1) {
                    prefaceChapter.pageNumber = 1;
                    modified = true;
                }

                // Iterate through ALL chapters to adjust other pages
                // We need to be careful not to increment Preface's 1 that we just set.
                // But wait, if we run this script TWICE, it might keep incrementing?
                // Logic:
                // If we see Page 1 and it's NOT the Preface, it must become Page 2.
                // If we see Page 2, it becomes Page 3.
                // Basically, we should re-assign page numbers based on order?
                // Or just increment existing numbers?

                // The issue with incrementing is idempotency. If I run this twice, Page 2 becomes Page 3, then Page 4.
                // Better approach:
                // Walk through the chapters from index 2 onwards.
                // If a chapter has a numeric pageNumber, sets it based on its sequence?
                // The original "Page 1" is now at index 2 (0=Cover, 1=Preface, 2=Old Page 1).
                // So at index 2, we expect Page 2.
                // At index 3, Page 3.
                // This assumes no gaps and strict order. The original JSONs had pageNumber: 1, 2, 3...

                let expectedPageNum = 2; // Starting for chapters after Preface

                for (let i = 2; i < data.chapters.length; i++) {
                    const chapter = data.chapters[i];

                    // If it implies it's a numeric page (has numeric pageNumber OR is not cover/author/preface)
                    // Currently checking if it HAS a pageNumber that is a number
                    if (typeof chapter.pageNumber === 'number') {
                        if (chapter.pageNumber !== expectedPageNum) {
                            chapter.pageNumber = expectedPageNum;
                            modified = true;
                        }
                        expectedPageNum++;
                    }
                }

                console.log(`✓ ${file}: Processed`);
            } else {
                console.log(`⚠ ${file}: Could not find Preface content`);
            }

            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                updatedCount++;
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});

console.log(`\nUpdate complete! Modified ${updatedCount} files.`);
