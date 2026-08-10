const fs = require('fs');
const path = require('path');

const translations = {
    "arabic.json": "مُؤَلِّف",
    "assamese.json": "লেখক",
    "bengali.json": "লেখক",
    "bhutanese.json": "རྩོམ་པ་པོ",
    "burmese.json": "စာရေးဆရာ",
    "chinese.json": "作者",
    "czech.json": "Autor",
    "dutch.json": "Auteur",
    "french.json": "Auteur",
    "german.json": "Autor",
    "greek.json": "Συγγραφέας",
    "gujarati.json": "લેખક",
    "hebrew.json": "סופר",
    "hindi.json": "लेखक",
    "hungarian.json": "Szerző",
    "igbo.json": "Onye edemede",
    "indonesian.json": "Penulis",
    "italian.json": "Autore",
    "japanese.json": "著者",
    "kannada.json": "ಲೇಖಕ",
    "kashmiri.json": "مُصَنِف",
    "konkani.json": "लेखक",
    "korean.json": "저자",
    "malay.json": "Penulis",
    "malayalam.json": "രചയിതാവ്",
    "marathi.json": "लेखक",
    "mongolian.json": "Зохиогч",
    "nepali.json": "लेखक",
    "norwegian.json": "Forfatter",
    "oromo.json": "Barreessaa",
    "polish.json": "Autor",
    "portuguese.json": "Autor",
    "punjabi.json": "ਲੇਖਕ",
    "romanian.json": "Autor",
    "russian.json": "Автор",
    "sanskrit.json": "लेखक",
    "somali.json": "Qoraa",
    "swahili.json": "Mwandishi",
    "swedish.json": "Författare",
    "tagalog.json": "May-akda",
    "tamil.json": "ஆசிரியர்",
    "telugu.json": "రచయిత",
    "thai.json": "ผู้เขียน",
    "tibetan.json": "རྩོམ་པ་པོ",
    "turkish.json": "Yazar",
    "urdu.json": "مصنف",
    "vietnamese.json": "Tác giả",
    "yoruba.json": "Onkowe"
};

const dir = 'www/eternal_life_languages';

if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
}

let updatedCount = 0;

fs.readdirSync(dir).forEach(file => {
    if (translations[file]) {
        const filePath = path.join(dir, file);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const translatedTitle = translations[file];
            let modified = false;

            // Find the last chapter or the chapter with title "Author"
            // Start from the end as it is likely the last one
            for (let i = data.chapters.length - 1; i >= 0; i--) {
                const chapter = data.chapters[i];
                // Check if it is the Author page
                if (chapter.title === "Author" || chapter.title === "Author and its detail" || chapter.title === "Page End" || chapter.pageNumber === "End") {
                    if (chapter.title !== translatedTitle) {
                        console.log(`Updating ${file}: "${chapter.title}" -> "${translatedTitle}"`);
                        chapter.title = translatedTitle;
                        modified = true;
                    }
                    break; // Stop after finding the likely candidate
                }
            }

            if (modified) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                updatedCount++;
            } else {
                console.log(`No changes needed for ${file}`);
            }

        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
});

console.log(`\nUpdate complete! Modified ${updatedCount} files.`);
