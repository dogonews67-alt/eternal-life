const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/GRESON/myapp/www/eternal_life_languages';
const files = fs.readdirSync(dir);

console.log('Checking Para 12 for "40" and ellipsis...');

const missingContent = [];
const hasEllipsis = [];

files.forEach(file => {
    if (!file.endsWith('.json')) return;
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
        const json = JSON.parse(content);
        let para12 = '';

        for (const chapter of json.chapters) {
            for (const verse of chapter.verses) {
                if (verse.id === 'Para 12') {
                    para12 = verse.text;
                    break;
                }
            }
            if (para12) break;
        }

        if (para12) {
            // Check for '40' (representing 40th day)
            // Some languages might use different numerals, but most in this set likely use arabic numerals for 40.
            // If strictly missing, we flag it.
            if (!para12.includes('40')) {
                missingContent.push(file);
            }

            // Check for ellipsis
            if (para12.match(/\.\.\.|…/)) {
                hasEllipsis.push({ file, text: para12 });
            }
        }

    } catch (e) {
        console.error(`Error parsing ${file}: ${e.message}`);
    }
});

console.log('Files potentially missing "40th day" content:', missingContent);
console.log('Files with ellipsis:', hasEllipsis.map(x => x.file));
