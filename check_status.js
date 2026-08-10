const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/GRESON/myapp/www/eternal_life_languages';
const files = fs.readdirSync(dir);

console.log('Checking Para 12 in all files...');

files.forEach(file => {
    if (!file.endsWith('.json')) return;
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
        const json = JSON.parse(content);
        let para12 = '';

        // Find Para 12
        for (const chapter of json.chapters) {
            for (const verse of chapter.verses) {
                if (verse.id === 'Para 12') {
                    para12 = verse.text;
                    break;
                }
            }
            if (para12) break;
        }

        if (!para12) {
            console.log(`${file}: Para 12 NOT FOUND`);
        } else {
            const hasEllipsis = para12.includes('...') || para12.includes('…');
            const length = para12.length;
            // Check for English specific typo if file is english
            if (file === 'english.json') {
                console.log(`ENGLISH: ${para12}`);
            }
            console.log(`${file}: Length=${length}, Ellipsis=${hasEllipsis}`);
        }

    } catch (e) {
        console.error(`Error parsing ${file}: ${e.message}`);
    }
});
