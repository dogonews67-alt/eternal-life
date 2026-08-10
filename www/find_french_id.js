const https = require('https');

https.get('https://bible.helloao.org/api/available_translations.json', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.translations) {
                console.log("No translations found");
                return;
            }

            const french = json.translations.filter(t => {
                const langName = t.languageName ? t.languageName.toLowerCase() : '';
                const name = t.name ? t.name.toLowerCase() : '';
                const engName = t.englishName ? t.englishName.toLowerCase() : '';
                const id = t.id ? t.id.toLowerCase() : '';

                return langName.includes('french') || name.includes('french') || engName.includes('french') || id.includes('fra');
            });

            console.log('French Translation IDs found:');
            french.forEach(t => console.log(`- ${t.id} (${t.name})`));

            const fra_lsg_exists = json.translations.some(t => t.id === 'fra_lsg');
            console.log(`\nDoes 'fra_lsg' exist in the list? ${fra_lsg_exists}`);

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
