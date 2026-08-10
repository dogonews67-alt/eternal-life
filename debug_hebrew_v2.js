const https = require('https');

const url = 'https://bolls.life/get-text/WLC/Gen/1/';

console.log("Fetching " + url);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                // Check for text content
                json.slice(0, 3).forEach(v => {
                    console.log(`[${v.verse}] ${v.text}`);
                });
            } else {
                console.log("Not an array:", json);
            }
        } catch (e) {
            console.error("Parse error:", e);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
