const fs = require('fs');
const path = require('path');

const dir = 'www/eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log('Checking for missing Page 10...');

files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const page10 = content.chapters.find(c => c.pageNumber === 10);

    if (!page10) {
        console.log(`[MISSING] ${file}`);
    } else {
        // console.log(`[OK] ${file}`);
    }
});
