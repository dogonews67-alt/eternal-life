const fs = require('fs');

const dir = 'eternal_life_languages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log(`Checking ${files.length} language files for potential issues...\n`);

const issues = [];
const stats = {
    totalFiles: files.length,
    filesChecked: 0,
    issuesFound: 0
};

files.forEach(file => {
    try {
        const content = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8'));
        const lang = file.replace('.json', '');
        stats.filesChecked++;

        content.chapters.forEach((chapter, ci) => {
            if (chapter.verses) {
                chapter.verses.forEach((verse, vi) => {
                    if (verse.text) {
                        const text = verse.text;

                        // Check for misplaced bold tags (closing tag followed by text then opening tag)
                        const mismatchedBold = text.match(/\u003c\/b\u003e[^\u003c]{1,100}\u003cb\u003e/g);
                        if (mismatchedBold) {
                            issues.push({
                                lang,
                                page: chapter.pageNumber || 'cover',
                                verseId: verse.id,
                                issue: 'Misplaced bold tags',
                                snippet: mismatchedBold[0].substring(0, 50)
                            });
                        }

                        // Check for suspiciously long text without spaces (potential gibberish)
                        if (text.length > 500) {
                            const words = text.split(/\s+/).filter(w => w.length > 0);
                            const avgWordLength = text.length / words.length;
                            if (avgWordLength > 100) {
                                issues.push({
                                    lang,
                                    page: chapter.pageNumber || 'cover',
                                    verseId: verse.id,
                                    issue: 'Suspiciously long word (possible gibberish)',
                                    avgWordLength: Math.round(avgWordLength)
                                });
                            }
                        }

                        // Check for unmatched bold tags
                        const openBold = (text.match(/\u003cb\u003e/g) || []).length;
                        const closeBold = (text.match(/\u003c\/b\u003e/g) || []).length;
                        if (openBold !== closeBold) {
                            issues.push({
                                lang,
                                page: chapter.pageNumber || 'cover',
                                verseId: verse.id,
                                issue: 'Unmatched bold tags',
                                open: openBold,
                                close: closeBold
                            });
                        }
                    }
                });
            }
        });
    } catch (e) {
        issues.push({
            lang: file,
            issue: 'Parse error',
            error: e.message
        });
    }
});

stats.issuesFound = issues.length;

console.log(`\n=== SCAN RESULTS ===`);
console.log(`Files checked: ${stats.filesChecked}/${stats.totalFiles}`);
console.log(`Issues found: ${stats.issuesFound}\n`);

if (issues.length > 0) {
    console.log('=== ISSUES DETECTED ===\n');
    issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.lang} - Page ${issue.page}${issue.verseId ? ` (${issue.verseId})` : ''}`);
        console.log(`   Issue: ${issue.issue}`);
        if (issue.snippet) console.log(`   Snippet: ${issue.snippet}...`);
        if (issue.avgWordLength) console.log(`   Avg word length: ${issue.avgWordLength} chars`);
        if (issue.open !== undefined) console.log(`   Bold tags: ${issue.open} open, ${issue.close} close`);
        if (issue.error) console.log(`   Error: ${issue.error}`);
        console.log('');
    });
} else {
    console.log('✓ No issues detected! All files look good.');
}
