
function transformGodlyTaliasData(data, langKey) {
    let title = "Holy Bible";
    if (langKey === 'text_odia') title = "Pavitra Bible";

    const chapters = [];
    const bibleBookNames = ["Gen", "Exo", "Lev"]; // Mock names
    const odiaBookNames = ["Odia Gen", "Odia Exo", "Odia Lev"];

    if (!data.Book || !Array.isArray(data.Book)) {
        console.log("Invalid structure");
        return;
    }

    data.Book.forEach((bookObj, bookIndex) => {
        if (!bookObj || typeof bookObj !== 'object') return;

        const englishBookName = (bookIndex < bibleBookNames.length) ? bibleBookNames[bookIndex] : `Book ${bookIndex + 1}`;
        let displayBookName = englishBookName;
        if (langKey === 'text_odia' && bookIndex < odiaBookNames.length) {
            displayBookName = odiaBookNames[bookIndex];
        }

        if (bookObj.Chapter && Array.isArray(bookObj.Chapter)) {
            bookObj.Chapter.forEach((chapObj, chapIndex) => {
                if (!chapObj || typeof chapObj !== 'object') return;
                const chapterNum = chapIndex + 1;

                const versesArr = [];
                if (chapObj.Verse && Array.isArray(chapObj.Verse)) {
                    chapObj.Verse.forEach((v, vIndex) => {
                        if (!v || typeof v !== 'object') return;
                        let verseNum;
                        if (v.Verseid && typeof v.Verseid === 'string') {
                            const rawIdStr = v.Verseid.replace(/^0+/, '');
                            let rawId = parseInt(rawIdStr);

                            // Check for composite IDs (e.g., 1001 -> Chap 1 Verse 1, 2001 -> Chap 2 Verse 1)
                            if (!isNaN(rawId) && rawId > 176) {
                                rawId = rawId % 1000;
                            }

                            if (!isNaN(rawId) && rawId > 0) {
                                verseNum = rawId.toString();
                            } else {
                                verseNum = (vIndex + 1).toString();
                            }
                        } else if (v.Verse && typeof v.Verse === 'string') {
                            const match = v.Verse.match(/^\d+/);
                            if (match) {
                                const textPrefix = match[0];
                                let parsedNum = parseInt(textPrefix);
                                // FIX: Check for composite IDs in text prefix too
                                if (!isNaN(parsedNum) && parsedNum > 176) {
                                    parsedNum = parsedNum % 1000;
                                    verseNum = parsedNum.toString();
                                } else {
                                    verseNum = textPrefix.replace(/^0+/, '') || (vIndex + 1).toString();
                                }
                            } else {
                                verseNum = (vIndex + 1).toString();
                            }
                        } else {
                            verseNum = (vIndex + 1).toString();
                        }

                        console.log(`Input Verseid: ${v.Verseid}, Verse: ${v.Verse} -> Output verseNum: ${verseNum}`);

                        const cleanText = v.Verse && typeof v.Verse === 'string' ? v.Verse.replace(/^\d+/, '') : '';
                        if (cleanText.trim()) {
                            versesArr.push({
                                id: `${englishBookName} ${chapterNum}:${verseNum}`,
                                text: cleanText,
                                verseId: v.Verseid,
                                verse: verseNum
                            });
                        }
                    });
                }
            });
        }
    });

    return { title, chapters };
}

// Test Cases
const mockData = {
    Book: [
        {
            Chapter: [
                {
                    // Chapter 1
                    Verse: [
                        { Verse: "1001 Text 1" }, // Missing Verseid, should produce "1001" if hypothesis is correct
                        { Verse: "1002 Text 2" },
                        { Verseid: "2001", Verse: "Text 3" } // Should produce "1"
                    ]
                }
            ]
        }
    ]
};

console.log("Running transformation...");
const result = transformGodlyTaliasData(mockData, 'text_odia');
if (result && result.chapters && result.chapters[0]) {
    result.chapters[0].verses.forEach(v => {
        console.log(`Verse ID: ${v.id}, Text: ${v.text}`);
    });
}
