const https = require('https');

const ids = ['nag_isv', 'san_dev', 'tur_obt', 'mni_twf'];

ids.forEach(id => {
    const url = `https://bible.helloao.org/api/${id}/books.json`;
    https.get(url, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log(`\n--- ${id} ---`);
                console.log('Books found:', json.books.length);
                console.log('First book ID:', json.books[0].id);

                const gen = json.books.find(b => b.id === 'GEN');
                const mat = json.books.find(b => b.id === 'MAT');

                console.log('Genesis (GEN):', gen ? 'Found' : 'MISSING');
                console.log('Matthew (MAT):', mat ? 'Found' : 'MISSING');

            } catch (e) {
                console.error(`Error parsing JSON for ${id}:`, e.message);
            }
        });
    }).on('error', (err) => {
        console.log(`Error fetching ${id}:`, err.message);
    });
});
