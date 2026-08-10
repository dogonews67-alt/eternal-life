const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

console.log('Starting Fix and Standardize process (Robust Mode)...\n');

// Helper to remove a verse by ID from a chapter
function removeVerse(chapter, id) {
    if (!chapter || !chapter.verses) return null;
    const idx = chapter.verses.findIndex(v => v.id === id);
    if (idx !== -1) {
        return chapter.verses.splice(idx, 1)[0];
    }
    return null;
}

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error(`Error parsing ${file}: ${e.message} `);
            return;
        }

        let modified = false;

        // --- 1. ROBUSTLY IDENTIFY CHAPTERS ---

        // Find Author Chapter: Prefer Page 13, fallback to containing 'AuthorInfo'
        let authorChapter = data.chapters.find(c => c.pageNumber === 13);
        if (!authorChapter) {
            authorChapter = data.chapters.find(c => c.verses && c.verses.some(v => v.id === 'AuthorInfo'));
        }

        // Find Chapter containing 'Back Cover' (could be End page, or already Author page, or elsewhere)
        let backCoverChapter = data.chapters.find(c => c.verses && c.verses.some(v => v.id === 'Back Cover'));

        // Find Conclusion Chapter (Page 12) - for moving Blessing
        let conclusionChapter = data.chapters.find(c => c.pageNumber === 12);

        // Find Chapter containing 'Blessing'
        let blessingChapter = data.chapters.find(c => c.verses && c.verses.some(v => v.id === 'Blessing'));


        if (authorChapter) {

            // --- 2. MOVE BLESSING (If not in Conclusion) ---
            if (blessingChapter && blessingChapter !== conclusionChapter && conclusionChapter) {
                let blessingVerse = removeVerse(blessingChapter, 'Blessing');
                if (blessingVerse) {
                    // Check duplication
                    if (!conclusionChapter.verses.find(v => v.id === 'Blessing')) {
                        conclusionChapter.verses.push(blessingVerse);
                        modified = true;
                    }
                }
            }


            // --- 3. MOVE BACK COVER (If not in Author Chapter) ---
            if (backCoverChapter && backCoverChapter !== authorChapter) {
                let backCoverVerse = removeVerse(backCoverChapter, 'Back Cover');
                // Clean up empty chapter if it was the only verse (e.g. End page)
                if (backCoverChapter.verses.length === 0) {
                    // We prefer not to delete chapters to avoid breaking navigation indices unless necessary
                    // But usually safe to leave empty
                }

                if (backCoverVerse) {
                    authorChapter.verses.push(backCoverVerse); // Add temporarily, verify order next
                    modified = true;
                }
            }


            // --- 4. FORCE ORDER ON AUTHOR PAGE ---
            // Requirement: "Back Cover" (Top) -> "AuthorInfo" (Bottom)
            // Get current verses
            const currentVerses = authorChapter.verses;

            // Extract specific verses if they exist
            const authorInfo = currentVerses.find(v => v.id === 'AuthorInfo');
            const backCover = currentVerses.find(v => v.id === 'Back Cover');

            // Only proceed if we have at least one of them
            if (authorInfo || backCover) {
                // Remove them from the array
                authorChapter.verses = currentVerses.filter(v => v.id !== 'AuthorInfo' && v.id !== 'Back Cover');

                // Add Back Cover FIRST (Top)
                if (backCover) {
                    authorChapter.verses.unshift(backCover);
                }

                // Add AuthorInfo LAST (Bottom)
                if (authorInfo) {
                    authorChapter.verses.push(authorInfo);
                }

                // Mark modified if the array changed (simple check: length same, but order might change... assume true if we touched it)
                // To be precise, we can check JSON string equality, but setting modified=true is safe
                modified = true;
            }


            // --- 5. STANDARDIZE LABEL & SPACING ---
            if (authorInfo && authorInfo.text) {
                let text = authorInfo.text;
                // Standardize Label to "Author: " logic
                if (text.includes('Dr. Bikash')) {
                    const newLabel = "\n\nAuthor: ";
                    const cleanText = text.replace(/^[\s\S]*?(?=Dr\. Bikash)/, ''); // Strip known prefixes
                    const newText = newLabel + cleanText;

                    if (authorInfo.text !== newText) {
                        authorInfo.text = newText;
                        modified = true;
                    }
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Fixed ${file} `);
        }
    }
});

console.log('\nRobust Fix complete!');

