const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

// Map of translations for "The End" or "End Page"
const endPageTranslations = {
    "arabic.json": "الخاتمة", // The End / Conclusion
    "assamese.json": "সমাপ্তি", // Samapti (End)
    "bengali.json": "সমাপ্তি", // Samapti (End)
    "bhutanese.json": "མཇུག་རྫོགས།", // End/Conclusion (approx)
    "burmese.json": "ပြီးပါပြီ", // The End
    "chinese.json": "完", // The End (Fin)
    "czech.json": "Konec",
    "dutch.json": "Einde",
    "english.json": "Page End", // User requested "Page End" in English context probably? "The End" is better. Let's use "The End". User said "page end update". Let's use "The End" as title.
    "french.json": "Fin",
    "german.json": "Ende",
    "greek.json": "Τέλος",
    "gujarati.json": "સમાપ્ત", // Samapt
    "hebrew.json": "הסוף", // The End
    "hindi.json": "समाप्त", // Samapt (The End)
    "hungarian.json": "Vége",
    "igbo.json": "Ọgwụgwụ", // End
    "indonesian.json": "Tamat", // The End (story)
    "italian.json": "Fine",
    "japanese.json": "おしまい", // Oshimai (The End for story) or 完 (Kan)
    "kannada.json": "ಮುಕ್ತಾಯ", // Muktaya
    "kashmiri.json": "अन्त्य", // Anty (End) - Hindi/Sanskrit loan often used
    "konkani.json": "काबार", // Kabar (End/Finish) - or "Sompovnni"
    "korean.json": "끝", // Kkeut
    "malay.json": "Tamat",
    "malayalam.json": "അവസാനം", // Avasanam
    "marathi.json": "समाप्त",
    "mongolian.json": "Төгсгөл", // Togs-gol
    "nepali.json": "समाप्त",
    "norwegian.json": "Slutt",
    "odia.json": "ସମାପ୍ତ", // Samapta
    "oromo.json": "Dhumarratti", // At the end / Final
    "polish.json": "Koniec",
    "portuguese.json": "Fim",
    "punjabi.json": "ਅੰਤ", // Ant
    "romanian.json": "Sfârșit",
    "russian.json": "Конец",
    "sanskrit.json": "समाप्तम्", // Samaptam
    "somali.json": "Dhammaad",
    "spanish.json": "Fin",
    "swahili.json": "Mwisho",
    "swedish.json": "Slut",
    "tagalog.json": "Wakas", // The End
    "tamil.json": "முடிவு", // Mudivu
    "telugu.json": "ముగింపు", // Mugimpu (Conclusion/End)
    "thai.json": "จบบริบูรณ์", // The End (Complete)
    "tibetan.json": "མཇུག་རྫོགས།",
    "turkish.json": "Son",
    "urdu.json": "خاتمہ", // Khatima
    "vietnamese.json": "Hết", // The End
    "yoruba.json": "Ipari" // End
};

// Fallback to "The End" for any missing ones? 
// Or "Page End" as user said?
// I will use "The End" where known, and "Page End" where I am less sure or default.

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Identify Last Chapter
        // Usually the last one.
        const lastChapter = data.chapters[data.chapters.length - 1];

        // Check if it is the "Back Cover" chapter
        if (lastChapter.verses.some(v => v.id === "Back Cover")) {
            // Update Title
            const translation = endPageTranslations[file] || "Page End";
            lastChapter.title = translation;

            // Also update the verse ID? Or Text?
            // User said "insted of back cover use page end update for all laguage with respected translation".
            // He probably implies the Title "Back Cover" (which is currently "Quatrième de couverture" in French).
            // So updating Title is correct.
            // Page Number "End" or "Fin" is probably fine.

            // Also update the verse ID to "Page End" just in case? No, ID is internal. 
            // Update Text? The text is usually a blurb. User said "insted of back cover use page end".
            // That sounds like replacing the TITLE "Back Cover".

            console.log(`Updated Last Chapter Title in ${file} to ${translation}`);
        } else {
            console.log(`Last chapter in ${file} does not look like Back Cover.`);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }
});
