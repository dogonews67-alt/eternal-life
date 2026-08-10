const fs = require('fs');
const path = require('path');

const dir = 'eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

// Comprehensive regex for combining characters across major Asian scripts
// Burmese: 102B-103E, 1056-1059, 105E-1060, 1062-1064, 1067-106D, 1071-1074, 1082-108D, 108F, 109A-109D
// Indic scripts (Hindi, Bengali, etc.): various ranges from 0900 to 0DFF
// Thai/Lao: 0E31-0E3A, 0E47-0E4E, 0EB1-0EBC, 0EC8-0ECD
// Khmer: 17B6-17D3
const badStartingChars = /[\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u0900-\u0DFF\u0E31-\u0E3A\u0E47-\u0E4E\u0EB1-\u0EBC\u0EC8-\u0ECD\u17B6-\u17D3]/;

console.log(`Auditing ${files.length} files for syllable breaks with comprehensive regex...\n`);

let totalFixes = 0;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    content.chapters.forEach(chapter => {
        if (!chapter.verses) return;
        chapter.verses.forEach(verse => {
            if (!verse.text) return;

            // Pattern: </b> followed by a combining character
            // We move the tag to AFTER the combining character(s)
            let text = verse.text;
            let original = text;

            // Regex for </b> or <b> followed by a "bad" starting character
            // Since JS regex support for lookbehind/Unicode properties varies, 
            // we'll do a simple replace in a loop or with a specific regex.

            const tagPattern = /(\u003c\/?b\u003e)([\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u0900-\u0DFF\u0E31-\u0E3A\u0E47-\u0E4E\u0EB1-\u0EBC\u0EC8-\u0ECD\u17B6-\u17D3]+)/g;

            // Fix: Move the tag AFTER the combining characters
            text = text.replace(tagPattern, (match, tag, marks) => {
                changed = true;
                totalFixes++;
                return marks + tag;
            });

            // Also check for the opposite: Combining character followed by <b> or </b>
            // Wait, combining character followed by tag is usually OK, 
            // but Tag followed by combining character IS the problem.

            if (changed) {
                verse.text = text;
            }
        });
    });

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`Fixed syllable breaks in ${file}`);
    }
});

console.log(`\nFinished. Total fixes: ${totalFixes}`);
