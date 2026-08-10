const fs = require('fs');
try {
    const raw = fs.readFileSync('helloao_available_translations.json', 'utf8');
    const data = JSON.parse(raw);
    const targets = ['bhutan', 'dzo', 'kas', 'knn', 'konk', 'kashm'];
    console.log('Searching for targets:', targets);
    const translations = data.translations || data; // Handle potential wrapping
    const results = translations.filter(t => {
        const s = JSON.stringify(t).toLowerCase();
        return targets.some(target => s.includes(target));
    });
    results.forEach(t => {
        console.log(`${t.id}: ${t.name || t.englishName} (${t.languageEnglishName || t.language})`);
    });
    if (results.length === 0) console.log('No results found.');
} catch (e) {
    console.error(e);
}
