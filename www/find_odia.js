const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('c:/Users/GRESON/myapp/www/helloao_available_translations.json', 'utf8'));
    // data.translations is the array
    const list = data.translations || [];
    const matches = list.filter(t =>
        (t.languageName && (t.languageName.toLowerCase().includes('odia') || t.languageName.toLowerCase().includes('oriya'))) ||
        (t.englishName && (t.englishName.toLowerCase().includes('odia') || t.englishName.toLowerCase().includes('oriya'))) ||
        (t.language && (t.language.toLowerCase() === 'ori' || t.language.toLowerCase() === 'ory'))
    );
    console.log(JSON.stringify(matches, null, 2));
} catch (e) {
    console.error(e);
}
