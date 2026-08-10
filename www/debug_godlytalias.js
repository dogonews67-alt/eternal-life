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

const baseUrl = 'https://raw.githubusercontent.com/GodlyTalias/Bible-Database/master/Global%20Bibles/';

function checkUrl(lang) {
    const filename = `${lang}.json`;
    const url = baseUrl + filename; // Try exact match from config
    // Also try filename encoded just in case, though verified script did that.

    // Also try "Bible" prefix or lowercase? No, GodlyTalias usually uses capitalized names.
    // Let's just check if the URL returns 200 or 404.

    const req = https.get(url, (res) => {
        console.log(`${lang}: ${res.statusCode} (${url})`);
        if (res.statusCode !== 200) {
            // Try explicit encoded space if it were "Global Bibles" (it is)
            // The issue might be the language name itself.
        }
        res.resume();
    });
}

languages.forEach(lang => checkUrl(lang));
