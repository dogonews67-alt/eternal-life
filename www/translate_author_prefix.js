const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

const authorTranslations = {
    "arabic.json": "المؤلف",
    "assamese.json": "লেখক",
    "bengali.json": "লেখক",
    "bhutanese.json": "རྩོམ་པ་པོ།",
    "burmese.json": "စာရေးဆရာ",
    "chinese.json": "作者",
    "czech.json": "Autor",
    "dutch.json": "Auteur",
    "english.json": "Author",
    "french.json": "Auteur",
    "german.json": "Autor",
    "greek.json": "Συγγραφέας",
    "gujarati.json": "લેખક",
    "hebrew.json": "מחבר",
    "hindi.json": "लेखक",
    "hungarian.json": "Szerző",
    "igbo.json": "Odee",
    "indonesian.json": "Penulis",
    "italian.json": "Autore",
    "japanese.json": "著者",
    "kannada.json": "ಲೇಖಕ",
    "kashmiri.json": "ल्यॊखनावालॖ", // Using from previous file analysis or closest approximation
    "konkani.json": "लेखक",
    "korean.json": "저자",
    "malay.json": "Penulis",
    "malayalam.json": "എഴുത്തുകാരൻ",
    "marathi.json": "लेखक",
    "mongolian.json": "Зохиолч",
    "nepali.json": "लेखक",
    "norwegian.json": "Forfatter",
    "odia.json": "ଲେଖକ",
    "oromo.json": "Barreessaa",
    "polish.json": "Autor",
    "portuguese.json": "Autor",
    "punjabi.json": "ਲੇਖਕ",
    "romanian.json": "Autor",
    "russian.json": "Автор",
    "sanskrit.json": "लेखकः",
    "somali.json": "Qoraa",
    "spanish.json": "Autor",
    "swahili.json": "Mwandishi",
    "swedish.json": "Författare",
    "tagalog.json": "May-akda",
    "tamil.json": "ஆசிரியர்",
    "telugu.json": "రచయిత",
    "thai.json": "ผู้เขียน",
    "tibetan.json": "རྩོམ་པ་པོ།",
    "turkish.json": "Yazar",
    "urdu.json": "مصنف",
    "vietnamese.json": "Tác giả",
    "yoruba.json": "Onkewe"
};

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;

        const authorChapter = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorChapter) {
            const authorInfo = authorChapter.verses.find(v => v.id === 'AuthorInfo');
            if (authorInfo) {
                // Check if currently starts with 'Author:'
                // Or if it was already translated? 
                // The current state is "Author: Dr. Bikash..." (except maybe English is OK).
                // I will replace "Author:" with "Translation:"

                // Regex to match "Author" with optional whitespace and colon
                // Note: I should be careful not to replace it if it's already translated.
                // But since I standardized it to English in Step 227 (update_author.js), it should be English "Author:".

                if (authorInfo.text.startsWith('Author:')) {
                    const translation = authorTranslations[file] || "Author";
                    authorInfo.text = authorInfo.text.replace('Author:', `${translation}:`);
                    modified = true;
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Translated 'Author:' in ${file}`);
        }
    }
});
