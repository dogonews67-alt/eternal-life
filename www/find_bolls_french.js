const https = require('https');

const url = 'https://bolls.life/static/bolls/app/views/languages.json';
console.log('Fetching:', url);

https.get(url, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            let foundLSG = false;

            json.forEach(l => {
                if (l.language === 'French' || l.language === 'Français') {
                    l.translations.forEach(t => {
                        if (t.full_name.includes('Segond') || t.short_name === 'LSG') {
                            console.log(`Found LSG candidate: ${t.short_name} (${t.full_name})`);
                            foundLSG = true;
                        }
                    });
                }
            });

            if (!foundLSG) {
                console.log('No Louis Segond found on BOLLS.');
                console.log('Allocating other French translations:');
                json.forEach(l => {
                    if (l.language === 'French' || l.language === 'Français') {
                        l.translations.forEach(t => {
                            console.log(`- ${t.short_name} (${t.full_name})`);
                        });
                    }
                });
            }

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
