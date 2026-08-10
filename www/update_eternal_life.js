const fs = require('fs');
const path = require('path');
const dirs = [
    'www/eternal_life_languages',
    'platforms/android/app/src/main/assets/www/eternal_life_languages',
    'platforms/browser/www/eternal_life_languages'
];

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
    "odia.json": "ଲେଖକ",
    "oromo.json": "Barreessaa",
    "polish.json": "Autor",
    "portuguese.json": "Autor",
    "punjabi.json": "ਲੇਖਕ",
    "romanian.json": "Autor",
    "russian.json": "Автор",
    "sanskrit.json": "लेखक",
    "somali.json": "Qoraa",
    "spanish.json": "Autor",
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
    "yoruba.json": "Onkowe",
    "english.json": "Author"
};

console.log('Starting update of Eternal Life content...\n');

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found (skipping): ${dir}`);
        return;
    }
    console.log(`Processing directory: ${dir}`);

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(dir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                let modified = false;

                // --- 1. Identify Key Chapters ---
                let authorChapterIndex = -1;
                let authorInfoVerseIndex = -1;

                // Find AuthorInfo verse (Source)
                data.chapters.forEach((chap, cIndex) => {
                    const vIndex = chap.verses.findIndex(v => v.id === 'AuthorInfo');
                    if (vIndex !== -1) {
                        authorChapterIndex = cIndex;
                        authorInfoVerseIndex = vIndex;
                    }
                });

                // Find End Chapter (Target)
                let endChapterIndex = data.chapters.findIndex(c =>
                    c.pageNumber === 'End' ||
                    c.pageNumber === 'Fin' ||
                    (typeof c.pageNumber === 'string' && c.pageNumber.toLowerCase().includes('end'))
                );

                // Fallback searching by content/title if pageNumber not set
                if (endChapterIndex === -1) {
                    endChapterIndex = data.chapters.findIndex(c =>
                        c.title === 'Page End' ||
                        c.title === 'समाप्त' ||
                        c.title === 'Author' ||
                        c.title === 'Autor' ||
                        c.title === 'Lekhak' ||
                        c.title === 'Author and its detail' ||
                        (translations[file] && c.title === translations[file])
                    );
                }

                // Fallback to last chapter if still not found
                if (endChapterIndex === -1 && data.chapters.length > 0) {
                    endChapterIndex = data.chapters.length - 1;
                }


                // --- 2. Move AuthorInfo Verse ---
                if (endChapterIndex !== -1) {
                    let targetChapter = data.chapters[endChapterIndex];

                    // 2a. Move if needed
                    if (authorChapterIndex !== -1 && authorInfoVerseIndex !== -1) {
                        if (authorChapterIndex !== endChapterIndex) {
                            // Removing from old location
                            const authorVerse = data.chapters[authorChapterIndex].verses[authorInfoVerseIndex];
                            data.chapters[authorChapterIndex].verses.splice(authorInfoVerseIndex, 1);

                            // Adding to new location
                            targetChapter.verses.push(authorVerse);
                            modified = true;

                            // Update indices because we moved it
                            authorChapterIndex = endChapterIndex;
                            authorInfoVerseIndex = targetChapter.verses.length - 1;
                        }
                    }

                    // 2b. Clean "Author:" prefix from text
                    const verses = targetChapter.verses;
                    const vIndex = verses.findIndex(v => v.id === 'AuthorInfo');
                    if (vIndex !== -1) {
                        const authorVerse = verses[vIndex];
                        let oldText = authorVerse.text;
                        // Regex to remove "Author:", "Author :", "Author -" at start or after newline
                        // And also ensure we don't accidentally remove names.
                        let newText = oldText.replace(/(^|\n)(Author|Autor|Lekhak)\s*[:\-]\s*/gi, '$1');
                        if (newText !== oldText) {
                            authorVerse.text = newText.trim();
                            modified = true;
                        }
                    }
                }

                // --- 3. Update Title to Translated Version ---
                if (endChapterIndex !== -1) {
                    const endChap = data.chapters[endChapterIndex];
                    // If we have a translation for this file
                    if (translations[file]) {
                        // If title is currently different
                        if (endChap.title !== translations[file]) {
                            // Special check: if title is "Author and its detail" or generic "Page End", absolutely change it.
                            // If it is already something else (e.g. user manually changed it to something else?), we might want to be careful.
                            // But here we want to enforce the translation.
                            console.log(`Updating title for ${file}: "${endChap.title}" -> "${translations[file]}"`);
                            endChap.title = translations[file];
                            modified = true;
                        }
                    } else {
                        // Fallback logic if file not in map (should not happen for listed languages)
                        if (endChap.title === "Author and its detail" || endChap.title === "Page End") {
                            endChap.title = "Author";
                            modified = true;
                        }
                    }
                }

                if (modified) {
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                    console.log(`Updated ${file}`);
                }

            } catch (e) {
                console.error(`Error processing ${file}:`, e);
            }
        }
    });
});

console.log('\nUpdate complete!');
