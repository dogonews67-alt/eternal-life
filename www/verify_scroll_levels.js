const fs = require('fs');

const levelsFile = 'c:/Users/GRESON/myapp/www/scroll_restorer_assets/scroll_levels.json';

try {
    const data = fs.readFileSync(levelsFile, 'utf8');
    const json = JSON.parse(data);
    const levels = json.levels;
    let errors = 0;

    levels.forEach(level => {
        const grid = {}; // Map "x,y" to char

        level.words.forEach(wordObj => {
            const word = wordObj.word;
            const startX = wordObj.startX;
            const startY = wordObj.startY;
            const isAcross = wordObj.orientation === 'across';

            for (let i = 0; i < word.length; i++) {
                const x = isAcross ? startX + i : startX;
                const y = isAcross ? startY : startY + i;
                const key = `${x},${y}`;
                const char = word[i];

                if (grid[key]) {
                    if (grid[key] !== char) {
                        console.error(`Conflict in Level ${level.id} (${level.title}):`);
                        console.error(`  Location (${x}, ${y}) has '${grid[key]}' but '${word}' wants to place '${char}'`);
                        errors++;
                    }
                } else {
                    grid[key] = char;
                }
            }
        });
    });

    if (errors === 0) {
        console.log("All levels verified successfully! No intersection conflicts found.");
    } else {
        console.error(`Found ${errors} errors.`);
        process.exit(1);
    }

} catch (e) {
    console.error("Error verifying levels:", e);
    process.exit(1);
}
