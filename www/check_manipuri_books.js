const https = require('https');

const url = 'https://bible.helloao.org/api/mni_twf/books.json';
console.log('Fetching:', url);

https.get(url, (resp) => {
    let data = '';
    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Books found:', json.books.length);
            console.log('First book:', JSON.stringify(json.books[0]));

            const gen = json.books.find(b => b.id === 'GEN' || b.id === 'Gen');
            if (gen) {
                console.log('Genesis (GEN) found:', JSON.stringify(gen));
            } else {
                console.log('Genesis (GEN) NOT found');
            }

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Response was probably valid JSON but empty or error? Or HTML?');
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
