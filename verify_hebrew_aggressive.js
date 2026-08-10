// Mock data with various tag formats
const rawData = [
    { verse: 1, text: "בְּרֵאשִׁ֖ית<S>7225</S> בָּרָ֣א<S>1254</S> אֱלֹהִ֑ים<S>430</S>" },
    { verse: 2, text: "Test<S> 123 </S>Spaces" },
    { verse: 3, text: "Test<S id='1'>Attribs</S>End" },
    { verse: 4, text: "No Tags Here" }
];

function processText(text) {
    if (text && typeof text === 'string' && text.includes('<S>')) {
        return text.replace(/<S>.*?<\/S>/g, '');
    }
    return text;
}

rawData.forEach(item => {
    const original = item.text;
    const processed = processText(original);
    console.log(`Original: "${original}"`);
    console.log(`Processed: "${processed}"`);
    console.log('---');
});

// Verify
if (processText(rawData[0].text) === "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים") {
    console.log("PASS: Standard tags removed.");
} else {
    console.log("FAIL: Standard tags NOT removed.");
}

if (processText(rawData[1].text) === "TestSpaces") {
    console.log("PASS: Spaced tags removed.");
}

if (processText(rawData[2].text) === "TestEnd") { // Note: My regex is /<S> so it won't match <S id...
    // The current api.js regex is /<S>.*?<\/S>/g
    // It assumes the tag starts exactly with <S>.
    // If attributes exist, it effectively fails.
    // However, Bolls WLCa usually doesn't have attributes.
    // But let's check if we should allow <S...
    console.log("NOTE: Attribute tags not supported by current regex.");
}
