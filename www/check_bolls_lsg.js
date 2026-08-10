const https = require('https');

const url = 'https://bolls.life/get-text/LSG/GEN/1/';
console.log('Fetching:', url);

https.get(url, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response length:', data.length);
            if (json.length > 0) {
                console.log('First verse:', JSON.stringify(json[0]));
                console.log('LSG is available on BOLLS');
            } else {
                console.log('LSG returned empty array');
            }

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Response content:', data.substring(0, 200));
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
