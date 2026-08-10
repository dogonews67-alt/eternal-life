const https = require('https');

const url = 'https://api.github.com/repos/GodlyTalias/Bible-Database/contents/';

const options = {
    headers: {
        'User-Agent': 'Node.js Script'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log("Root files:");
                json.forEach(file => {
                    console.log(`${file.name} (${file.type})`);
                });
            } else {
                console.log("Response was not an array:", json);
            }
        } catch (e) {
            console.log("Error parsing JSON:", e.message);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
