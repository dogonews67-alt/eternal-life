const fs = require('fs');
const path = require('path');

const sourceFile = 'eternal_life_languages/english.json';
const targetDir = 'eternal_life_languages';

const languages = [
    'spanish', 'hebrew', 'french', 'chinese', 'arabic', 'portuguese', 'russian', 'urdu',
    'indonesian', 'german', 'greek', 'hungarian', 'norwegian', 'romanian', 'japanese',
    'korean', 'turkish', 'vietnamese', 'tagalog', 'burmese', 'mongolian', 'swedish',
    'italian', 'polish', 'czech', 'dutch', 'tibetan', 'bhutanese', 'thai', 'malay',
    'swahili', 'yoruba', 'igbo', 'oromo', 'somali'
];

try {
    const englishContent = fs.readFileSync(sourceFile, 'utf8');
    const englishData = JSON.parse(englishContent);

    languages.forEach(lang => {
        const targetPath = path.join(targetDir, `${lang}.json`);
        // We just copy the English content exactly as a placeholder
        fs.writeFileSync(targetPath, JSON.stringify(englishData, null, 2));
        console.log(`Created ${targetPath}`);
    });

    console.log(`Successfully created ${languages.length} language files.`);
} catch (err) {
    console.error('Error creating language files:', err);
}
