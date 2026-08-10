const fs = require('fs');
const path = require('path');

const bibleTerms = {
    'text_arabic': "الكتاب المقدس",
    'text_assamese': "পবিত্ৰ বাইবেল",
    'text_bengali': "পবিত্র বাইবেল",
    'text_bhutanese': "དམ་པའི་གསུང་རབ",
    'text_burmese': "သမ္မာကျမ်း",
    'text_chinese': "圣经",
    'text_czech': "Svatá Bible",
    'text_dutch': "De Bijbel",
    'text_french': "La Sainte Bible",
    'text_german': "Die Bibel",
    'text_greek': "Η Αγία Γราφή",
    'text_gujarati': "પવિત્ર બાઈબલ",
    'text_hebrew': "כתবি הקודש",
    'text_hindi': "पवित्र बाइबल",
    'text_hungarian': "Szent Biblia",
    'text_igbo': "Bible Nso",
    'text_indonesian': "Alkitab",
    'text_italian': "La Sacra Bibbia",
    'text_japanese': "聖書",
    'text_kannada': "ಸತ್ಯವೇದ",
    'text_kashmiri': "مقدس کتاب",
    'text_konkani': "पवित्र पुस्तक",
    'text_korean': "성경",
    'text_malay': "Alkitab",
    'text_malayalam': "ബൈബിൾ",
    'text_marathi': "पवित्र शास्त्र",
    'text_mongolian': "Ариун Библи",
    'text_nepali': "पवित्र बाइबल",
    'text_norwegian': "Bibelen",
    'text_odia': "ବାଇବଲ",
    'text_oromo': "Kitaaba Qulqulluu",
    'text_polish': "Pismo Święte",
    'text_portuguese': "Bíblia Sagrada",
    'text_punjabi': "ਪਵਿੱਤਰ ਬਾਈਬਲ",
    'text_romanian': "Biblia",
    'text_russian': "Библия",
    'text_sanskrit': "पवित्र बाइबिल",
    'text_somali': "Kitaabka Quduuska Ah",
    'text_spanish': "Santa Biblia",
    'text_swahili': "Biblia Takatifu",
    'text_swedish': "Bibeln",
    'text_tagalog': "Ang Biblia",
    'text_tamil': "வேதாகமம்",
    'text_telugu': "బైబిల్",
    'text_thai': "พระคัมภีร์",
    'text_tibetan': "དམ་པའི་གསུང་རབ",
    'text_turkish': "Kutsal Kitap",
    'text_urdu': "کتاب مقدس",
    'text_vietnamese': "Kinh Thánh",
    'text_yoruba': "Bibeli Mimo"
};

const languagesDir = './eternal_life_languages';
const files = fs.readdirSync(languagesDir).filter(f => f.endsWith('.json') && f !== 'english.json');

let totalModified = 0;

files.forEach(file => {
    const filePath = path.join(languagesDir, file);
    const langKey = 'text_' + file.replace('.json', '');
    const bibleTerm = bibleTerms[langKey];

    if (!bibleTerm) {
        console.log(`[SKIP] No Bible term for ${file}`);
        return;
    }

    let changed = false;
    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`[ERROR] Parsing ${file}:`, e);
        return;
    }

    data.chapters.forEach(chapter => {
        if (chapter.verses) {
            chapter.verses.forEach(verse => {
                if (verse.id === 'Para 13') {
                    let text = verse.text.trim();

                    // Only prefix if it doesn't already start with the term
                    // We check first 10 characters to see if the term is present
                    const startCheck = text.substring(0, bibleTerm.length + 5);
                    if (!startCheck.includes(bibleTerm)) {
                        // Remove leading symbols or lowercase "is not" placeholders
                        // handle Spanish "no es", etc. 
                        // Actually prepending is safest unless it's already there.

                        // Clean up leading punctuation or ellipses
                        text = text.replace(/^[…\.\s]+/, '');

                        verse.text = bibleTerm + " " + text;
                        changed = true;
                    }
                }
            });
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[FIXED] ${file}`);
        totalModified++;
    }
});

console.log(`\nStandardization complete. Modified ${totalModified} files.`);
