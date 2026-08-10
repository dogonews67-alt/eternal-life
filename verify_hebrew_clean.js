const fs = require('fs');

// Mock data with Strong's numbers
const rawData = [
    { verse: 1, text: "בְּרֵאשִׁ֖ית<S>7225</S> בָּרָ֣א<S>1254</S> אֱלֹהִ֑ים<S>430</S>" },
    { verse: 2, text: "Clean Text Example" }
];

// Verify the regex logic intended for api.js
// Since we can't easily import api.js (it has browser dependencies), we replicate the logic to verify correctness.

function processData(data) {
    if (Array.isArray(data)) {
        return data.map(item => {
            if (item.text && typeof item.text === 'string') {
                // Remove <S>...</S> tags
                item.text = item.text.replace(/<S>\d+<\/S>/g, '');
            }
            return item;
        });
    }
    return data;
}

const processed = processData(JSON.parse(JSON.stringify(rawData)));

console.log("Original Verse 1:", rawData[0].text);
console.log("Processed Verse 1:", processed[0].text);

if (processed[0].text === "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים") {
    console.log("PASS: Strong's numbers removed.");
} else {
    console.log("FAIL: Strong's numbers NOT removed correctly.");
}
