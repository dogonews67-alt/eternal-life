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
    "kashmiri.json": "ल्यॊखनावालॖ",
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

        // Find Chapter with AuthorInfo
        const authorChapter = data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo'));

        if (authorChapter) {
            const currentTitle = authorChapter.title;
            const translation = authorTranslations[file] || "Author";

            // Replace "Author" with Translation (Case insensitive catch?)
            // If title is just "Author", replace.
            // If title is "Page 13: Author", replace "Author" part.

            // Regex to replace 'Author' word but preserve surrounding if distinct?
            // Simple replace is safer if we target the English word "Author".

            if (currentTitle.includes('Author')) {
                authorChapter.title = currentTitle.replace('Author', translation);
                modified = true;
            } else if (currentTitle === 'Author') {
                authorChapter.title = translation;
                modified = true;
            } else {
                // Check if it's already translated or different?
                // Some might be "Page 13: Authors" or lowercase.
                // Leave as is if "Author" not found, implies it might be correct or using local word already (e.g. czech "autor").
                // If I want to enforce Title Case for "autor" -> "Autor":
                if (authorTranslations[file] && currentTitle.toLowerCase().includes(authorTranslations[file].toLowerCase())) {
                    // Already has local word. Check capitalization?
                    // Optional.
                }
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Translated Title in ${file}: ${data.chapters.find(c => c.verses.some(v => v.id === 'AuthorInfo')).title}`);
        }
    }
});
