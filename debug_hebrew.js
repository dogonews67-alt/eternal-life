const https = require('https');

const url = 'https://bolls.life/get-text/WLCa/Gen/1/';

console.log("Fetching " + url);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log("Verse 1 raw:", JSON.stringify(json[0], null, 2));
                console.log("Verse 2 raw:", JSON.stringify(json[1], null, 2));

                // Check for text content
                json.slice(0, 3).forEach(v => {
                    console.log(`[${v.verse}] ${v.text}`);
                });
            } else {
                console.log("Not an array:", json);
            }
        } catch (e) {
            console.error("Parse error:", e);
            console.log("Raw data:", data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
