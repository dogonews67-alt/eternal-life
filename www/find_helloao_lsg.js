const https = require('https');

https.get('https://bible.helloao.org/api/available_translations.json', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            const lsg = json.translations.filter(t =>
                (t.name && t.name.toLowerCase().includes('segond')) ||
                (t.englishName && t.englishName.toLowerCase().includes('segond')) ||
                (t.id && t.id.toLowerCase().includes('l')) // look for similar IDs
            );

            console.log('Translations matching "Segond":');
            const real_lsg = lsg.filter(t => t.name.toLowerCase().includes('segond') || t.englishName.toLowerCase().includes('segond'));

            real_lsg.forEach(t => {
                console.log(`- ${t.id} (${t.name})`);
            });

            // Specifically check for 'fra_lsg' existence
            const fra_lsg = json.translations.find(t => t.id === 'fra_lsg');
            if (fra_lsg) {
                console.log('\nfra_lsg exists in the list.');
                console.log('Data:', JSON.stringify(fra_lsg));
            } else {
                console.log('\nfra_lsg does NOT exist in the list.');
            }

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
