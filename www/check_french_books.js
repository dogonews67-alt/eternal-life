const https = require('https');

const url = 'https://bible.helloao.org/api/fra_lsg/books.json';
console.log('Fetching:', url);

https.get(url, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            console.log('Response content length:', data.length);
            console.log('First 200 chars:', data.substring(0, 200));

            const json = JSON.parse(data);
            console.log('Books found:', json.books.length);
            console.log('First book:', JSON.stringify(json.books[0]));

            const jer = json.books.find(b => b.id === 'JER' || b.id === 'Jer');
            if (jer) {
                console.log('Jeremiah found:', JSON.stringify(jer));
            } else {
                console.log('Jeremiah (JER) NOT found');
            }

        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Response was probably HTML');
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
