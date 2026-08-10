const https = require('https');

const languages = [
    'Bengali',
    'Gujarati',
    'Kannada',
    'Marathi',
    'Punjabi',
    'Tamil',
    'Telugu'
];

const baseUrl = 'https://raw.githubusercontent.com/GodlyTalias/Bible-Database/master/';

function checkUrl(lang, filename) {
    const url = `${baseUrl}${lang}/${filename}`;
    const req = https.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`[FOUND] ${lang}: ${filename}`);
        } else {
            // console.log(`[MISSING] ${lang}: ${filename} (${res.statusCode})`);
        }
        res.resume();
    });
}

languages.forEach(lang => {
    checkUrl(lang, 'bible.json');
    checkUrl(lang, 'Bible.json');
    checkUrl(lang, `${lang}.json`); // e.g. Bengali/Bengali.json
    checkUrl(lang, `${lang.toLowerCase()}.json`); // e.g. Bengali/bengali.json
});
