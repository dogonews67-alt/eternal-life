const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

const englishBio = "Ministering in South Asia region with the Digital and Audio Scriptures.";

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        const authorChapter = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorChapter) {
            const authorInfo = authorChapter.verses.find(v => v.id === 'AuthorInfo');
            if (authorInfo) {
                const lines = authorInfo.text.split('\n');
                let whatsappIndex = -1;

                // Find WhatsApp line
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('WhatsApp') || lines[i].includes('+919178846554')) {
                        whatsappIndex = i;
                        break;
                    }
                }

                if (whatsappIndex !== -1) {
                    // Keep lines up to and including WhatsApp
                    const keptLines = lines.slice(0, whatsappIndex + 1);
                    // Append English Bio
                    keptLines.push(englishBio);

                    const newText = keptLines.join('\n');

                    if (newText !== authorInfo.text) {
                        authorInfo.text = newText;
                        modified = true;
                    }
                } else {
                    console.warn(`WhatsApp line not found in ${file}. Skipping bio update.`);
                    // Fallback: If no WhatsApp, maybe look for Email? Or just append if missing?
                    // Safe to skip to avoid breaking structure if format is unexpected.
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Updated Bio to English in ${file}`);
        }
    }
});
