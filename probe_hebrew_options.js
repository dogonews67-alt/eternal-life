const https = require('https');

const sources = ['WLC', 'WLCC', 'DHNT'];

sources.forEach(id => {
    const url = `https://bolls.life/get-text/${id}/Gen/1/`;
    https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`\n--- ${id} ---`);
                if (Array.isArray(json)) {
                    console.log(json[0].text);
                } else {
                    console.log("Invalid format:", json);
                }
            } catch (e) { console.log(`Error ${id}:`, e.message); }
        });
    });
});
