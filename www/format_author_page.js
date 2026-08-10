const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        // Find Author Chapter (should be index 12 or by verses containing 'AuthorInfo')
        const authorContent = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorContent) {
            const blessing = authorContent.verses.find(v => v.id === 'Blessing');
            const authorInfo = authorContent.verses.find(v => v.id === 'AuthorInfo');

            if (blessing) {
                // Ensure Blessing ends with \n\n
                if (!blessing.text.endsWith('\n\n')) {
                    // Strip existing trailing spaces/newlines and add double newline
                    blessing.text = blessing.text.trim() + '\n\n';
                    modified = true;
                }
            }

            if (authorInfo) {
                // Ensure AuthorInfo starts with \n (optional but good for safety)
                // Actually, if Blessing has \n\n, that's 2 breaks.
                // If AuthorInfo has \n prefix, that's 3 breaks?
                // <br><br>Author... -> 
                // Line 1 (Blessing)
                // <br> (Empty Line)
                // <br> (Start of next line) Author...
                // That's 1 empty line separation.
                // If I add prefix to AuthorInfo, it might add more.
                // Let's stick to appending to Blessing first.
                // BUT, to be safe, I'll ensure AuthorInfo clean start.
                // Let's just create a strong separation.

                // Also, let's make sure AuthorInfo itself has proper inner formatting (it does from previous steps).
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Updated formatting for ${file}`);
        }
    }
});
