const fs = require('fs');

const burmeseFile = 'eternal_life_languages/burmese.json';
const englishFile = 'eternal_life_languages/english.json';

const burmese = JSON.parse(fs.readFileSync(burmeseFile, 'utf8'));
const english = JSON.parse(fs.readFileSync(englishFile, 'utf8'));

console.log("--- BURMESE TRANSLATION AUDIT ---\n");

// 1. Structure Check
console.log("1. Checking Structure vs English...");
english.chapters.forEach((eChap, i) => {
    const bChap = burmese.chapters[i];
    if (!bChap) {
        console.log(`[ERROR] Chapter ${i} missing in Burmese`);
        return;
    }

    if (eChap.pageNumber !== bChap.pageNumber) {
        console.log(`[WARN] Page number mismatch at chapter ${i}: English=${eChap.pageNumber}, Burmese=${bChap.pageNumber}`);
    }

    const eVerses = eChap.verses || [];
    const bVerses = bChap.verses || [];

    if (eVerses.length !== bVerses.length) {
        console.log(`[WARN] Verse count mismatch at chapter ${i} (Page ${bChap.pageNumber}): English=${eVerses.length}, Burmese=${bVerses.length}`);

        // Find missing/extra IDs
        const eIds = eVerses.map(v => v.id);
        const bIds = bVerses.map(v => v.id);

        eIds.forEach(id => {
            if (!bIds.includes(id)) console.log(`  - [MISSING ID] ${id}`);
        });
        bIds.forEach(id => {
            if (!eIds.includes(id)) console.log(`  - [EXTRA ID] ${id}`);
        });
    }
});

// 2. Tag Integrity Check
console.log("\n2. Checking HTML Tag Integrity...");
burmese.chapters.forEach((chap, i) => {
    (chap.verses || []).forEach(verse => {
        const text = verse.text || "";
        const openCount = (text.match(/<b>/g) || []).length;
        const closeCount = (text.match(/<\/b>/g) || []).length;

        if (openCount !== closeCount) {
            console.log(`[ERROR] Unbalanced bold tags in ${verse.id} (Page ${chap.pageNumber}): <b>=${openCount}, </b>=${closeCount}`);
            console.log(`  Text: ${text}`);
        }

        // Check for nested tags (rare but possible error)
        if (text.includes("<b><b>") || text.includes("</b></b>")) {
            console.log(`[WARN] Nested/Double tags in ${verse.id} (Page ${chap.pageNumber})`);
        }

        // Check for empty tags
        if (text.includes("<b></b>")) {
            console.log(`[WARN] Empty bold tags in ${verse.id} (Page ${chap.pageNumber})`);
        }
    });
});

// 3. Gibberish/Broken Syllable Check (Advanced)
console.log("\n3. Checking for suspicious sequences/breaks...");
const combiningChars = /[\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D]/;

burmese.chapters.forEach((chap, i) => {
    (chap.verses || []).forEach(verse => {
        const text = verse.text || "";

        // Scan for tag in middle of syllable (already fixed mostly, but let's confirm)
        const parts = text.split(/(<b>|<\/b>)/);
        for (let j = 1; j < parts.length - 1; j++) {
            if (parts[j] === "<b>" || parts[j] === "</b>") {
                const prev = parts[j - 1];
                const next = parts[j + 1];

                if (next && next.length > 0 && combiningChars.test(next[0])) {
                    console.log(`[CRITICAL] Broken syllable in ${verse.id} (Page ${chap.pageNumber}): ...${prev.slice(-1)}${parts[j]}${next[0]}...`);
                }
            }
        }

        // Check for exceptionally long words (not perfect for Burmese but helps)
        const longWord = text.match(/[^\s]{50,}/);
        if (longWord && !text.includes("<a href")) {
            console.log(`[NOTE] Very long sequence without space in ${verse.id} (Page ${chap.pageNumber}) - might be normal for Burmese scriptio continua.`);
        }
    });
});

console.log("\nAudit Finished.");
