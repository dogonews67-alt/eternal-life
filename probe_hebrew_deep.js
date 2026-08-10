const https = require('https');

const sources = [
    { type: 'BOLLS', id: 'WLC', url: 'https://bolls.life/get-text/WLC/Gen/1/' },
    { type: 'BOLLS', id: 'WLCa', url: 'https://bolls.life/get-text/WLCa/Gen/1/' },
    { type: 'BOLLS', id: 'WLCC', url: 'https://bolls.life/get-text/WLCC/Gen/1/' },
    { type: 'BOLLS', id: 'HAC', url: 'https://bolls.life/get-text/HAC/Gen/1/' },
    { type: 'GETBIBLE', id: 'wlc', url: 'https://api.getbible.net/v2/wlc/1/1.json' } // Hebrew Genesis 1
];

function checkSource(source) {
    https.get(source.url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`\n\n=== ${source.type} ${source.id} ===`);
            try {
                const json = JSON.parse(data);
                let text = '';

                if (source.type === 'BOLLS') {
                    if (Array.isArray(json) && json.length > 0) text = json[0].text;
                } else {
                    // GetBible V2 structure
                    if (json.verses && json.verses.length > 0) text = json.verses[0].text;
                }

                console.log(`Text Sample: ${text.substring(0, 100)}...`);

                // Check for Numbers (digits)
                const numbers = text.match(/\d+/g);
                if (numbers) {
                    console.log(`⚠️  CONTAINS NUMBERS: ${numbers.join(', ')}`);
                } else {
                    console.log(`✅  CLEAN (No digits)`);
                }

                // Check for HTML tags
                if (text.includes('<')) {
                    console.log(`⚠️  CONTAINS TAGS`);
                }

            } catch (e) { console.log(`Error parsing: ${e.message}`); }
        });
    }).on('error', e => console.log(`Req Error: ${e.message}`));
}

sources.forEach(s => checkSource(s));
