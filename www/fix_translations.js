const fs = require('fs');

// This script fixes misplaced bold tags in eternal life translations
// The pattern to fix: </b> [text] <b> should often be: [text]
// Example: "text <b>word1</b> word2 <b>word3</b>" has misplaced tags around word2

const dir = 'eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log(`Fixing misplaced bold tags in ${files.length} language files...\n`);

let totalFixed = 0;
const fixedFiles = [];

files.forEach(file => {
    try {
        const filePath = `${dir}/${file}`;
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const lang = file.replace('.json', '');
        let fileChanged = false;
        let fixCount = 0;

        content.chapters.forEach(chapter => {
            if (chapter.verses) {
                chapter.verses.forEach(verse => {
                    if (verse.text && verse.text.includes('</b>')) {
                        const originalText = verse.text;

                        // Fix pattern: </b> short_text <b> where short_text should not have bold tags
                        // This is conservative - only fix if the text between tags is short (< 20 chars)
                        // and doesn't contain other HTML
                        let fixed = originalText.replace(
                            /\u003c\/b\u003e([^\u003c]{1,20})\u003cb\u003e/g,
                            '$1'
                        );

                        if (fixed !== originalText) {
                            verse.text = fixed;
                            fileChanged = true;
                            fixCount++;
                        }
                    }
                });
            }
        });

        if (fileChanged) {
            // Write back the fixed content
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
            totalFixed += fixCount;
            fixedFiles.push({ lang, count: fixCount });
            console.log(`✓ Fixed ${fixCount} issues in ${lang}`);
        }
    } catch (e) {
        console.error(`✗ Error fixing ${file}: ${e.message}`);
    }
});

console.log(`\n=== FIX SUMMARY ===`);
console.log(`Files processed: ${files.length}`);
console.log(`Files fixed: ${fixedFiles.length}`);
console.log(`Total fixes applied: ${totalFixed}\n`);

if (fixedFiles.length > 0) {
    console.log('Files with fixes:');
    fixedFiles.forEach(f => {
        console.log(`  - ${f.lang}: ${f.count} fix(es)`);
    });
}
