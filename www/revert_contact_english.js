const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        const authorChapter = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorChapter) {
            const authorInfo = authorChapter.verses.find(v => v.id === 'AuthorInfo');
            if (authorInfo) {
                let lines = authorInfo.text.split('\n');
                let newLines = lines.map(line => {
                    if (line.includes('bikashrd@gmail.com')) {
                        // Replace everything before the email with "Email – " or similar?
                        // Providing exact standard format: "Email – bikashrd@gmail.com" (using hyphen or en-dash as preferred? Arabic had en-dash.)
                        // Let's use hyphen for standard english: "Email - ..." or "Email – ..."
                        // The original english.json likely had "Email – bikashrd@gmail.com" (en-dash from the summary in Step 326: 'Email – bikashrd@gmail.com')
                        return `Email – bikashrd@gmail.com`;
                    }
                    if (line.includes('+919178846554')) {
                        // Replace everything before number with "WhatsApp - "
                        return `WhatsApp - +919178846554`;
                    }
                    return line;
                });

                const newText = newLines.join('\n');
                if (newText !== authorInfo.text) {
                    authorInfo.text = newText;
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Reverted Email/WhatsApp to English in ${file}`);
        }
    }
});
