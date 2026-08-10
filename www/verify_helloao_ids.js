const https = require('https');

const missingIds = ['mni_twf', 'nag_isv', 'san_dev', 'tur_obt', 'fra_lsg']; // include fra_lsg as control

https.get('https://bible.helloao.org/api/available_translations.json', (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            const foundIds = [];
            const translations = json.translations;

            missingIds.forEach(id => {
                const t = translations.find(t => t.id === id);
                if (t) {
                    console.log(`[FOUND] ${id}: ${t.name}`);
                    foundIds.push(id);
                } else {
                    console.log(`[MISSING] ${id}`);
                }
            });

            // If missing, suggest alternatives by language search
            missingIds.filter(id => !foundIds.includes(id)).forEach(id => {
                // crude check: lang code is first 3 chars
                const langCode = id.substring(0, 3);
                console.log(`\nAlternatives for ${langCode}:`);
                translations.filter(t => t.id.startsWith(langCode)).forEach(t => {
                    console.log(`- ${t.id} (${t.name})`);
                });
            });

        } catch (e) {
            console.error(e);
        }
    });
});
