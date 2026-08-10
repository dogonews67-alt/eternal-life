// DIAGNOSTIC: Run this in browser console to see verse parsing in action
// Open browser (F12), go to Console tab, paste this entire code and press Enter

console.log("=".repeat(60));
console.log("ODIA BIBLE VERSE NUMBERING DIAGNOSTIC");
console.log("=".repeat(60));

// Check if transformGodlyTaliasData exists
if (typeof transformGodlyTaliasData === 'function') {
    console.log("✅ transformGodlyTaliasData function found");

    // Get the function as string to check if our fix is present
    const funcStr = transformGodlyTaliasData.toString();

    if (funcStr.includes('rawId % 1000')) {
        console.log("✅ Verse number fix IS PRESENT in code");
    } else {
        console.log("❌ Verse number fix NOT FOUND - old code still loaded!");
        console.log("👉 Please hard refresh: Ctrl+Shift+R");
    }
} else {
    console.log("❌ transformGodlyTaliasData not found");
}

// Check current Bible data
console.log("\n" + "=".repeat(60));
console.log("CHECKING CURRENT BIBLE DATA");
console.log("=".repeat(60));

if (typeof books !== 'undefined' && books.bible && books.bible.chapters) {
    console.log(`Total chapters loaded: ${books.bible.chapters.length}`);

    // Check first 3 chapters
    for (let i = 0; i < Math.min(3, books.bible.chapters.length); i++) {
        const chapter = books.bible.chapters[i];
        console.log(`\nChapter ${i + 1}: ${chapter.title}`);
        console.log(`  Verses: ${chapter.verses.length}`);

        // Show first 3 verse IDs
        for (let v = 0; v < Math.min(3, chapter.verses.length); v++) {
            const verse = chapter.verses[v];
            console.log(`    ${verse.id} = "${verse.text.substring(0, 30)}..."`);
        }
    }
} else {
    console.log("⚠️ No Bible data loaded yet");
}

// Check cache
console.log("\n" + "=".repeat(60));
console.log("CHECKING CACHE");
console.log("=".repeat(60));

// Check localStorage
const lsKeys = Object.keys(localStorage).filter(k => k.includes('bible') || k.includes('text_'));
console.log(`localStorage Bible keys: ${lsKeys.length}`);
lsKeys.forEach(k => console.log(`  - ${k}`));

// Check IndexedDB
indexedDB.databases().then(dbs => {
    console.log(`\nIndexedDB databases:`);
    dbs.forEach(db => console.log(`  - ${db.name} (version ${db.version})`));
}).catch(() => {
    console.log(`\nIndexedDB check not supported in this browser`);
});

console.log("\n" + "=".repeat(60));
console.log("RECOMMENDED ACTIONS:");
console.log("=".repeat(60));
console.log("1. If fix NOT PRESENT: Hard refresh (Ctrl+Shift+R)");
console.log("2. If fix IS PRESENT but wrong numbers: Clear cache");
console.log("   - Use Settings → Clear Bible Cache button");
console.log("   - OR run: indexedDB.deleteDatabase('BibleReaderDB'); location.reload();");
console.log("=".repeat(60));
