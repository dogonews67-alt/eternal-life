const fs = require('fs');
const path = require('path');
const dir = 'eternal_life_languages';

let output = "File | Page 12 Title | Page 12 Content ID | Page 13 Title | Page 13 Content ID\n";
output += "---|---|---|---|---\n";

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const p12 = data.chapters[11];
        const p13 = data.chapters[12];

        let p12Title = p12 ? p12.title : "MISSING";
        let p12Content = p12 && p12.verses[0] ? p12.verses[0].id : "EMPTY";
        let p13Title = p13 ? p13.title : "MISSING";
        let p13Content = p13 && p13.verses[0] ? p13.verses[0].id : "EMPTY";

        output += `${file} | ${p12Title} | ${p12Content} | ${p13Title} | ${p13Content}\n`;
    }
});

fs.writeFileSync('page_analysis.csv', output);
console.log("Analysis complete.");
