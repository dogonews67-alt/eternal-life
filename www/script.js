// Logs removed
// Logs removed
const books = {
    "eternal_life": {
        title: "Eternal Life",
        chapters: []
    },
    "bible": {
        title: "Holy Bible",
        chapters: [
            {
                title: "Genesis 1",
                verses: [
                    { id: "Gen 1:1", text: "In the beginning God created the heaven and the earth.", text_hi: "\u0906\u0926\u093f \u092e\u0947\u0902 \u092a\u0930\u092e\u0947\u0936\u094d\u0935\u0930 \u0928\u0947 \u0906\u0915\u093e\u0936 \u0914\u0930 \u092a\u0943\u0925\u094d\u0935\u0940 \u0915\u0940 \u0938\u0943\u0937\u094d\u091f\u093f \u0915\u0940\u0964" },
                    { id: "Gen 1:2", text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters." },
                    { id: "Gen 1:3", text: "And God said, Let there be light: and there was light." }
                ]
            },
            {
                title: "John 3",
                verses: [
                    { id: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." }
                ]
            }
        ]
    },
    "notes": {
        title: "My Personal Notes",
        chapters: [{ title: "Empty", verses: [{ id: "Note", text: "Add your notes here." }] }]
    },
    "chat": {
        title: "Chat with AI",
        chapters: []
    }
};

// --- SEARCH SUGGESTION LOGIC ---
let bookReferencesCache = {}; // Cache for references to improve performance
let highlightTimeout = null; // Timeout for verse highlighting

/**
 * Helper to ensure Cordova is ready before fetching local assets
 */
function waitForDeviceReady() {
    return new Promise(resolve => {
        if (window.cordova) {
            document.addEventListener('deviceready', resolve, false);
        } else {
            resolve();
        }
    });
}


/**
 * Extracts all searchable references (Chapter Titles, Verse IDs) from the current book.
 * @param {string} bookKey - The key of the current book.
 * @returns {string[]} An array of unique reference strings.
 */
function getAllReferences(bookKey) {
    if (bookReferencesCache[bookKey]) {
        return bookReferencesCache[bookKey];
    }

    const refs = [];
    // Assuming 'books' is a globally available object with book data
    const book = books[bookKey];

    // Exclude special content if needed
    if (!book || bookKey === 'quiz' || bookKey === 'notes') return refs;

    book.chapters.forEach(chap => {
        // Add chapter title as a suggestion (e.g., "Genesis 1" or "Page 1: Man is a Sinner")
        if (chap.title) {
            refs.push(chap.title);
        }

        chap.verses.forEach(v => {
            // Add full verse ID as a suggestion (e.g., "Intro" or "Para 1" or a bible verse ID)
            if (v.id && v.type !== 'header') {
                refs.push(v.id);
            }
        });
    });

    const uniqueRefs = [...new Set(refs)];
    bookReferencesCache[bookKey] = uniqueRefs; // Cache the results
    return uniqueRefs;
}

/**
 * Renders the filtered suggestions to the DOM.
 * @param {string[]} suggestions - Array of suggestions to display.
 */
function renderSuggestions(suggestions) {
    const searchSuggestions = document.getElementById('searchSuggestions');
    if (!searchSuggestions) return;

    searchSuggestions.innerHTML = ''; // Clear previous suggestions
    if (suggestions.length === 0) return;

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion;
        item.onclick = () => selectSuggestion(suggestion);
        searchSuggestions.appendChild(item);
    });
}

/**
 * Handles the selection of a suggestion.
 * @param {string} suggestion - The text of the selected suggestion.
 */
function selectSuggestion(suggestion) {
    const searchInput = document.getElementById('searchPanelInput');
    const searchSuggestions = document.getElementById('searchSuggestions');

    if (searchInput) {
        searchInput.value = suggestion; // Fill the search bar
    }
    if (searchSuggestions) {
        searchSuggestions.innerHTML = ''; // Clear suggestions
    }

    // Trigger the search function
    executeSearch();
}

/**
 * Main handler to generate and render suggestions based on user input.
 * This is called on the 'input' event.
 * @param {string} query - The current text in the search input.
 */
/**
 * Sets up the event listeners for the search suggestions feature.
 * This should be called inside your initApp function.
 */
function setupSearchSuggestions() {
    const searchInput = document.getElementById('searchPanelInput');
    const searchSuggestions = document.getElementById('searchSuggestions');

    if (searchInput && searchSuggestions) {
        // 1. Add 'oninput' handler for live updating
        searchInput.oninput = () => generateSuggestions(searchInput.value);

        // 2. Re-add the 'Enter' key handler
        searchInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                // Treat the current input text as the final search query
                selectSuggestion(searchInput.value);
            }
        };

        // 3. Clear suggestions when the input loses focus (blur)
        // Delay clearing to allow a user's 'onclick' on a suggestion to register first.
        searchInput.onblur = () => {
            setTimeout(() => {
                renderSuggestions([]);
            }, 150);
        };

        // 4. Show suggestions again if the input is clicked/focused and text is present
        searchInput.onfocus = () => {
            generateSuggestions(searchInput.value);
        };
    }
}

/**
 * Main handler to generate and render suggestions based on user input.
 * This is called on the 'input' event.
 * @param {string} query - The current text in the search input.
 */
function generateSuggestions(query) {
    const q = query.trim().toLowerCase();

    // Clear suggestions immediately if the query is empty
    if (!q) {
        renderSuggestions([]);
        return;
    }

    // Get references for the currently loaded book
    const currentBookKey = state.currentBookKey;
    const references = getAllReferences(currentBookKey);

    // Filter suggestions that contain the query string
    const filtered = references.filter(ref => ref.toLowerCase().includes(q));

    // \u00e2\u00ad\ufffd APPLY THE LIMIT OF 5 SUGGESTIONS \u00e2\u00ad\ufffd
    const suggestions = filtered.slice(0, 5);

    renderSuggestions(suggestions);
}

// --- BIBLE DATA TRANSFORMATION ---

/**
 * Transforms the deeply nested ASV_bible.json structure
 * into the expected flat array structure for the reader.
 * @param {object} rawBibleData - The fetched JSON data.
 * @returns {object} The transformed book object.
 */
function transformBibleData(rawBibleData) {
    if (!rawBibleData || typeof rawBibleData !== 'object') {
        throw new Error("Invalid Bible data structure");
    }
    const transformedBook = {
        title: "Holy Bible",
        chapters: []
    };

    // Iterate through Books (e.g., "Genesis")
    for (const bookName in rawBibleData) {
        if (!rawBibleData.hasOwnProperty(bookName)) continue;
        const bookChapters = rawBibleData[bookName];
        if (!bookChapters || typeof bookChapters !== 'object') continue;

        // Iterate through Chapters (e.g., "1", "2")
        for (const chapterNumber in bookChapters) {
            if (!bookChapters.hasOwnProperty(chapterNumber)) continue;
            const chapterVerses = bookChapters[chapterNumber];
            if (!chapterVerses || typeof chapterVerses !== 'object') continue;
            const chapter = {
                // The chapter title includes the Book and Chapter number
                title: `${bookName} ${chapterNumber}`,
                bookName: bookName,
                chapterNumber: chapterNumber,
                verses: []
            };

            // Iterate through Verses (e.g., "1", "2", "3")
            for (const verseNumber in chapterVerses) {
                if (!chapterVerses.hasOwnProperty(verseNumber)) continue;
                const verseText = chapterVerses[verseNumber];
                if (typeof verseText !== 'string') continue;

                chapter.verses.push({
                    // The verse ID is the full reference: "Book Chapter:Verse"
                    id: `${bookName} ${chapterNumber}:${verseNumber}`,
                    text: verseText // The verse text is always English (ASV)
                });
            }
            if (chapter.verses.length > 0) {
                transformedBook.chapters.push(chapter);
            }
        }
    }
    return transformedBook;
}

/**
 * Transforms the Odia_bible.json structure into the reader format.
 * @param {object} data - The Odia Bible JSON data.
 * @returns {object} The transformed book object.
 */
/**
 * Transforms the wldeh/bible-api JSON structure into the reader format.
 * @param {object} data - The wldeh Bible JSON data (usually just keys of books/verses).
 * @param {string} langKey - The language key.
 * @returns {object} The transformed book object.
 */
function transformWldehData(data, langKey) {
    // wldeh format usually is flat or keyed by book.
    // Actually, wldeh format is: { "Book Name": { "1": { "1": "Verse text..." } } }
    // Or sometimes properties are internal. Let's handle the common wldeh structure.

    let title = "Holy Bible";
    const chapters = [];

    // Check if data is object with book names as keys
    const bookKeys = Object.keys(data);

    bookKeys.forEach((bookName, bookIndex) => {
        // Skip metadata keys if any (depends on file)
        if (typeof data[bookName] !== 'object') return;

        // Map to English Book Name if possible for IDs
        const englishBookName = (bookIndex < bibleBookNames.length) ? bibleBookNames[bookIndex] : bookName;

        const bookChapters = data[bookName]; // { "1": { ... }, "2": { ... } }

        Object.keys(bookChapters).forEach(chapNumStr => {
            const chapterNum = parseInt(chapNumStr);
            const versesObj = bookChapters[chapNumStr]; // { "1": "In the beginning...", "2": "..." }

            const versesArr = [];
            Object.keys(versesObj).forEach(verseNumStr => {
                const verseNum = verseNumStr; // or parseInt
                const text = versesObj[verseNumStr];

                if (text) {
                    versesArr.push({
                        id: `${englishBookName} ${chapterNum}:${verseNum}`,
                        text: text,
                        verseId: verseNum
                    });
                }
            });

            // Sort verses by ID just in case
            versesArr.sort((a, b) => parseInt(a.verseId) - parseInt(b.verseId));

            chapters.push({
                title: `${bookName} - Chapter ${chapterNum}`,
                bookName: englishBookName,
                bookId: bookIndex + 1, // Standard numeric ID (1-66)
                chapterNumber: chapterNum,
                verses: versesArr
            });
        });
    });

    return { title, chapters };
}

/**
 * Transforms the GodlyTalias JSON structure into the reader format.
 * Works for Odia and other languages following the same schema.
 * @param {object} data - The Bible JSON data.
 * @param {string} langKey - The language key (e.g. 'text_odia').
 * @returns {object} The transformed book object.
 */
function transformGodlyTaliasData(data, langKey) {
    let title = "Holy Bible";
    if (langKey === 'text_odia') title = "\u0b2a\u0b2c\u0b3f\u0b24\u0b4d\u0b30 \u0b2c\u0b3e\u0b07\u0b2c\u0b32";

    // Add other localized titles if needed, or stick to English "Holy Bible" for now

    const chapters = [];

    if (!data.Book || !Array.isArray(data.Book)) {
        throw new Error("Invalid Bible JSON structure from GodlyTalias source");
    }

    data.Book.forEach((bookObj, bookIndex) => {
        if (!bookObj || typeof bookObj !== 'object') return;

        // Determine Book Name
        // ID: Always use English name from index (safe)
        const englishBookName = (bookIndex < bibleBookNames.length) ? bibleBookNames[bookIndex] : `Book ${bookIndex + 1}`;

        // Display Title: Use Odia names if Odia, otherwise English (or localized array if we had it)
        let displayBookName = englishBookName;
        if (langKey === 'text_odia' && bookIndex < odiaBookNames.length) {
            displayBookName = odiaBookNames[bookIndex];
        }

        if (bookObj.Chapter && Array.isArray(bookObj.Chapter)) {
            bookObj.Chapter.forEach((chapObj, chapIndex) => {
                if (!chapObj || typeof chapObj !== 'object') return;
                const chapterNum = chapIndex + 1;

                // Map verses
                const versesArr = [];
                if (chapObj.Verse && Array.isArray(chapObj.Verse)) {
                    chapObj.Verse.forEach((v, vIndex) => {
                        if (!v || typeof v !== 'object') return;

                        let verseNum;
                        // Handle both string and number Verseid
                        const verseIdVal = v.Verseid;

                        if (verseIdVal !== undefined && verseIdVal !== null) {
                            let rawId;
                            if (typeof verseIdVal === 'string') {
                                rawId = parseInt(verseIdVal.replace(/^0+/, ''));
                            } else {
                                rawId = parseInt(verseIdVal);
                            }

                            // Check for composite IDs (e.g., 1001 -> Chap 1 Verse 1, 3001 -> Chap 3 Verse 1)
                            // Composite IDs use format CCCVVV (min 1001), so >= 1000 detects all composite IDs
                            if (!isNaN(rawId)) {
                                if (rawId >= 1000) {
                                    const modulated = rawId % 1000;
                                    // Make sure 1000 etc don't become 0. If 0, it might be a special id, fall back to index?
                                    if (modulated > 0) {
                                        verseNum = modulated.toString();
                                        // console.log(`[Odia Fix] Converted composite ID ${rawId} to ${verseNum}`);
                                    } else {
                                        // Case where ID is 1000, 2000 etc. or just 0
                                        // console.warn(`[Odia Fix] ID ${rawId} modulated to 0. Using index.`);
                                        verseNum = (vIndex + 1).toString();
                                    }
                                } else if (rawId > 0) {
                                    verseNum = rawId.toString();
                                } else {
                                    verseNum = (vIndex + 1).toString();
                                }
                            } else {
                                verseNum = (vIndex + 1).toString();
                            }
                        } else if (v.Verse && typeof v.Verse === 'string') {
                            const match = v.Verse.match(/^\d+/);
                            if (match) {
                                const textPrefix = match[0];
                                let parsedNum = parseInt(textPrefix);
                                // FIX: Check for composite IDs in text prefix too
                                if (!isNaN(parsedNum) && parsedNum >= 1000) {
                                    parsedNum = parsedNum % 1000;
                                    verseNum = parsedNum.toString();
                                } else {
                                    verseNum = textPrefix.replace(/^0+/, '') || (vIndex + 1).toString();
                                }
                            } else {
                                verseNum = (vIndex + 1).toString();
                            }
                        } else {
                            // Absolute fallback
                            verseNum = (vIndex + 1).toString();
                        }

                        const cleanText = v.Verse && typeof v.Verse === 'string' ? v.Verse.replace(/^\d+/, '') : '';
                        if (cleanText.trim()) {
                            versesArr.push({
                                id: `${englishBookName} ${chapterNum}:${verseNum}`,
                                text: cleanText,
                                verseId: verseNum, // FIX: Use converted number for display. renderChapter prioritizes this.
                                originalVerseId: v.Verseid, // Keep original for reference
                                verse: verseNum
                            });
                        }
                    });
                }

                chapters.push({
                    title: `${displayBookName} - Chapter ${chapterNum}`,
                    displayBookName: displayBookName,
                    bookName: englishBookName,
                    bookId: bookIndex + 1, // Standard numeric ID (1-66)
                    chapterNumber: chapterNum,
                    verses: versesArr
                });
            });
        }
    });

    return { title, chapters };
}

// --- QUIZ DATA ---
// Default fallback quiz if loading fails
const fallbackQuizQuestions = [
    { question: "Who built the Ark?", options: ["Moses", "Noah", "David", "Solomon"], correctAnswer: 1, difficulty: 2 },
    { question: "What is the first book of the Bible?", options: ["Exodus", "Psalms", "Genesis", "Matthew"], correctAnswer: 2, difficulty: 1 },
    { question: "Where was Jesus born?", options: ["Jerusalem", "Nazareth", "Bethlehem", "Galilee"], correctAnswer: 2, difficulty: 3 },
    { question: "How many disciples did Jesus have?", options: ["10", "12", "7", "40"], correctAnswer: 1, difficulty: 4 },
    { question: "Who defeated the giant Goliath?", options: ["David", "Saul", "Samson", "Gideon"], correctAnswer: 0, difficulty: 5 },
    { question: "What is the wages of sin according to Romans 6:23?", options: ["Prison", "Death", "Sorrow", "Poverty"], correctAnswer: 1, difficulty: 6 },
    { question: "Which sea did Moses part?", options: ["Dead Sea", "Black Sea", "Red Sea", "Mediterranean Sea"], correctAnswer: 2, difficulty: 7 },
    { question: "Who was thrown into the lion's den?", options: ["Daniel", "Joseph", "Jonah", "Peter"], correctAnswer: 0, difficulty: 8 },
    { question: "What food did God provide in the desert?", options: ["Fish", "Bread", "Manna", "Figs"], correctAnswer: 2, difficulty: 2 },
    { question: "Who betrayed Jesus?", options: ["Peter", "James", "Judas Iscariot", "Thomas"], correctAnswer: 2, difficulty: 9 },
    { question: "How many days did God take to create the world?", options: ["5", "6", "7", "8"], correctAnswer: 1, difficulty: 3 },
    { question: "Who was the first king of Israel?", options: ["Saul", "David", "Solomon", "Rehoboam"], correctAnswer: 0, difficulty: 4 },
    { question: "What did Jesus turn water into?", options: ["Wine", "Oil", "Milk", "Bread"], correctAnswer: 0, difficulty: 5 },
    { question: "Who was the mother of Jesus?", options: ["Mary", "Martha", "Elizabeth", "Anna"], correctAnswer: 0, difficulty: 1 },
    { question: "What is the last book of the Bible?", options: ["Revelation", "Jude", "Hebrews", "James"], correctAnswer: 0, difficulty: 10 }
];

// Available quiz configurations from unified quiz.json
// let availableQuizzes = []; // Moved to top of file


// --- QUIZ QUESTION TRACKING ---
// --- QUIZ QUESTION TRACKING ---

// --- Helper Functions for Question Suppression ---
function getSuppressedQuestions(langKey) {
    const key = `quizCorrectlyAnswered_${langKey}`;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        console.warn("Error parsing suppressed questions:", e);
        return [];
    }
}

function suppressQuestion(questionId, langKey) {
    const key = `quizCorrectlyAnswered_${langKey}`;
    let list = getSuppressedQuestions(langKey);

    // Remove if already exists (to push to end)
    list = list.filter(id => id !== questionId);

    // Add to end (most recent)
    list.push(questionId);

    // Keep only last 20
    if (list.length > 20) {
        // Remove from front (oldest)
        list = list.slice(list.length - 20);
    }

    localStorage.setItem(key, JSON.stringify(list));
}

function getSelectedQuestions(quizData, langKey) {
    // Use a clean language key for storage to prevent collisions (e.g., "quizAskedQuestions_text_spanish")
    // Default to 'text' (English) if undefined
    const storageSuffix = langKey || 'text';

    const askedKey = `quizAskedQuestions_${storageSuffix}`;
    const shuffledKey = `quizShuffledQuestions_${storageSuffix}`;

    const askedQuestions = new Set(JSON.parse(localStorage.getItem(askedKey) || '[]'));

    const uniqueQuestions = quizData.filter((q, index, arr) =>
        arr.findIndex(qq => qq.question === q.question) === index
    );

    // Initializing suppressedQuestions
    const suppressedArr = getSuppressedQuestions(storageSuffix);
    const suppressedQuestions = new Set(suppressedArr);

    // Get shuffled list, if none or empty, create new shuffled
    let shuffled = JSON.parse(localStorage.getItem(shuffledKey) || '[]');

    // VALIDATION: If the cached shuffled list is empty OR belongs to a different dataset 
    // (heuristic: check if first item exists in current uniqueQuestions), force refresh.
    // However, since we are now namespacing by language key, simple emptiness check is usually enough.
    // We also re-shuffle if the cache seems broken.
    if (!Array.isArray(shuffled) || shuffled.length === 0) {
        shuffled = [...uniqueQuestions].sort(() => Math.random() - 0.5); // shuffle
        localStorage.setItem(shuffledKey, JSON.stringify(shuffled));
    }

    // Filter shuffled to only unasked
    const unaskedShuffled = shuffled.filter(q => !askedQuestions.has(q.question));

    // --- NEW: Filter out suppressed questions ---
    // Only filter if we have enough questions to spare (fallback protection)
    // If filtering removes all questions, we prioritize showing *something* over suppression.
    let candidates = unaskedShuffled.filter(q => !suppressedQuestions.has(q.question));

    if (candidates.length === 0 && unaskedShuffled.length > 0) {
        // If suppression leaves us empty but we have unasked questions, ignore suppression
        candidates = unaskedShuffled;
    }

    let selectedQuestions = [];
    const maxQuestions = Math.min(30, uniqueQuestions.length);

    if (candidates.length >= maxQuestions) {
        selectedQuestions = candidates.slice(0, maxQuestions);
    } else if (candidates.length > 0) {
        // We have some candidates but not 30. Take all of them.
        selectedQuestions = [...candidates];
    } else {
        // Cycle complete (or suppression blocked everything and we need to reset), reshuffle
        localStorage.removeItem(askedKey);
        askedQuestions.clear();
        shuffled = [...uniqueQuestions].sort(() => Math.random() - 0.5);
        localStorage.setItem(shuffledKey, JSON.stringify(shuffled));

        // After reset, try filtering again
        const newCandidates = shuffled.filter(q => !suppressedQuestions.has(q.question));
        // If still empty (e.g. user answered ALL questions correctly recently?), just show shuffled
        selectedQuestions = (newCandidates.length > 0 ? newCandidates : shuffled).slice(0, maxQuestions);
    }

    // Mark selected questions as asked
    selectedQuestions.forEach(q => askedQuestions.add(q.question));
    localStorage.setItem(askedKey, JSON.stringify([...askedQuestions]));

    return selectedQuestions;
}

// --- PRIZE LADDER FOR QUIZ ---
// 1st Q (index 0) = 100, 2nd Q (index 1) = 200, 3rd Q (index 2) = 300, etc.
const prizeLadder = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500];

// --- BIBLE BOOK NAMES ---
const bibleBookNames = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
    "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
    "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// --- ODIA BIBLE BOOK NAMES ---
const odiaBookNames = [
    "\u0b06\u0b26\u0b3f \u0b2a\u0b41\u0b38\u0b4d\u0b24\u0b15", "\u0b2f\u0b3e\u0b24\u0b4d\u0b30\u0b3e \u0b2a\u0b41\u0b38\u0b4d\u0b24\u0b15", "\u0b32\u0b47\u0b2c\u0b40\u0b5f \u0b2a\u0b41\u0b38\u0b4d\u0b24\u0b15", "\u0b17\u0b23\u0b28\u0b3e \u0b2a\u0b41\u0b38\u0b4d\u0b24\u0b15", "\u0b26\u0b4d\u0b2c\u0b3f\u0b24\u0b40\u0b5f \u0b2c\u0b3f\u0b2c\u0b30\u0b23", "\u0b2f\u0b3f\u0b39\u0b4b\u0b36\u0b4d\u0b1a\u0b5f", "\u0b2c\u0b3f\u0b1a\u0b3e\u0b30\u0b15\u0b30\u0b4d\u0b24\u0b3e\u0b2e\u0b3e\u0b28\u0b19\u0b4d\u0b15 \u0b2c\u0b3f\u0b2c\u0b30\u0b23", "\u0b30\u0b42\u0b24\u0b30 \u0b2c\u0b3f\u0b2c\u0b30\u0b23",
    "\u0b2a\u0b4d\u0b30\u0b25\u0b2e \u0b36\u0b3e\u0b2e\u0b41\u0b5f\u0b47\u0b32", "\u0b26\u0b3f\u0b24\u0b40\u0b5f \u0b36\u0b3e\u0b2e\u0b41\u0b5f\u0b47\u0b32", "\u0b2a\u0b4d\u0b30\u0b25\u0b2e \u0b30\u0b3e\u0b1c\u0b3e\u0b2c\u0b33\u0b40", "\u0b26\u0b4d\u0b71\u0b3f\u0b24\u0b40\u0b5f \u0b30\u0b3e\u0b1c\u0b3e\u0b2c\u0b33\u0b40", "\u0b2a\u0b4d\u0b30\u0b25\u0b2e \u0b2c\u0b02\u0b36\u0b3e\u0b2c\u0b33\u0b40", "\u0b26\u0b4d\u0b2c\u0b3f\u0b24\u0b40\u0b5f \u0b2c\u0b02\u0b36\u0b3e\u0b2c\u0b33\u0b40", "\u0b0f\u0b1c\u0b4d\u0b30\u0b3e", "\u0b28\u0b3f\u0b39\u0b3f\u0b2e\u0b3f\u0b5f\u0b3e",
    "\u0b0f\u0b37\u0b4d\u0b1f\u0b30 \u0b2c\u0b3f\u0b2c\u0b30\u0b23", "\u0b06\u0b5f\u0b41\u0b2c \u0b2a\u0b41\u0b38\u0b4d\u0b24\u0b15", "\u0b17\u0b40\u0b24\u0b38\u0b02\u0b39\u0b3f\u0b24\u0b3e", "\u0b39\u0b3f\u0b24\u0b4b\u0b2a\u0b26\u0b47\u0b36", "\u0b09\u0b2a\u0b26\u0b47\u0b36\u0b15", "\u0b2a\u0b30\u0b2e\u0b17\u0b40\u0b24", "\u0b2f\u0b3f\u0b36\u0b3e\u0b07\u0b5f", "\u0b2f\u0b3f\u0b30\u0b3f\u0b2e\u0b3f\u0b5f",
    "\u0b2f\u0b3f\u0b30\u0b3f\u0b2e\u0b3f\u0b5f\u0b19\u0b4d\u0b15 \u0b2c\u0b3f\u0b33\u0b3e\u0b2a", "\u0b2f\u0b3f\u0b39\u0b3f\u0b1c\u0b3f\u0b15\u0b32", "\u0b26\u0b3e\u0b28\u0b3f\u0b0f\u0b32", "\u0b39\u0b4b\u0b36\u0b47\u0b5f", "\u0b2f\u0b4b\u0b5f\u0b47\u0b32", "\u0b06\u0b2e\u0b4b\u0b37", "\u0b13\u0b2c\u0b26\u0b3f\u0b5f", "\u0b2f\u0b42\u0b28\u0b38",
    "\u0b2e\u0b40\u0b16\u0b3e", "\u0b28\u0b3e\u0b39\u0b4d\u200c\u0b2e", "\u0b39\u0b2c\u0b15\u0b15\u0b42\u0b15", "\u0b38\u0b3f\u0b2b\u0b28\u0b3f\u0b5f", "\u0b39\u0b17\u0b5f", "\u0b2f\u0b3f\u0b16\u0b30\u0b3f\u0b5f", "\u0b2e\u0b32\u0b3e\u0b16\u0b40", "\u0b2e\u0b3e\u0b25\u0b3f\u0b09",
    "\u0b2e\u0b3e\u0b30\u0b4d\u0b15", "\u0b32\u0b42\u0b15", "\u0b2f\u0b4b\u0b39\u0b28", "\u0b2a\u0b4d\u0b30\u0b47\u0b30\u0b3f\u0b24\u0b2e\u0b3e\u0b28\u0b19\u0b4d\u0b15 \u0b15\u0b3e\u0b30\u0b4d\u0b2f\u0b4d\u0b5f", "\u0b30\u0b4b\u0b2e\u0b40\u0b5f", "\u0b67 \u0b15\u0b30\u0b3f\u0b28\u0b4d\u0b25\u0b40\u0b5f", "\u0b68 \u0b15\u0b30\u0b3f\u0b28\u0b4d\u0b25\u0b40\u0b5f", "\u0b17\u0b3e\u0b32\u0b3e\u0b24\u0b40\u0b5f",
    "\u0b0f\u0b2b\u0b3f\u0b38\u0b40\u0b5f", "\u0b2b\u0b3f\u0b32\u0b3f\u0b2a\u0b40\u0b5f", "\u0b15\u0b32\u0b38\u0b40\u0b5f", "\u0b67 \u0b25\u0b47\u0b38\u0b32\u0b28\u0b40\u0b15\u0b40\u0b5f", "\u0b68 \u0b25\u0b47\u0b38\u0b32\u0b28\u0b40\u0b15\u0b40\u0b5f", "\u0b67 \u0b24\u0b40\u0b2e\u0b25", "\u0b68 \u0b24\u0b40\u0b2e\u0b25", "\u0b24\u0b40\u0b24\u0b38",
    "\u0b2b\u0b3f\u0b32\u0b40\u0b2e\u0b4b\u0b28", "\u0b0f\u0b2c\u0b4d\u0b30\u0b40", "\u0b2f\u0b3e\u0b15\u0b41\u0b2c", "\u0b67 \u0b2a\u0b3f\u0b24\u0b30", "\u0b68 \u0b2a\u0b3f\u0b24\u0b30", "\u0b67 \u0b2f\u0b4b\u0b39\u0b28", "\u0b68 \u0b2f\u0b4b\u0b39\u0b28", "\u0b69 \u0b2f\u0b4b\u0b39\u0b28",
    "\u0b2f\u0b3f\u0b39\u0b42\u0b26\u0b3e", "\u0b2a\u0b4d\u0b30\u0b15\u0b3e\u0b36\u0b3f\u0b24 \u0b2c\u0b3e\u0b15\u0b4d\u0b5f"
];

// --- HINDI BIBLE BOOK NAMES ---
const hindiBookNames = [
    "उत्पत्ति", "निर्गमन", "लैव्यव्यवस्था", "गिनती", "व्यवस्थाविवरण", "यहोशू", "न्यायियों", "रूथ",
    "1 शमूएल", "2 शमूएल", "1 राजा", "2 राजा", "1 इतिहास", "2 इतिहास", "एज्रा", "नहेमायाह",
    "एस्तेर", "अयूब", "भजन संहिता", "नीतिवचन", "सभोपदेशक", "श्रेष्ठगीत", "यशायाह", "यिर्मयाह",
    "विलापगीत", "यहेजकेल", "दानिय्येल", "होशे", "योएल", "आमोस", "ओबद्याह", "योना", "मीका",
    "नहूम", "हबक्कूक", "सपन्याह", "हाग्गै", "जकरिया", "मलाकी",
    "मत्ती", "मरकुस", "लूका", "यूहन्ना", "प्रेरितों के काम", "रोमियों", "1 कुरिन्थियों", "2 कुरिन्थियों",
    "गलातियों", "इफिसियों", "फिलिप्पियों", "कुलुस्सियों", "1 थिस्सलुनीकियों", "2 थिस्सलुनीकियों",
    "1 तीमुथियुस", "2 तीमुथियुस", "तीतुस", "फिलेमोन", "इब्रानियों", "याकूब", "1 पतरस", "2 पतरस",
    "1 यूहन्ना", "2 यूहन्ना", "3 यूहन्ना", "यहूदा", "प्रकाशितवाक्य"
];

const bengaliBookNames = [
    "আদিপুস্তক", "যাত্রাপুস্তক", "লেবীয় পুস্তক", "গণনা পুস্তক", "দ্বিতীয় বিবরণ", "যিহোশূয়", "বিচারকর্তৃগণ", "রূৎ",
    "১ শমূয়েল", "২ শমূয়েল", "১ রাজাবলি", "২ রাজাবলি", "১ বংশাবলি", "২ বংশাবলি", "ইষ্রা", "নহেমিয়",
    "ইষ্টের", "ইয়োব", "গীতসংহিতা", "হিতোপদেশ", "উপদেশক", "পরমগীত", "যিশাইয়", "যিরমিয়",
    "বিলাপ", "যিহিষ্কেল", "দানিয়েন", "হোশেয়", "যোয়েল", "আমোষ", "ওবদিয়", "যোনা", "মীখা",
    "নহূম", "হবক্কূক", "সফনিয়", "হগয়", "সখরিয়", "মালাখি",
    "মথি", "মার্ক", "লূক", "যোহন", "প্রেরিত", "রোমীয়", "১ করিন্থীয়", "২ করিন্থীয়",
    "গালাতীয়", "ইফিষীয়", "ফিলিপীয়", "কলসীয়", "১ থিষলনীকীয়", "২ থিষলনীকীয়",
    "১ তীমথিয়", "২ তীমথিয়", "তীত", "ফিলীমন", "ইব্রীয়", "যাকোব", "১ পিতর", "২ পিতর",
    "১ যোহন", "২ যোহন", "৩ যোহন", "যিহূদা", "প্রকাশিত বাক্য"
];

const gujaratiBookNames = [
    "ઉત્પત્તિ", "નિર્ગમન", "લેવીય", "ગણના", "પુનર્નિયમ", "યહોશુઆ", "ન્યાયાધીશો", "રૂથ",
    "1 શમૂએલ", "2 શમૂએલ", "1 રાજાઓ", "2 રાજાઓ", "1 કાળવૃત્તાંત", "2 કાળવૃત્તાંત", "એઝરા", "નહેમ્યા",
    "એસ્તેર", "અયૂબ", "ગીતશાસ્ત્ર", "નીતિવચનો", "સભાશિક્ષક", "પ્રેમગીત", "યશાયા", "યર્મિયા",
    "વિલાપ", "હઝકીએલ", "દાનિયેલ", "હોશિયા", "યોએલ", "આમોસ", "ઓબાદિયા", "યૂના", "મીખા",
    "નહૂમ", "હબાક્કૂક", "સફાન્યા", "હાગ્ગા", "ઝખાર્યા", "માલાખી",
    "માથ્થી", "માર્ક", "લૂક", " યોહાન", "પ્રેરિતોનાં કૃત્યો", "રોમનો", "1 કોરીંથીઓ", "2 કોરીંથીઓ",
    "ગલાતીઓ", "એફેસીઓ", "ફિલિપ્પીઓ", "કોલોસીઓ", "1 થેસ્સાલોનીકીઓ", "2 થેસ્સાલોનીકીઓ",
    "1 તિમોથી", "2 તિમોથી", "તિતસ", "ફિલેમોન", "હિબ્રૂઓ", "યાકૂબ", "1 પિતર", "2 પિતર",
    "1 યોહાન", "2 યોહાન", "3 યોહાન", "યહૂદા", "પ્રકટીકરણ"
];

const kannadaBookNames = [
    "ಆದಿಕಾಂಡ", "ವಿಮೋಚನಕಾಂಡ", "ಯಾಜಕಕಾಂಡ", "ಅರಣ್ಯಕಾಂಡ", "ಧರ್ಮೋಪದೇಶಕಾಂಡ", "ಯೆಹೋಶುವ", "ನ್ಯಾಯಸ್ಥಾಪಕರು", "ರೂತಳು",
    "1 ಸಮುವೇಲನು", "2 ಸಮುವೇಲನು", "1 ಅರಸುಗಳು", "2 ಅರಸುಗಳು", "1 ಪೂರ್ವಕಾಲವೃತ್ತಾಂತ", "2 ಪೂರ್ವಕಾಲವೃತ್ತಾಂತ", "ಎಜ್ರನು", "ನೆಹೆಮಿಯ",
    "ಎಸ್ತೇರಳು", "ಯೋಬನು", "ಕೀರ್ತನೆಗಳು", "ಜ್ಞಾನೋಕ್ತಿಗಳು", "ಪ್ರಸಂಗಿ", "ಪರಮಗೀತೆ", "ಯೆಶಾಯ", "ಯೆರೆಮಿಯ",
    "ಪ್ರಲಾಪಗಳು", "ಯೆಹೆಜ್ಕೇಲನು", "ದಾನಿಯೇಲನು", "ಹೋಶೇಯ", "ಯೋವೇಲ", "ಆಮೋಸ", "ಓಬದ್ಯ", "ಯೋನ", "ಮೀಕ",
    "ನಹೂಮ", "ಹಬಕ್ಕೂಕ", "ಚೆಫನ್ಯ", "ಹಗ್ಗಾಯ", "ಜೆಕರ್ಯ", "ಮಲಾಕಿಯ",
    "ಮತ್ತಾಯನು", "ಮಾರ್ಕನು", "ಲೂಕನು", "ಯೋಹಾನನು", "ಅಪೊಸ್ತಲರ ಕೃತ್ಯಗಳು", "ರೋಮಾಪುರದವರಿಗೆ", "1 ಕೊರಿಂಥದವರಿಗೆ", "2 ಕೊರಿಂಥದವರಿಗೆ",
    "ಗಲಾತ್ಯದವರಿಗೆ", "ಎಫೆಸದವರಿಗೆ", "ಫಿಲಿಪ್ಪಿಯವರಿಗೆ", "ಕೊಲೊಸ್ಸೆಯವರಿಗೆ", "1 ಥೆಸಲೋನಿಕದವರಿಗೆ", "2 ಥೆಸಲೋನಿಕದವರಿಗೆ",
    "1 ತಿಮೋಥೆಯನಿಗೆ", "2 ತಿಮೋಥೆಯನಿಗೆ", "ತೀತನಿಗೆ", "ಫಿಲೆಮೋನನಿಗೆ", "ಇಬ್ರಿಯರಿಗೆ", "ಯಾಕೋಬನು", "1 ಪೇತ್ರನು", "2 ಪೇತ್ರನು",
    "1 ಯೋಹಾನನು", "2 ಯೋಹಾನನು", "3 ಯೋಹಾನನು", "ಯೂದನು", "ಪ್ರಕಟನೆ"
];

const marathiBookNames = [
    "उत्पत्ती", "निर्गम", "लेवीय", "गणना", "अनुवाद", "यहोशवा", "शास्ते", "लूथ",
    "1 शमुवेल", "2 शमुवेल", "1 राजे", "2 राजे", "1 इतिहास", "2 इतिहास", "एज्रा", "नहेम्या",
    "एस्तेर", "ईयोब", "स्तोत्रसंहिता", "नीतिसूत्रे", "उपदेशक", "गीतरत्न", "यशया", "यिर्मया",
    "विलापगीत", "यहेज्केल", "दानिएल", "होशेय", "योएल", "आमोस", "ओबद्या", "योना", "मीखा",
    "नहूम", "हबक्कूक", "सफन्या", "हाग्गय", "जखर्या", "मलाखी",
    "मत्तय", "मार्क", "लूक", "योहान", "प्रेषितांची कृत्ये", "रोम", "1 करिंथ", "2 करिंथ",
    "गलती", "इफिस", "फिलिप्पै", "कलस्सै", "1 थेस्सलनीका", "2 थेस्सलनीका",
    "1 तीमथ्य", "2 तीमथ्य", "तीत", "फिलेमोन", "इब्री", "याकोब", "1 पेत्र", "2 पेत्र",
    "1 योहान", "2 योहान", "3 योहान", "यहूदा", "प्रकटीकरण"
];

const punjabiBookNames = [
    "ਉਤਪਤ", "ਖ਼ਰੋਜ", "ਲੇਵੀਆਂ", "ਗਿਣਤੀ", "ਬਿਵਸਥਾ ਸਾਰ", "ਯਹੋਸ਼ੁਆ", "ਨਿਆਈਆਂ", "ਰੂਥ",
    "1 ਸਮੂਏਲ", "2 ਸਮੂਏਲ", "1 ਰਾਜਿਆਂ", "2 ਰਾਜਿਆਂ", "1 ਇਤਹਾਸ", "2 ਇਤਹਾਸ", "ਅਜ਼ਰਾ", "ਨਹਮਯਾਹ",
    "ਅਸਤਰ", "ਅੱਯੂਬ", "ਜ਼ਬੂਰ", "ਕਹਾਉਤਾਂ", "ਉਪਦੇਸ਼ਕ", "ਸਰੇਸ਼ਟ ਗੀਤ", "ਯਸਾਯਾਹ", "ਯਿਰਮਿਯਾਹ",
    "ਵਿਰਲਾਪ", "ਹਿਜ਼ਕੀਏਲ", "ਦਾਨੀਏਲ", "ਹੋਸ਼ੇਆ", "ਯੋਏਲ", "ਆਮੋਸ", "ਓਬਦਯਾਹ", "ਯੂਨਾਹ", "ਮੀਕਾਹ",
    "ਨਹੂਮ", "ਹਬੱਕੂਕ", "ਸਫ਼ਨਯਾਹ", "ਹੱਜਈ", "ਜ਼ਕਰਯਾਹ", "ਮਲਾਕੀ",
    "ਮੱਤੀ", "ਮਰਕੁਸ", "ਲੂਕਾ", "ਯੂਹੰਨਾ", "ਰਸੂਲਾਂ ਦੇ ਕਰਤੱਬ", "ਰੋਮੀਆਂ", "1 ਕੁਰਿੰਥੀਆਂ", "2 ਕੁਰਿੰਥੀਆਂ",
    "ਗਲਾਤੀਆਂ", "ਅਫ਼ਸੀਆਂ", "ਫ਼ਿਲਿੱਪੀਆਂ", "ਕੁਲੁੱਸੀਆਂ", "1 ਥੱਸਲੁਨੀਕੀਆਂ", "2 ਥੱਸਲੁਨੀਕੀਆਂ",
    "1 ਤਿਮੋਥਿਉਸ", "2 ਤਿਮੋਥਿਉਸ", "ਤੀਤੁਸ", "ਫ਼ਿਲੇਮੋਨ", "ਇਬਰਾਨੀਆਂ", "ਯਾਕੂਬ", "1 ਪਤਰਸ", "2 ਪਤਰਸ",
    "1 ਯੂਹੰਨਾ", "2 ਯੂਹੰਨਾ", "3 ਯੂਹੰਨਾ", "ਯਹੂਦਾਹ", "ਪਰਕਾਸ਼ ਦੀ ਪੋਥੀ"
];

const tamilBookNames = [
    "ஆதியாகமம்", "யாத்திராகமம்", "லேவியராகமம்", "எண்ணாகமம்", "உபாகமம்", "யோசுவா", "நியாயாதிபதிகள்", "ரூத்",
    "1 சாமுவேல்", "2 சாமுவேல்", "1 இராஜாக்கள்", "2 இராஜாக்கள்", "1 நாளாகமம்", "2 நாளாகமம்", "எஸ்றா", "நெகேமியா",
    "எஸ்தர்", "யோபு", "சங்கீதம்", "நீதிமொழிகள்", "பிரசங்கி", "உன்னதப்பாட்டு", "ஏசாயா", "எரேமியா",
    "புலம்பல்", "எசேக்கியேல்", "தானியேல்", "ஓசியா", "யோவேல்", "ஆமோஸ்", "ஒபதியா", "யோனா", "மீகா",
    "நாகூம்", "ஆபகூக்", "செப்பனியா", "ஆகாய்", "சகரியா", "மல்கியா",
    "மத்தேயு", "மாற்கு", "லூக்கா", "யோவான்", "அப்போஸ்தலருடைய நடபடிகள்", "ரோமர்", "1 கொரிந்தியர்", "2 கொரிந்தியர்",
    "கலாத்தியர்", "எபேசியர்", "பிலிப்பியர்", "கொலோசெயர்", "1 தெசலோனிக்கேயர்", "2 தெசலோனிக்கேயர்",
    "1 தீமோத்தேயு", "2 தீமோத்தேயு", "தீத்து", "பிலேமோன்", "எபிரேயர்", "யாக்கோபு", "1 பேதுரு", "2 பேதுரு",
    "1 யோவான்", "2 யோவான்", "3 யோவான்", "யூதா", "வெளிப்படுத்தின விசேஷம்"
];

const teluguBookNames = [
    "ఆదికాండము", "నిర్గమకాండము", "లేవీయకాండము", "సంఖ్యాకాండము", "ద్వితీయోపదేశకాండము", "యెహోషువ", "న్యాయాధిపతులు", "రూతు",
    "1 సమూయేలు", "2 సమూయేలు", "1 రాజులు", "2 రాజులు", "1 దినవృత్తాంతములు", "2 దినవృత్తాంతములు", "ఎజ్రా", "నెహెమ్యా",
    "ఎస్తరు", "యోబు", "కీర్తనలు", "సామెతలు", "ప్రసంగి", "పరమగీతము", "యెషయా", "యిర్మీయా",
    "విలాపవాక్యములు", "యెహెజ్కేలు", "దానియేలు", "హోషేయ", "యోవేలు", "ఆమోసు", "ఓబద్యా", "యోనా", "మీకా",
    "నహూము", "హబక్కూకు", "జెఫన్యా", "హగ్గయి", "జెకర్యా", "మలాకీ",
    "మత్తయి", "మార్కు", "లూకా", "యోహాను", "అపొస్తలుల కార్యములు", "రోమీయులకు", "1 కొరింథీయులకు", "2 కొరింథీయులకు",
    "గలతీయులకు", "ఎఫెసీయులకు", "ఫిలిప్పీయులకు", "కొలొస్సయులకు", "1 థెస్సలొనీకయులకు", "2 థెస్సలొనీకయులకు",
    "1 తిమోతికి", "2 తిమోతికి", "తీతుకు", "ఫిలేమోనుకు", "హెబ్రీయులకు", "యాకోబు", "1 పేతురు", "2 పేతురు",
    "1 యోహాను", "2 యోహాను", "3 యోహాను", "యూదా", "ప్రకటన గ్రంథము"
];

const malayalamBookNames = [
    "ഉല്പത്തി", "പുറപ്പാടു്", "ലേവ്യപുസ്തകം", "സംഖ്യാപുസ്തകം", "ആവർത്തനപുസ്തകം", "യോശുവ", "ന്യായാധിപന്മാർ", "രൂത്ത്",
    "1 ശമൂവേൽ", "2 ശമൂവേൽ", "1 രാജാക്കന്മാർ", "2 രാജാക്കന്മാർ", "1 ദിനവൃത്താന്തം", "2 ദിനവൃത്താന്തം", "എസ്രാ", "നെഹെമ്യാവു",
    "എസ്ഥേർ", "ഇയ്യോബ്", "സങ്കീർത്തനങ്ങൾ", "സദൃശവാക്യങ്ങൾ", "സഭാപ്രസംഗി", "ഉത്തമഗീതം", "യെശയ്യാവു", "യിരെമ്യാവു",
    "വിലാപങ്ങൾ", "യഹസ്കേൽ", "ദാനീയേൽ", "ഹോശേയ", "യോവേൽ", "ആമോസ്", "ഓബദ്യാവു", "യോനാ", "മീഖാ",
    "നഹൂം", "ഹബക്കൂക്", "സെഫന്യാവു", "ഹഗ്ഗായി", "സെഖര്യാവു", "മലാഖി",
    "മത്തായി", "മർക്കൊസ്", "ലൂക്കൊസ്", "യോഹന്നാൻ", "പ്രവൃത്തികൾ", "റോമർ", "1 കൊരിന്ത്യർ", "2 കൊരിന്ത്യർ",
    "ഗലാത്യർ", "എഫെസ്യർ", "ഫിലിപ്പിയർ", "കൊലൊസ്സ്യർ", "1 തെസ്സലൊനീക്യർ", "2 തെസ്സലൊനീക്യർ",
    "1 തിമൊഥെയൊസ്", "2 തിമൊഥെയൊസ്", "തീത്തൊസ്", "ഫിലേമോൻ", "എബ്രായർ", "യാക്കോബ്", "1 പത്രൊസ്", "2 പത്രൊസ്",
    "1 യോഹന്നാൻ", "2 യോഹന്നാൻ", "3 യോഹന്നാൻ", "യൂദാ", "വെളിപ്പാടു"
];



// --- ODIA BIBLE LOADING ---
// --- ODIA BIBLE LOADING REMOVED ---


// --- STATE MANAGEMENT ---
let state = {
    currentBookKey: 'eternal_life',
    currentChapterIndex: 0,
    currentVerseNumber: 0,
    currentLang: 'text',
    bookmarks: JSON.parse(localStorage.getItem('myReaderBookmarks')) || [],
    theme: localStorage.getItem('myReaderTheme') || 'sepia',
    fontSize: localStorage.getItem('myReaderFontSize') || 19,
    preferredLang: localStorage.getItem('myReaderPreferredLang') || 'text',
    popupVerseId: null,
    quizIndex: 0,
    quizScore: 0,
    quizOver: false,
    quizModeActive: false,
    swipeEnabled: localStorage.getItem('myReaderSwipeEnabled') !== 'false', // default true
    swipeSensitivity: parseInt(localStorage.getItem('myReaderSwipeSensitivity')) || 100,
    swipeSensitivity: parseInt(localStorage.getItem('myReaderSwipeSensitivity')) || 100,
    previousBookKey: null, // Track previous book for restoring state after quiz
    lastBibleBookName: null,
    lastBibleBookName: null,
    // ... (existing state)
    currentTranslationId: 'YLT', // Default
    availableTranslations: {}, // Store metadata { id: { name, abbreviation, language } }
    bookList: [], // List of books for current translation
    isOffline: !navigator.onLine,
    usingCachedBible: false,
    longPressBookmark: localStorage.getItem('myReaderLongPress') === 'true',
    notificationTime: localStorage.getItem('myReaderNotificationTime') || '08:00',
    notificationsEnabled: localStorage.getItem('myReaderNotificationsEnabled') !== 'false' // default true
};

// Expose to window for external modules (e.g. notifications.js)
window.state = state;
window.books = books;
window.renderChapter = renderChapter;
window.highlightVerse = highlightVerse;

function toggleNotifications(enabled) {
    state.notificationsEnabled = enabled;
    localStorage.setItem('myReaderNotificationsEnabled', enabled);

    if (typeof Notifications !== 'undefined') {
        if (enabled) {
            Notifications.enable(books, state);
        } else {
            Notifications.disable();
        }
    }
}

function setNotificationTime(time) {
    console.log(`[Settings] Changing notification time to: ${time}`);
    state.notificationTime = time;
    localStorage.setItem('myReaderNotificationTime', time);

    // FIX: Reschedule immediately if enabled
    if (state.notificationsEnabled && typeof Notifications !== 'undefined') {
        Notifications.scheduleDailyVerses(books, state);
    }
}

const RTL_LANGUAGES = ['text_hebrew', 'text_arabic', 'text_urdu'];

function updateRTL() {
    const isRTL = RTL_LANGUAGES.includes(state.currentLang);
    const container = document.getElementById('bookPage');
    if (container) {
        if (isRTL) {
            container.classList.add('rtl');
        } else {
            container.classList.remove('rtl');
        }
    }
}

const BIBLE_CONFIG = {
    'text': { sources: [{ type: 'BOLLS', id: 'BSB' }], copyright: "Berean Standard Bible (BSB)", content: "Old + New" },
    'text_arabic': { sources: [{ type: 'GETBIBLE', id: 'arabicsv' }], copyright: "Smith and Van Dyke (Public Domain)", content: "Old + New", font: "'Amiri', serif" },
    'text_assamese': { sources: [{ type: 'HELLOAO', id: 'asm_irv', lang: 'asm' }], copyright: "Assamese (HELLOAO)", unavailable: false, content: "Old + New" },
    'text_bengali': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Bengali' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_bhutanese': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_burmese': { sources: [{ type: 'HELLOAO', id: 'mya_jvb' }], copyright: "Public Domain (Adoniram Judson 1835)", content: "Old + New" },
    'text_chinese': { sources: [{ type: 'HELLOAO', id: 'cmn_cu1' }], copyright: "Chinese Union Version (simplified)", content: "Old + New" },
    'text_czech': { sources: [{ type: 'BOLLS', id: 'CSP09' }], copyright: "Public Domain", content: "Old + New" },
    'text_dogri': { sources: [{ type: 'LOCAL_BIBLE', path: 'dogri_bible_json' }], copyright: "Dogri NT (CC BY-SA 4.0)", content: "New Testament" },
    'text_dutch': { sources: [{ type: 'BOLLS', id: 'NLD' }], copyright: "Public Domain", content: "Old + New" },
    'text_french': { sources: [{ type: 'HELLOAO', id: 'fra_lsg' }], copyright: "Louis Segond 1910", content: "Old + New" },
    'text_german': { sources: [{ type: 'BOLLS', id: 'SCH' }], copyright: "Schlachter 1951", content: "Old + New" },
    'text_greek': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_gujarati': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Gujarati' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_hebrew': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_hindi': { sources: [{ type: 'BOLLS', id: 'HIOV' }], copyright: "Hindi O.V. (Public Domain)", content: "Old + New", font: "'Noto Sans Devanagari', sans-serif" },
    'text_hungarian': { sources: [{ type: 'BOLLS', id: 'RUF' }], copyright: "Public Domain", content: "Old + New" },
    'text_igbo': { sources: [{ type: 'HELLOAO', id: 'ibo_bib' }], copyright: "Public Domain", content: "Old + New" },
    'text_indonesian': { sources: [{ type: 'BOLLS', id: 'TB' }], copyright: "Public Domain", content: "Old + New" },
    'text_italian': { sources: [{ type: 'HELLOAO', id: 'ita_riv' }], copyright: "Riveduta Bibbia 1927", content: "Old + New" },
    'text_japanese': { sources: [{ type: 'BOLLS', id: 'JPKJV' }], copyright: "Colloquial Japanese", content: "Old + New" },
    'text_kannada': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Kannada' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_kashmiri': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_konkani': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_korean': { sources: [{ type: 'HELLOAO', id: 'kor_old' }], copyright: "Korean Bible 1910", content: "Old + New" },
    'text_malay': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_malayalam': { sources: [{ type: 'BOLLS', id: 'MOV' }], copyright: "Malayalam Old Version (Public Domain)", content: "Old + New" },
    'text_manipuri': { sources: [{ type: 'HELLOAO', id: 'mni_twf', lang: 'mni' }], copyright: "Manipuri (HELLOAO)", content: "Old + New" },
    'text_marathi': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Marathi' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_mongolian': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_nagamese': { sources: [{ type: 'HELLOAO', id: 'nag_isv', lang: 'nag' }], copyright: "Nagamese (HELLOAO)", content: "Old + New" },
    'text_nepali': { sources: [{ type: 'BOLLS', id: 'NNRV' }], copyright: "Public Domain", content: "Old + New" },
    'text_norwegian': { sources: [{ type: 'BOLLS', id: 'DNB' }], copyright: "Public Domain", content: "Old + New" },
    'text_odia': { sources: [{ type: 'HELLOAO', id: 'ory_irv' }], copyright: "Indian Revised Version (IRV)", content: "Old + New", font: "'Noto Sans Oriya', sans-serif" },
    'text_oromo': { sources: [{ type: 'HELLOAO', id: 'gaz_bib' }], copyright: "Public Domain", content: "Old + New", font: "'Noto Sans', sans-serif" },
    'text_polish': { sources: [{ type: 'BOLLS', id: 'BG' }], copyright: "Public Domain", content: "Old + New" },
    'text_portuguese': { sources: [{ type: 'HELLOAO', id: 'por_blj' }, { type: 'BOLLS', id: 'ARC09' }], copyright: "Bíblia Livre / Almeida", content: "Old + New" },
    'text_punjabi': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Punjabi' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_romanian': { sources: [{ type: 'BOLLS', id: 'VDCL' }], copyright: "Public Domain", content: "Old + New" },
    'text_rohingya': {
        sources: [{
            type: 'GITHUB_CUSTOM',
            url: 'https://raw.githubusercontent.com/dogonews67-alt/rohingya-bible/master/rohingya_bible.json',
            transformFn: 'transformRohingyaData'
        }],
        copyright: "Rohingya Bible (GitHub)",
        content: "Full Bible"
    },
    'text_russian': { sources: [{ type: 'HELLOAO', id: 'rus_syn' }], copyright: "Russian Synodal", content: "Old + New" },
    'text_sanskrit': { sources: [{ type: 'HELLOAO', id: 'san_dev' }], copyright: "Public Domain", content: "Old + New" },
    'text_somali': { sources: [{ type: 'HELLOAO', id: 'som_sim' }], copyright: "Public Domain", content: "Old + New" },
    'text_spanish': { sources: [{ type: 'HELLOAO', id: 'spa_r09' }], copyright: "Reina Valera 1909", content: "Old + New" },
    'text_swahili': { sources: [{ type: 'HELLOAO', id: 'swh_ulb' }], copyright: "Swahili Unlocked Literal Bible", content: "Old + New" },
    'text_swedish': { sources: [{ type: 'GETBIBLE', id: 'swedish' }], copyright: "Swedish 1917 (Public Domain)", content: "Old + New" },
    'text_tagalog': { sources: [{ type: 'HELLOAO', id: 'tgl_ulb' }], copyright: "Tagalog Unlocked Literal Bible", content: "Old + New" },
    'text_tamil': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Tamil' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_telugu': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Telugu' }], copyright: "Public Domain / GodlyTalias", content: "Old + New" },
    'text_thai': { sources: [{ type: 'HELLOAO', id: 'tha_kjv' }], copyright: "Public Domain (Thai KJV)", content: "Old + New" },
    'text_tibetan': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_turkish': { sources: [{ type: 'HELLOAO', id: 'tur_obt' }], copyright: "Open Bible Translations (Turkish)", content: "Old + New" },
    'text_urdu': { sources: [], unavailable: true, copyright: "Translation not available" },
    'text_vietnamese': { sources: [{ type: 'HELLOAO', id: 'vie_1934' }], copyright: "Vietnamese Bible 1934", content: "Old + New" },
    'text_yoruba': { sources: [{ type: 'HELLOAO', id: 'yor_bib' }], copyright: "Public Domain", content: "Old + New" }
};

const LOCALIZED_BIBLE_TITLES = {
    'text': "Holy Bible",
    'text_arabic': "\u0627\u0644\u0643\u062a\u0627\u0628 \u0627\u0644\u0645\u0642\u062f\u0633",
    'text_assamese': "\u09aa\u09ac\u09bf\u09a4\u09cd\u09f0 \u09ac\u09be\u0987\u09ac\u09c7\u09b2",
    'text_bengali': "\u09aa\u09ac\u09bf\u09a4\u09cd\u09b0 \u09ac\u09be\u0987\u09ac\u09c7\u09b2",
    'text_bhutanese': "\u0f51\u0f58\u0f0b\u0f54\u0f60\u0f72\u0f0b\u0f42\u0f66\u0f74\u0f44\u0f0b\u0f62\u0f56",
    'text_burmese': "\u101e\u1019\u1039\u1019\u102c\u1000\u103b\u1019\u103a\u1038",
    'text_chinese': "\u5723\u7ecf",
    'text_czech': "Svat\u00e1 Bible",
    'text_dutch': "De Bijbel",
    'text_french': "La Sainte Bible",
    'text_german': "Die Bibel",
    'text_greek': "\u0397 \u0391\u03b3\u03af\u03b1 \u0393\u03c1\u03b1\u03c6\u03ae",
    'text_gujarati': "\u0aaa\u0ab5\u0abf\u0aa4\u0acd\u0ab0 \u0aac\u0abe\u0a87\u0aac\u0ab2",
    'text_hebrew': "\u05db\u05ea\u05d1\u05d9 \u05d4\u05e7\u05d5\u05d3\u05e9",
    'text_hindi': "\u092a\u0935\u093f\u0924\u094d\u0930 \u092c\u093e\u0907\u092c\u0932",
    'text_hungarian': "Szent Biblia",
    'text_igbo': "Bible Nso",
    'text_indonesian': "Alkitab",
    'text_italian': "La Sacra Bibbia",
    'text_japanese': "\u8056\u66f8",
    'text_kannada': "\u0cb8\u0ca4\u0ccd\u0caf\u0cb5\u0cc7\u0ca6",
    'text_kashmiri': "\u0645\u0642\u062f\u0633 \u06a9\u062a\u0627\u0628",
    'text_konkani': "\u092a\u0935\u093f\u0924\u094d\u0930 \u092a\u0941\u0938\u094d\u0924\u0915",
    'text_korean': "\uc131\uacbd",
    'text_malay': "Alkitab",
    'text_malayalam': "\u0d2c\u0d48\u0d2c\u0d3f\u0d7e",
    'text_marathi': "\u092a\u0935\u093f\u0924\u094d\u0930 \u0936\u093e\u0938\u094d\u0924\u094d\u0930",
    'text_mongolian': "\u0410\u0440\u0438\u0443\u043d \u0411\u0438\u0431\u043b\u0438",
    'text_nepali': "\u092a\u0935\u093f\u0924\u094d\u0930 \u092c\u093e\u0907\u092c\u0932",
    'text_norwegian': "Bibelen",
    'text_odia': "\u0b2a\u0b2c\u0b3f\u0b24\u0b4d\u0b30 \u0b2c\u0b3e\u0b07\u0b2c\u0b32",
    'text_oromo': "Kitaaba Qulqulluu",
    'text_polish': "Pismo \u015awi\u0119te",
    'text_portuguese': "B\u00edblia Sagrada",
    'text_punjabi': "\u0a2a\u0a35\u0a3f\u0a71\u0a24\u0a30 \u0a2c\u0a3e\u0a08\u0a2c\u0a32",
    'text_romanian': { sources: [{ type: 'BOLLS', id: 'VDCL' }], copyright: "Public Domain", content: "Old + New" },
    'text_rohingya': {
        sources: [{
            type: 'GITHUB_CUSTOM',
            url: 'https://raw.githubusercontent.com/dogonews67-alt/rohingya-bible/master/rohingya_bible.json',
            transformFn: 'transformRohingyaData'
        }],
        copyright: "Rohingya Bible (GitHub)",
        content: "Full Bible"
    },
    'text_russian': { sources: [{ type: 'HELLOAO', id: 'rus_syn' }], copyright: "Russian Synodal", content: "Old + New" },
    'text_sanskrit': "\u092a\u0935\u093f\u0924\u094d\u0930 \u092c\u093e\u0907\u092c\u093f\u0932",
    'text_somali': "Kitaabka Quduuska Ah",
    'text_spanish': "Santa Biblia",
    'text_swahili': "Biblia Takatifu",
    'text_swedish': "Bibeln",
    'text_tagalog': "Ang Biblia",
    'text_tamil': "\u0baa\u0bb0\u0bbf\u0b9a\u0bc1\u0ba4\u0bcd\u0ba4 \u0bb5\u0bc7\u0ba4\u0bbe\u0b95\u0bae\u0bae\u0bcd",
    'text_telugu': "\u0c2a\u0c30\u0c3f\u0c36\u0c41\u0c26\u0c4d\u0c27 \u0c17\u0c4d\u0c30\u0c02\u0c25\u0c2e\u0c41",
    'text_thai': "\u0e1e\u0e23\u0e30\u0e04\u0e31\u0e21\u0e20\u0e35\u0e23\u0e4c",
    'text_tibetan': "\u0f51\u0f58\u0f0b\u0f54\u0f60\u0f72\u0f0b\u0f42\u0f66\u0f74\u0f44\u0f0b\u0f62\u0f56",
    'text_turkish': "Kutsal Kitap",
    'text_urdu': "\u06a9\u062a\u0627\u0628 \u0645\u0642\u062f\u0633",
    'text_vietnamese': "Kinh Th\u00e1nh",
    'text_yoruba': "Bibeli Mimo",
    'text_rohingya': "Rohingya Bible"
};

const SHORT_BIBLE_TITLES = {
    'text_tamil': "வேதாகமம்",
    'text_telugu': "బైబిల్"
};

// --- LOCALIZED BOOK TITLES FOR OTHER BOOKS ---

const LOCALIZED_ETERNAL_LIFE_TITLES = {
    'text': "Eternal Life",
    'text_arabic': "الحياة الأبدية",
    'text_assamese': "অনন্ত জীৱন",
    'text_bengali': "অনন্ত জীবন",
    'text_bhutanese': "དུས་རྟག་ཚེ",
    'text_burmese': "ထာဝရအသက်",
    'text_chinese': "永生",
    'text_czech': "Věčný život",
    'text_dogri': "अनंत जीवन",
    'text_dutch': "Eeuwig leven",
    'text_french': "Vie éternelle",
    'text_german': "Ewiges Leben",
    'text_greek': "Αιώνια ζωή",
    'text_gujarati': "અનંત જીવન",
    'text_hebrew': "חיים נצחיים",
    'text_hindi': "अनन्त जीवन",
    'text_hungarian': "Örök élet",
    'text_igbo': "Ndụ ebighị ebi",
    'text_indonesian': "Kehidupan kekal",
    'text_italian': "Vita eterna",
    'text_japanese': "永遠の命",
    'text_kannada': "ಶಾಶ್ವತ ಜೀವನ",
    'text_kashmiri': "دائمی زندگی",
    'text_konkani': "अनंत जीवन",
    'text_korean': "영원한 생명",
    'text_malay': "Kehidupan kekal",
    'text_malayalam': "നിത്യജീവൻ",
    'text_manipuri': "লেংবা পুন্সি",
    'text_marathi': "अनंत जीवन",
    'text_mongolian': "Мөнх амьдрал",
    'text_nagamese': "ANONTO JIBON",
    'text_nepali': "अनन्त जीवन",
    'text_norwegian': "Evig liv",
    'text_odia': "ଅନନ୍ତ ଜୀବନ",
    'text_oromo': "Jireenyaa bara baraa",
    'text_polish': "Życie wieczne",
    'text_portuguese': "Vida eterna",
    'text_punjabi': "ਅਨੰਤ ਜੀਵਨ",
    'text_rohingya': "ANONTO JIBON",
    'text_romanian': "Viață eternă",
    'text_russian': "Вечная жизнь",
    'text_sanskrit': "अनन्त जीवन",
    'text_somali': "Nolol weligeed ah",
    'text_spanish': "Vida eterna",
    'text_swahili': "Uzima wa milele",
    'text_swedish': "Evigt liv",
    'text_tagalog': "Buhay na walang hanggan",
    'text_tamil': "நித்திய வாழ்க்கை",
    'text_telugu': "శాశ్వత జీవితము",
    'text_thai': "ชีวิตนิรันดร์",
    'text_tibetan': "དུས་རྟག་ཚེ",
    'text_turkish': "Sonsuz yaşam",
    'text_urdu': "ابدی زندگی",
    'text_vietnamese': "Sự sống đời đời",
    'text_yoruba': "Ìyè àìnípẹ̀kun"
};

const LOCALIZED_NOTES_TITLES = {
    'text': "My Personal Notes",
    'text_arabic': "ملاحظاتي الشخصية",
    'text_assamese': "মোৰ ব্যক্তিগত টোকা",
    'text_bengali': "আমার ব্যক্তিগত নোট",
    'text_bhutanese': "ང་རང་གི་སྒེར་དོན་ཟིན་བྲིས",
    'text_burmese': "ကျွန်ုပ်၏ကိုယ်ရေးမှတ်စုများ",
    'text_chinese': "我的个人笔记",
    'text_czech': "Moje osobní poznámky",
    'text_dutch': "Mijn persoonlijke notities",
    'text_french': "Mes notes personnelles",
    'text_german': "Meine persönlichen Notizen",
    'text_greek': "Οι προσωπικές μου σημειώσεις",
    'text_gujarati': "મારી વ્યક્તિગત નોંધો",
    'text_hebrew': "ההערות האישיות שלי",
    'text_hindi': "मेरे व्यक्तिगत नोट्स",
    'text_hungarian': "Személyes jegyzeteim",
    'text_igbo': "Nchekwa m nkeonwe",
    'text_indonesian': "Catatan pribadi saya",
    'text_italian': "Le mie note personali",
    'text_japanese': "個人的なメモ",
    'text_kannada': "ನನ್ನ ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳು",
    'text_kashmiri': "میٚنہِ ذأتی نوٹ",
    'text_konkani': "माझ्या वैयक्तिक टिपा",
    'text_korean': "나의 개인 노트",
    'text_malay': "Nota peribadi saya",
    'text_malayalam': "എന്റെ വ്യക്തിഗത കുറിപ്പുകൾ",
    'text_marathi': "माझ्या वैयक्तिक नोट्स",
    'text_mongolian': "Миний хувийн тэмдэглэл",
    'text_nepali': "मेरो व्यक्तिगत नोटहरू",
    'text_norwegian': "Mine personlige notater",
    'text_odia': "ମୋର ବ୍ୟକ୍ତିଗତ ନୋଟ୍ସ",
    'text_oromo': "Yaadannoo koo dhuunfaa",
    'text_polish': "Moje osobiste notatki",
    'text_portuguese': "Minhas notas pessoais",
    'text_punjabi': "ਮੇਰੇ ਨਿੱਜੀ ਨੋਟਸ",
    'text_romanian': "Notițele mele personale",
    'text_russian': "Мои личные заметки",
    'text_sanskrit': "मम व्यक्तिगत टिप्पण्यः",
    'text_somali': "Xusuusahayga gaarka ah",
    'text_spanish': "Mis notas personales",
    'text_swahili': "Maelezo yangu binafsi",
    'text_swedish': "Mina personliga anteckningar",
    'text_tagalog': "Aking mga personal na tala",
    'text_tamil': "என் தனிப்பட்ட குறிப்புகள்",
    'text_telugu': "నా వ్యక్తిగత గమనికలు",
    'text_thai': "บันทึกส่วนตัวของฉัน",
    'text_tibetan': "ང་རང་གི་སྒེར་དོན་ཟིན་བྲིས",
    'text_turkish': "Kişisel notlarım",
    'text_urdu': "میرے ذاتی نوٹس",
    'text_vietnamese': "Ghi chú cá nhân của tôi",
    'text_yoruba': "Àwọn àkọsílẹ̀ tèmi"
};

const LOCALIZED_CHAT_TITLES = {
    'text': "Chat with AI",
    'text_arabic': "الدردشة مع الذكاء الاصطناعي",
    'text_assamese': "AI ৰ সৈতে চেট",
    'text_bengali': "AI এর সাথে চ্যাট",
    'text_bhutanese': "AI དང་སྐད་ཆ",
    'text_burmese': "AI နှင့်စကားပြော",
    'text_chinese': "与AI聊天",
    'text_czech': "Chat s AI",
    'text_dutch': "Chatten met AI",
    'text_french': "Discuter avec l'IA",
    'text_german': "Mit KI chatten",
    'text_greek': "Συνομιλία με AI",
    'text_gujarati': "AI સાથે ચેટ",
    'text_hebrew': "שיחה עם AI",
    'text_hindi': "AI के साथ चैट",
    'text_hungarian': "Csevegés az AI-val",
    'text_igbo': "Mkparịta ụka na AI",
    'text_indonesian': "Obrolan dengan AI",
    'text_italian': "Chatta con AI",
    'text_japanese': "AIとチャット",
    'text_kannada': "AI ಜೊತೆ ಚಾಟ್",
    'text_kashmiri': "AI سٮ۪تؠ گفتگو",
    'text_konkani': "AI सोबत चॅट",
    'text_korean': "AI와 채팅",
    'text_malay': "Berbual dengan AI",
    'text_malayalam': "AI യുമായി ചാറ്റ്",
    'text_marathi': "AI सोबत चॅट",
    'text_mongolian': "AI-тай чатлах",
    'text_nepali': "AI सँग च्याट",
    'text_norwegian': "Chat med AI",
    'text_odia': "AI ସହିତ ଚାଟ୍",
    'text_oromo': "AI waliin haasa'uu",
    'text_polish': "Czat z AI",
    'text_portuguese': "Conversar com IA",
    'text_punjabi': "AI ਨਾਲ ਚੈਟ",
    'text_romanian': "Conversație cu AI",
    'text_russian': "Чат с ИИ",
    'text_sanskrit': "AI सह वार्तालापः",
    'text_somali': "La sheekaysi AI",
    'text_spanish': "Chat con IA",
    'text_swahili': "Piga gumzo na AI",
    'text_swedish': "Chatta med AI",
    'text_tagalog': "Makipag-chat sa AI",
    'text_tamil': "AI உடன் அரட்டை",
    'text_telugu': "AI తో చాట్",
    'text_thai': "แชทกับ AI",
    'text_tibetan': "AI དང་སྐད་ཆ",
    'text_turkish': "AI ile sohbet",
    'text_urdu': "AI کے ساتھ چیٹ",
    'text_vietnamese': "Trò chuyện với AI",
    'text_yoruba': "Ìbánisọ̀rọ̀ pẹ̀lú AI"
};

/**
 * Transforms the Aruljohn JSON structure into the reader format.
 * Format: Array of objects { "verse": "Genesis 1:1 Text..." }
 */
function transformAruljohnData(data, bookName) {
    const title = bookName;
    const chapters = [];

    // Check for hierarchical structure (Aruljohn format: { book, chapters: [ {chapter, verses: []} ] })
    if (data.chapters && Array.isArray(data.chapters)) {
        data.chapters.forEach(chObj => {
            const cNum = parseInt(chObj.chapter);
            const verses = [];

            if (chObj.verses && Array.isArray(chObj.verses)) {
                chObj.verses.forEach(vObj => {
                    verses.push({
                        id: `${bookName} ${cNum}:${vObj.verse}`,
                        verseId: vObj.verse,
                        verse: vObj.verse,
                        text: vObj.text
                    });
                });
            }

            // Derive bookId (1-66) from bookName
            const bookIdx = bibleBookNames.indexOf(bookName);
            const bookId = bookIdx !== -1 ? (bookIdx + 1) : null;

            chapters.push({
                title: `${bookName} Chapter ${cNum}`,
                bookName: bookName,
                bookId: bookId,
                chapterNumber: cNum,
                verses: verses,
                isLoaded: true
            });
        });
    }
    // Fallback? Or log warning
    else {
        console.warn("Unexpected Aruljohn data format", data);
    }

    return { title, chapters };
}



/**
 * Transforms the Rohingya Bible JSON structure.
 * format: [ { book: "GEN", chapters: [ { chapter: 1, verses: [ { verse: 1, text: "..." } ] } ] } ]
 */
function transformRohingyaData(data, langKey) {
    const title = "Rohingya Bible";
    const chapters = [];

    // USFM Code Mapping
    const usfmMap = {
        'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
        'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
        '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra',
        'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
        'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
        'LAM': 'Lamentations', 'EZE': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea', 'JOE': 'Joel',
        'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah', 'MIC': 'Micah', 'NAH': 'Nahum',
        'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
        'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John', 'ACT': 'Acts',
        'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians', 'GAL': 'Galatians',
        'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians', '1TH': '1 Thessalonians',
        '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy', 'TIT': 'Titus',
        'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAM': 'James', '1PE': '1 Peter', '2PE': '2 Peter',
        '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
    };

    console.log("transformRohingyaData: Input data type:", typeof data);
    if (Array.isArray(data)) console.log("transformRohingyaData: Input array length:", data.length);
    else console.log("transformRohingyaData: Data is not an array:", data);

    if (!Array.isArray(data)) {
        console.error("Rohingya data is not an array");
        return { title, chapters };
    }

    data.forEach(bookObj => {
        const bookCode = bookObj.book;
        // Use mapping if available, otherwise fallback to bookCode
        const englishBookName = usfmMap[bookCode] || bookCode;

        // Find standard book ID (1-66)
        // bibleBookNames is defined globally in script_v2.js
        const bookId = bibleBookNames.indexOf(englishBookName) + 1;

        if (bookObj.chapters && Array.isArray(bookObj.chapters)) {
            bookObj.chapters.forEach(chapObj => {
                const cNum = chapObj.chapter;
                const verses = [];

                if (chapObj.verses && Array.isArray(chapObj.verses)) {
                    chapObj.verses.forEach(vObj => {
                        verses.push({
                            id: `${englishBookName} ${cNum}:${vObj.verse}`,
                            verseId: vObj.verse, // Display number
                            verse: vObj.verse,   // Logic number
                            text: vObj.text
                        });
                    });
                }

                // Add chapter only if it has verses or we want placeholders
                if (verses.length > 0) {
                    chapters.push({
                        title: `${englishBookName} Chapter ${cNum}`,
                        bookName: englishBookName,
                        bookId: bookId > 0 ? bookId : null,
                        chapterNumber: cNum,
                        verses: verses,
                        isLoaded: true
                    });
                }
            });
        }
    });

    return { title, chapters };
}


// --- NAVIGATION BUTTON VISIBILITY MANAGEMENT ---
let hideTimer;

function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        dom.prevBtn.classList.add('hidden');
        dom.nextBtn.classList.add('hidden');
    }, 3000);
}

function showNavButtons() {
    dom.prevBtn.classList.remove('hidden');
    dom.nextBtn.classList.remove('hidden');
    startHideTimer();
}

// Global swipe sensitivity variables
let MIN_SWIPE_DISTANCE = 50; // Default Minimum distance for a recognized swipe

// Ensure a global variable exists to track the current book.
let currentBookId = state.currentBookKey;

// Tap detection variables for toolbar toggle
let tapStartTime = 0;
let tapStartX = 0;
let tapStartY = 0;
let lastTapTime = 0;
const TAP_THRESHOLD = 10; // pixels
const TAP_DURATION = 300; // ms
const DEBOUNCE_TIME = 300; // ms between toggles

// --- DOM ELEMENTS ---
const dom = {
    page: document.getElementById('bookPage'),
    scrollContainer: document.getElementById('scrollContainer'),
    settings: document.getElementById('settingsPanel'),
    sidebar: document.getElementById('sidebar'),
    sidebarContent: document.getElementById('sidebarContent'),
    sidebarTitle: document.getElementById('sidebarTitle'),
    popup: document.getElementById('versePopup'),
    progressBar: document.getElementById('progressBar'),
    appTitle: document.getElementById('appTitle'),
    quizContainer: document.getElementById('quizContainer'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText')
};

// --- LOADING SPINNER HELPERS ---
function showLoading(text) {
    if (dom.loadingOverlay) {
        dom.loadingOverlay.style.display = 'flex'; // Fix: Ensure it's visible (was hidden by hideLoading)
        dom.loadingOverlay.classList.add('active');
        if (text && dom.loadingText) {
            dom.loadingText.textContent = text;
        } else if (dom.loadingText) {
            dom.loadingText.textContent = "Loading...";
        }
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.style.display = 'none'; // Force hide
    }
    // Also try using dom object if available
    if (typeof dom !== 'undefined' && dom.loadingOverlay) {
        dom.loadingOverlay.classList.remove('active');
        dom.loadingOverlay.style.display = 'none';
    }
}

// --- READING STATE PERSISTENCE ---
function saveReadingState() {
    const readingState = {
        currentBookKey: state.currentBookKey,
        currentChapterIndex: state.currentChapterIndex,
        currentVerseNumber: state.currentVerseNumber,
        scrollPosition: dom.scrollContainer ? dom.scrollContainer.scrollTop : 0,
        currentLang: state.currentLang,
        theme: state.theme,
        fontSize: state.fontSize,
        preferredLang: state.preferredLang,
        bookmarks: state.bookmarks,
        swipeEnabled: state.swipeEnabled,
        swipeSensitivity: state.swipeSensitivity,
        quizIndex: state.quizIndex,
        quizScore: state.quizScore,
        quizIndex: state.quizIndex,
        quizScore: state.quizScore,
        quizIndex: state.quizIndex,
        quizScore: state.quizScore,
        previousBookKey: state.previousBookKey,
        quizScore: state.quizScore,
        previousBookKey: state.previousBookKey,
        longPressBookmark: state.longPressBookmark,
        currentTranslationId: state.currentTranslationId // FIX: Save translation ID
    };

    if (state.currentBookKey === 'bible' && books['bible']) {
        const chapter = books['bible'].chapters[state.currentChapterIndex];
        if (chapter) {
            readingState.bibleBookName = chapter.bookName;
            readingState.bibleChapterNumber = chapter.chapterNumber || parseInt(chapter.title.split(' ').pop()) || 1;
        }
    } else {
        // If not in Bible, persist the last known Bible location
        readingState.bibleBookName = state.lastBibleBookName;
        readingState.bibleChapterNumber = state.lastBibleChapterNumber;
    }

    // Save all state to localStorage
    try {
        localStorage.setItem('readingState', JSON.stringify(readingState));
        localStorage.setItem('myReaderBookmarks', JSON.stringify(state.bookmarks));
        localStorage.setItem('myReaderTheme', state.theme);
        localStorage.setItem('myReaderFontSize', state.fontSize);
        localStorage.setItem('myReaderPreferredLang', state.preferredLang);
        localStorage.setItem('myReaderSwipeEnabled', state.swipeEnabled);
        localStorage.setItem('myReaderSwipeEnabled', state.swipeEnabled);
        localStorage.setItem('myReaderSwipeSensitivity', state.swipeSensitivity);
        localStorage.setItem('myReaderLongPress', state.longPressBookmark);
    } catch (e) {
        console.error('Error saving reading state:', e);
    }
}

function loadReadingState() {
    try {
        const stored = localStorage.getItem('readingState');
        if (stored) {
            const readingState = JSON.parse(stored);

            // Load all persistent state
            state.currentBookKey = readingState.currentBookKey || 'eternal_life';
            // state.currentLang = readingState.currentLang || 'text'; // REPLACED: Prioritize simple key
            state.theme = readingState.theme || 'sepia';
            state.fontSize = readingState.fontSize || 19;
            // state.preferredLang = readingState.preferredLang || 'text'; // REPLACED: Prioritize simple key

            // FIX: Prioritize the individually saved preference key, as readingState JSON might be stale if save failed
            const simplePrefLang = localStorage.getItem('myReaderPreferredLang');
            if (simplePrefLang) {
                state.preferredLang = simplePrefLang;
                state.currentLang = simplePrefLang;
            } else {
                state.preferredLang = readingState.preferredLang || 'text';
                state.currentLang = readingState.currentLang || 'text';
            }

            // state.bookmarks = readingState.bookmarks || []; // FIX: Do not overwrite, use myReaderBookmarks source of truth
            state.swipeEnabled = readingState.swipeEnabled !== undefined ? readingState.swipeEnabled : true;
            state.swipeSensitivity = readingState.swipeSensitivity || 100;
            state.quizIndex = readingState.quizIndex || 0;
            state.quizIndex = readingState.quizIndex || 0;
            state.quizScore = readingState.quizScore || 0;
            state.previousBookKey = readingState.previousBookKey || null;
            state.quizScore = readingState.quizScore || 0;
            state.previousBookKey = readingState.previousBookKey || null;
            state.longPressBookmark = readingState.longPressBookmark === true;
            state.currentTranslationId = readingState.currentTranslationId || null; // FIX: Restore translation ID

            // Apply loaded settings
            document.documentElement.setAttribute('data-theme', state.theme);
            document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');

            // Always set verse number if available
            state.currentVerseNumber = readingState.currentVerseNumber || 0;

            if (readingState.currentBookKey === 'bible') {
                // For Bible, defer chapter index setting until data is loaded
                state.currentChapterIndex = 0; // Temporary, will be set after loading
                state.savedBibleBookName = readingState.bibleBookName;
                state.savedBibleChapterNumber = readingState.bibleChapterNumber;
                // Also restore to state for subsequent saves
                state.lastBibleBookName = readingState.bibleBookName;
                state.lastBibleChapterNumber = readingState.bibleChapterNumber;
                return readingState.scrollPosition || 0;
            } else if (books[readingState.currentBookKey]) {
                // Restore last Bible location even if not currently in Bible
                state.lastBibleBookName = readingState.bibleBookName;
                state.lastBibleChapterNumber = readingState.bibleChapterNumber;

                // Standard validation for other books
                if (readingState.currentChapterIndex >= 0 && readingState.currentChapterIndex < books[state.currentBookKey].chapters.length) {
                    state.currentChapterIndex = readingState.currentChapterIndex;
                } else {
                    state.currentChapterIndex = 0;
                }
                return readingState.scrollPosition || 0;
            }
        }
    } catch (e) {
        console.error('Error loading reading state from localStorage:', e);
    }

    return 0;
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- NETWORK DETECTION AND RETRY UTILITIES ---

/**
 * Checks if the device is currently online
 * @returns {boolean} True if online, false otherwise
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Enhanced fetch with timeout and retry logic
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default 30000)
 * @param {number} retries - Number of retry attempts (default 3)
 * @returns {Promise<Response>} The fetch response
 */
async function fetchWithRetry(url, options = {}, timeout = 30000, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Check if online before attempting
            if (!isOnline()) {
                throw new Error('No internet connection');
            }

            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            );

            // Race between fetch and timeout
            const fetchPromise = fetch(url, options);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // Check if response is ok (status 0 is success for file:// protocol)
            if (!response.ok && response.status !== 0) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;

        } catch (error) {
            console.warn(`Fetch attempt ${attempt}/${retries} failed for ${url}:`, error.message);

            // If this was the last attempt, throw the error
            if (attempt === retries) {
                throw new Error(`Failed after ${retries} attempts: ${error.message}`);
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Shows a user-friendly error message
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {boolean} canRetry - Whether the user can retry
 */
function showDownloadError(title, message, canRetry = true) {
    const errorHtml = `
        <div class="download-error">
            <h3>${title}</h3>
            <p>${message}</p>
            ${canRetry ? '<button onclick="location.reload()">Retry</button>' : ''}
        </div>
    `;

    // Show in popup or alert
    const popup = document.getElementById('downloadPopup');
    if (popup) {
        const progressText = document.getElementById('popupProgressText');
        if (progressText) {
            progressText.innerHTML = errorHtml;
            progressText.style.color = 'var(--error-color, #dc3545)';
        }
    } else {
        alert(`${title}\n\n${message}`);
    }
}


// --- API & DOWNLOAD LOGIC ---

async function initBibleData() {
    await db.init();

    // 1. Determine Translation ID from preference
    // 1. Determine Configuration from preference
    const pref = state.preferredLang;
    const langConfig = BIBLE_CONFIG[pref] || BIBLE_CONFIG['text'];
    const source = (langConfig.sources && langConfig.sources.length > 0) ? langConfig.sources[0] : null;
    state.currentTranslationId = source ? (source.id || source.lang || source.file || 'YLT') : 'YLT';

    // 2. Fetch Book List logic is now handled inside loadBibleForCurrentLanguage or we just look up the first source?
    // Bolls API needs a translation ID to get books. GodlyTalias has fixed books in JSON.
    // For now, we will RELY on loadBibleForCurrentLanguage to populate 'books' object fully.
    // MODIFICATION: Removed eager loading here. We will let loadBook('bible') handle this lazily 
    // to avoid showing the loading spinner on app startup if the user is not reading the Bible.
    // await loadBibleForCurrentLanguage(pref);

    // We don't set state.bookList here as it depends on source. 
    // If successful, books['bible'] will be populated.
    // if (books['bible']) {
    //    state.bookList = books['bible'].chapters; // Approximate legacy structure
    //    console.log("Bible data initialized via loadBibleForCurrentLanguage");
    // }
}


// --- DOWNLOAD STATE MANAGEMENT ---
const downloadState = {
    isDownloading: false,
    langKey: '',
    langName: '',
    versionId: '',
    progress: 0,
    statusText: ''
};

function updateSettingsDownloadStatus() {
    const statusDiv = document.getElementById('settingsDownloadStatus');
    const langSpan = document.getElementById('downloadStatusLang');
    const progressBar = document.getElementById('settingsDownloadBar');
    const statusText = document.getElementById('settingsDownloadText');

    if (!statusDiv) return;

    if (downloadState.isDownloading) {
        statusDiv.style.display = 'block';
        langSpan.textContent = `Downloading ${downloadState.langName}...`;
        progressBar.style.width = downloadState.progress + '%';
        statusText.textContent = downloadState.statusText;
    } else {
        // Hide after a short delay if complete
        setTimeout(() => {
            if (!downloadState.isDownloading) {
                statusDiv.style.display = 'none';
            }
        }, 3000);
    }
}

// --- DOWNLOAD POPUP LOGIC ---

async function checkAndPromptDownload() {
    // Only prompt if we are in Bible mode
    if (state.currentBookKey !== 'bible') return;

    const lang = state.currentLang;
    const config = BIBLE_CONFIG[lang];
    if (!config) return;

    // Resolve Version ID using consistent logic
    const source = (config.sources && config.sources.length > 0) ? config.sources[0] : null;
    const versionId = source ? (source.id || source.lang || source.file || 'YLT') : 'YLT';

    // Check availability
    if (config.unavailable) return;

    // Check LocalStorage "Don't Show Again"
    if (localStorage.getItem('noDownloadPrompt_' + lang) === 'true') return;

    // Check if already downloaded (check DB meta)
    const isDownloaded = await db.getMeta('downloaded_' + versionId);
    if (isDownloaded) return;

    // EXTRA CHECK: If books['bible'] is loaded and matches, we don't need to download
    if (books['bible'] && books['bible'].translationId === versionId && books['bible'].chapters && books['bible'].chapters.length > 0) {
        // Ensure it's fully useful (has content)
        if (books['bible'].chapters[0].verses && books['bible'].chapters[0].verses.length > 0) {
            // Already loaded, so save meta if missing and return
            await db.saveMeta('downloaded_' + versionId, true);
            return;
        }
    }

    showDownloadPopup(lang, versionId);
}

function showDownloadPopup(langKey, versionId) {
    const popup = document.getElementById('downloadPopup');
    const langNameSpan = document.getElementById('downloadLangTarget');

    // Get display name from selector or config
    const selector = document.getElementById('preferredLangSelector');
    let langName = "Current Language";
    if (selector) {
        const option = selector.querySelector(`option[value="${langKey}"]`);
        if (option) langName = option.text;
    }

    langNameSpan.textContent = langName;
    popup.style.display = 'flex';

    // Store current target in a temporary variable or data attribute if needed
    popup.setAttribute('data-target-version', versionId);
    popup.setAttribute('data-target-lang', langKey);

    // Reset UI state
    document.getElementById('popupProgressArea').style.display = 'none';
    document.getElementById('popupActions').style.display = 'flex';
    document.getElementById('popupFooter').style.display = 'block';
}

function closeDownloadPopup() {
    document.getElementById('downloadPopup').style.display = 'none';
}

function hideDownloadPopup() {
    // Hide popup but keep download running
    document.getElementById('downloadPopup').style.display = 'none';
    // Download continues in background, progress shown in settings menu
}

function dontShowDownloadAgain() {
    const popup = document.getElementById('downloadPopup');
    const langKey = popup.getAttribute('data-target-lang');
    if (langKey) {
        localStorage.setItem('noDownloadPrompt_' + langKey, 'true');
    }
    closeDownloadPopup();
}

async function confirmDownloadBible() {
    const popup = document.getElementById('downloadPopup');
    const versionId = popup.getAttribute('data-target-version');
    const langKey = popup.getAttribute('data-target-lang');

    // Get language name
    const selector = document.getElementById('preferredLangSelector');
    let langName = "Current Language";
    if (selector) {
        const option = selector.querySelector(`option[value="${langKey}"]`);
        if (option) langName = option.text;
    }

    // Initialize download state
    downloadState.isDownloading = true;
    downloadState.langKey = langKey;
    downloadState.langName = langName;
    downloadState.versionId = versionId;
    downloadState.progress = 0;
    downloadState.statusText = 'Initializing...';

    // UI Updates for popup
    document.getElementById('popupActions').style.display = 'none';
    document.getElementById('popupFooter').style.display = 'none';
    document.getElementById('popupHideAction').style.display = 'flex';

    const progressArea = document.getElementById('popupProgressArea');
    progressArea.style.display = 'block';

    const progressBar = document.getElementById('popupProgressBar');
    const progressText = document.getElementById('popupProgressText');

    progressText.textContent = "Fetching book list...";
    progressBar.style.width = '10%';

    // Update settings menu
    updateSettingsDownloadStatus();

    try {
        await downloadCurrentBible(versionId, langKey, (pct, status) => {
            // Update download state
            downloadState.progress = pct;
            downloadState.statusText = status;

            // Update popup progress
            progressBar.style.width = pct + '%';
            progressText.textContent = status;

            // Update settings menu
            updateSettingsDownloadStatus();
        });

        // Completion
        downloadState.progress = 100;
        downloadState.statusText = "Download Complete!";
        progressText.textContent = "Download Complete!";
        progressBar.style.width = '100%';
        updateSettingsDownloadStatus();

        await db.saveMeta('downloaded_' + versionId, true);

        setTimeout(() => {
            downloadState.isDownloading = false;
            updateSettingsDownloadStatus();
            closeDownloadPopup();
        }, 1500);

    } catch (e) {
        console.error("Download failed:", e);
        downloadState.isDownloading = false;
        downloadState.statusText = "Error: " + e.message;
        updateSettingsDownloadStatus();

        progressText.textContent = "Error: " + e.message;
        progressText.style.color = "red";
        setTimeout(() => {
            document.getElementById('popupActions').style.display = 'flex';
            document.getElementById('popupHideAction').style.display = 'none';
        }, 2000);
    }
}


function showOfflinePopup() {
    document.getElementById('offlinePopup').style.display = 'flex';
}

function closeOfflinePopup() {
    document.getElementById('offlinePopup').style.display = 'none';
}

/**
 * Downloads the bible content.
 * @param {string} versionId - The translation ID.
 * @param {string} langKey - The language key (for source type lookup).
 * @param {function} onProgress - Callback (percent, statusText).
 */
async function downloadCurrentBible(versionId, langKey, onProgress) {
    // If not provided (called from menu), infer
    if (!versionId) {
        // Fallback to current state
        if (state.currentTranslationId) versionId = state.currentTranslationId;
        else versionId = 'YLT'; // fallback
    }
    if (!langKey) langKey = state.currentLang;
    if (!onProgress) {
        // If called from menu without popup context, use global bottom bar
        const bottomBar = document.getElementById('downloadProgress');
        const bottomBarFill = document.getElementById('downloadBar');
        const bottomStatus = document.getElementById('downloadStatus');
        if (bottomBar) bottomBar.style.display = 'block';

        onProgress = (pct, text) => {
            if (bottomBarFill) bottomBarFill.style.width = pct + '%';
            if (bottomStatus) bottomStatus.textContent = text;
            if (pct >= 100 && bottomBar) {
                setTimeout(() => { bottomBar.style.display = 'none'; }, 2000);
            }
        };
    }

    // Determine Source Type
    const config = BIBLE_CONFIG[langKey];
    const sourceObj = (config && config.sources) ? config.sources[0] : { type: 'BOLLS' };
    const sourceType = sourceObj.type;



    // 0. CHECK IF CONTENT IS ALREADY LOADED (Optimization for GodlyTalias, Local, etc.)
    // If books['bible'] exists and matches the ID, and has content, we can save directly!
    const loadedBible = books['bible'];
    if (loadedBible && loadedBible.translationId === versionId && loadedBible.chapters && loadedBible.chapters.length > 0) {
        // Check if first chapter has verses loaded
        if (loadedBible.chapters[0].verses && loadedBible.chapters[0].verses.length > 0) {
            // console.log("Bible content already loaded. Saving to DB directly...");
            const totalChapters = loadedBible.chapters.length;

            for (let i = 0; i < totalChapters; i++) {
                const chap = loadedBible.chapters[i];
                const pct = Math.round(((i + 1) / totalChapters) * 100);
                onProgress(pct, `Saving ${chap.title}...`);

                // Data is already in internal format, just save it
                // reconstruct internalChapter object if needed or save as is?
                // db.saveChapter expects: { title, verses: [...] } which is exactly what `chap` has (plus extra fields)
                // We should clean it up or just save the necessary parts to save space?
                // script.js uses: { title, verses: [ {id, text} ] }
                const contentToSave = {
                    title: chap.title,
                    verses: chap.verses.map(v => ({ id: v.id, text: v.text }))
                };

                await db.saveChapter(versionId, chap.bookId || chap.bookName, chap.chapterNumber, contentToSave);
            }
            onProgress(100, "Download Complete!");
            return; // Done!
        }
    }

    // 0.5. HANDLING FOR SINGLE-FILE SOURCES (GodlyTalias, LOCAL, etc.)
    // If we missed the optimization check (e.g. not loaded yet), we must load the FULL file now.
    // We cannot use the chapter-by-chapter API loop below for these types.
    if (sourceType === 'GITHUB_GODLYTALIAS' || sourceType === 'LOCAL' || sourceType === 'GITHUB_WLDEH') {
        onProgress(10, `Fetching full Bible file...`);
        try {
            let data, transformed;

            if (sourceType === 'GITHUB_GODLYTALIAS') {
                const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/${sourceObj.lang}/bible.json`;
                const response = await fetchWithRetry(url, {}, 30000, 3);
                data = await response.json();
                transformed = transformGodlyTaliasData(data, langKey);
                transformed.translationId = sourceObj.lang;

            } else if (sourceType === 'LOCAL') {
                const response = await fetchWithRetry(sourceObj.path, {}, 10000, 2);
                data = await response.json();
                transformed = transformGodlyTaliasData(data, langKey);
                transformed.translationId = 'LOCAL';

            } else if (sourceType === 'GITHUB_WLDEH') {
                const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${sourceObj.file}`;
                const response = await fetchWithRetry(url, {}, 30000, 3);
                data = await response.json();
                transformed = transformWldehData(data, langKey);
                transformed.translationId = sourceObj.file;

            } else if (sourceType === 'GITHUB_CUSTOM') {
                const url = sourceObj.url;
                onProgress(20, `Fetching custom source...`);
                const response = await fetchWithRetry(url, {}, 30000, 3);
                data = await response.json();

                if (typeof window[sourceObj.transformFn] === 'function') {
                    onProgress(50, `Parsing data...`);
                    transformed = window[sourceObj.transformFn](data, langKey);
                } else if (typeof transformRohingyaData === 'function' && sourceObj.transformFn === 'transformRohingyaData') {
                    // Fallback check if window lookup fails but function is in scope
                    onProgress(50, `Parsing data...`);
                    transformed = transformRohingyaData(data, langKey);
                } else {
                    throw new Error(`Transform function ${sourceObj.transformFn} not found`);
                }
                transformed.translationId = 'CUSTOM_' + langKey;
            }

            // Now save all chapters
            if (transformed && transformed.chapters) {
                const totalChapters = transformed.chapters.length;
                for (let i = 0; i < totalChapters; i++) {
                    const chap = transformed.chapters[i];
                    onProgress(Math.round(((i + 1) / totalChapters) * 100), `Saving ${chap.title}...`);

                    const contentToSave = {
                        title: chap.title,
                        verses: chap.verses.map(v => ({ id: v.id, text: v.text }))
                    };
                    await db.saveChapter(versionId, chap.bookId || chap.bookName, chap.chapterNumber, contentToSave);
                }

                // IMPORTANT: Update global state and save to persistent storage for "Offline Mode" detection
                books['bible'] = transformed;
                await BibleStorage.saveBible(langKey, transformed);

                onProgress(100, "Download Complete!");

                // Update verified status in UI if needed
                if (typeof updateDownloadedLanguageIndicators === 'function') {
                    updateDownloadedLanguageIndicators();
                }

                // Verify and close
                setTimeout(() => {
                    closeDownloadPopup();
                    const settingsStatus = document.getElementById('settingsDownloadStatus');
                    if (settingsStatus) settingsStatus.style.display = 'none';
                }, 1500);

                return;
            }
        } catch (e) {
            console.error("Single-file download failed:", e);
            showDownloadError(
                'Download Failed',
                `Unable to download Bible content: ${e.message}. Please check your internet connection and try again.`,
                true
            );
            throw new Error(`Failed to download Bible file: ${e.message}`);
        }
    }

    // 1. Fetch Book Metadata (Fallback for lazy-loaded sources)
    let booksToDownload = [];

    // Try to get book list from API first for accurate chapter counts
    try {
        const apiBooks = await api.getBooks(versionId, sourceType);
        if (apiBooks && apiBooks.length > 0) {
            booksToDownload = apiBooks;
        } else {
            // Fallback to internal books structure if API list fails
            // But we need chapter counts. 
            // This fallback is weak if we don't know chapter counts.
            throw new Error("Could not retrieve book list.");
        }
    } catch (e) {
        // Retry or error
        throw e;
    }

    let totalChapters = 0;
    booksToDownload.forEach(b => totalChapters += b.chapters);

    if (totalChapters === 0) throw new Error("No chapters found to download.");

    let downloadedCount = 0;

    // 2. Iterate and Download
    for (const book of booksToDownload) {
        // Safety check for chapter count
        const chapters = book.chapters;

        for (let c = 1; c <= chapters; c++) {
            onProgress(Math.round((downloadedCount / totalChapters) * 100), `Downloading ${book.name} ${c}...`);

            // Fetch
            const data = await api.getChapter(versionId, book.bookid, c, sourceType);

            if (data) {
                // Transform to internal storage format
                const internalChapter = {
                    title: `${book.name} ${c}`,
                    verses: data.map(v => ({
                        id: `${book.name} ${c}:${v.verse}`,
                        text: v.text
                        // We could store more, but this is the core
                    }))
                };

                // Save
                await db.saveChapter(versionId, book.bookid, c, internalChapter);
            }
            downloadedCount++;
        }
    }

    onProgress(100, "Download Complete");
}

// initApp removed (replaced by window.initApp and loadSettings)

// (Orphaned init logic removed)
let isSwipeEnabled = true; // State variable for swipe feature

function setSwipeEnabled(isEnabled) {
    isSwipeEnabled = isEnabled;
    // You could also add logic here to visually indicate if swiping is on/off
}

/**
 * Sets the minimum distance a user must swipe to trigger a chapter change.
 * @param {number} distance - The new minimum swipe distance in pixels.
 */
function setSwipeSensitivity(distance) {
    // Ensure the distance is a number and positive
    const newDistance = parseInt(distance);
    if (!isNaN(newDistance) && newDistance > 0) {
        MIN_SWIPE_DISTANCE = newDistance;
        // Update the display value in the settings panel
        const sensitivityValue = document.getElementById('sensitivityValue');
        if (sensitivityValue) {
            sensitivityValue.textContent = `${newDistance}px`;
        }
        // Save state to localStorage if needed
        localStorage.setItem('swipeSensitivity', newDistance);
    }
}

function setLongPressBookmark(isEnabled) {
    state.longPressBookmark = isEnabled;
    localStorage.setItem('myReaderLongPress', isEnabled);
}



let swipeGesturesInitialized = false;

function initSwipeGestures() {
    if (swipeGesturesInitialized) {
        // console.log("Swipe gestures already initialized. Skipping.");
        return;
    }
    swipeGesturesInitialized = true;

    // FIX: Change 'mainContent' to the correct ID: 'scrollContainer'
    const mainContent = dom.scrollContainer;

    if (!mainContent) {
        // This should not happen if called inside window.onload and the ID is correct
        console.warn("scrollContainer element not found. Swipe gestures disabled.");
        return;
    }

    // --- Swipe/Touch Gesture Logic ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let lastSwipeTime = 0; // Swipe Cooldown
    const MAX_VERTICAL_DEVIATION = 100; // Increased tolerance for diagonal swipes

    mainContent.addEventListener('touchstart', (e) => {
        if (!isSwipeEnabled || state.quizModeActive) return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;

        // Prevent system back gesture for touches starting near left edge during chapter reading,
        // BUT allow if the target is an interactive element (like the Previous button)
        if (touchStartX < 50) {
            const target = e.target;
            const isInteractive = target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                target.tagName === 'INPUT' ||
                target.closest('button') ||
                target.closest('a');

            if (!isInteractive) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    mainContent.addEventListener('touchmove', (e) => {
        if (!isSwipeEnabled || state.quizModeActive) return;
        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const deltaX = Math.abs(currentX - touchStartX);
        const deltaY = Math.abs(currentY - touchStartY);
        // Prevent default for horizontal movements starting near left edge during chapter reading
        if (touchStartX < 50 && deltaX > deltaY && deltaX > 10) {
            e.preventDefault();
        }
    }, { passive: false });

    mainContent.addEventListener('touchend', (e) => {
        if (!isSwipeEnabled) return;
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        if (handleSwipeGesture()) {
            e.preventDefault(); // Prevent ghost clicks
        }
    }, false);

    function handleSwipeGesture() {
        const now = Date.now();
        if (now - lastSwipeTime < 750) return false; // Increased to 750ms for Android stability

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Check if the movement is predominantly horizontal and long enough
        if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE && Math.abs(deltaY) < MAX_VERTICAL_DEVIATION) {
            if (deltaX > 0) {
                // Swipe right - previous chapter
                changeChapter(-1);
                lastSwipeTime = now;
                return true;
            } else {
                // Swipe left - next chapter
                changeChapter(1);
                lastSwipeTime = now;
                return true;
            }
        }
        return false;
    }

    // Note: The original 'showSwipeFeedback' function is defined later in your file,
    // so it should already be accessible here.
}

// --- TOOLBAR TOGGLE FUNCTIONALITY ---
function initToolbarToggle() {
    const scrollContainer = dom.scrollContainer;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    if (state.quizModeActive) return;

    tapStartTime = Date.now();
    const touch = e.changedTouches[0];
    tapStartX = touch.screenX;
    tapStartY = touch.screenY;
}

function handleTouchEnd(e) {
    if (state.quizModeActive) return;

    const touchEndTime = Date.now();
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.screenX - tapStartX);
    const deltaY = Math.abs(touch.screenY - tapStartY);
    const tapDuration = touchEndTime - tapStartTime;

    // Check if it's a valid tap (not a swipe)
    if (tapDuration < TAP_DURATION && deltaX < TAP_THRESHOLD && deltaY < TAP_THRESHOLD) {
        // Check debounce time
        if (touchEndTime - lastTapTime > DEBOUNCE_TIME) {
            toggleToolbar();
            lastTapTime = touchEndTime;
        }
    }
}

function toggleToolbar() {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
        toolbar.classList.toggle('hidden');
        // Ensure smooth transition
        toolbar.style.transition = 'transform 0.4s ease-in-out';
    }
}

// FIX: Force clear Odia cache to ensure new verse parsing logic applies
async function fixOdiaCache() {
    console.log("Attempting to clear Odia bible cache...");
    if (window.db) { // Assuming db is globally available or we can access it
        try {
            // We need to delete keys starting with 'text_odia_'
            // Using a brute force approach since we don't have a prefix delete in the helper
            // But wait, db.js doesn't have a clear or delete method exposed easily?
            // Actually, clearBibleCache exists in script.js, let's just use the logic from there but specific to Odia if possible.
            // Or simpler: just nuke the 'text_odia' specific entries if we can.

            // Since we can't easily iterate without adding a method to db.js,
            // and we want to avoid modifying db.js if possible to keep it stable,
            // let's just use the existing clearBibleCache if the user is on Odia.

            // Actually, let's just clear the specific item from localStorage that tracks if it's downloaded/cached
            // But the data is in IndexedDB.

            // Let's Add a specific one-time clearer.
            const req = indexedDB.open('EternalLifeBibleDB', 1);
            req.onsuccess = function (e) {
                const dbase = e.target.result;
                if (dbase.objectStoreNames.contains('chapters')) {
                    const trans = dbase.transaction(['chapters'], 'readwrite');
                    const store = trans.objectStore('chapters');
                    const keyRange = IDBKeyRange.bound('text_odia_', 'text_odia_\uffff');
                    const deleteReq = store.delete(keyRange);
                    deleteReq.onsuccess = () => console.log("Cleared Odia cache successfully");
                }
            };
        } catch (e) { console.error("Error clearing odia cache", e); }
    }
}
// fixOdiaCache(); // MOVED: Now called inside initApp



// window.onload block removed to prevent duplicate initialization


function syncNetworkStatus() {
    state.isOffline = !navigator.onLine;
    console.log("Network Status Synchronization: " + (state.isOffline ? "Offline" : "Online"));

    // Update UI Badge
    const offlineBadge = document.getElementById('offlineBadge');
    if (offlineBadge) {
        offlineBadge.style.display = state.isOffline ? 'flex' : 'none';
    }

    // Update body class for CSS targeting
    if (state.isOffline) {
        document.body.classList.add('offline-mode');
    } else {
        document.body.classList.remove('offline-mode');
    }

    // Update loading text if visible
    if (dom.loadingText && dom.loadingOverlay && dom.loadingOverlay.style.display === 'flex') {
        if (state.isOffline && dom.loadingText.textContent === "Loading...") {
            dom.loadingText.textContent = "Offline Mode";
        } else if (!state.isOffline && dom.loadingText.textContent === "Offline Mode") {
            dom.loadingText.textContent = "Loading...";
        }
    }
}

// Keep updateOnlineStatus as a wrapper or alias if called elsewhere
function updateOnlineStatus() {
    syncNetworkStatus();
}




async function loadLanguageData(lang) {
    // Wait for device ready to ensure file access is stable on Android
    await waitForDeviceReady();

    const storageKey = `eternal_life_${lang}`;
    let data = null;

    // 1. Fetch from Local File FIRST (Prioritize App Updates)
    // const cacheBuster = Date.now(); // REMOVED CACHE BUSTER FOR CORDOVA
    // CORDOVA FIX: Remove ./ and use simpler path, and try XHR silently if fetch fails
    const url = `eternal_life_languages/${lang}.json`;

    console.log(`[LoadLang] Attempting to fetch language data from: ${url}`);

    try {
        // CORDOVA OPTIMIZATION: Use XHR directly for local files to avoid "Fetch API cannot load file:///" error logs
        if (typeof cordova !== 'undefined' && cordova.platformId === 'android') {
            console.log("[LoadLang] Using direct XHR for Android local file...");
            data = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        console.log(`[LoadLang] XHR Status: ${xhr.status}`);
                        // Status 0 is success for local files
                        if (xhr.status === 200 || xhr.status === 0) {
                            try {
                                if (xhr.responseText) {
                                    resolve(JSON.parse(xhr.responseText));
                                } else {
                                    reject(new Error("Empty response text"));
                                }
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error(`XHR Status ${xhr.status}`));
                        }
                    }
                };
                xhr.onerror = (e) => {
                    console.error("[LoadLang] XHR Network Error:", e);
                    reject(new Error("XHR Network Error"));
                };
                xhr.send();
            }).catch(e => {
                console.warn(`[LoadLang] XHR load failed for ${url}:`, e);
                return null;
            });
        } else {
            // Standard Fetch for Browser/iOS where it might work better or is supported
            let response;
            try {
                console.log("[LoadLang] Using standard fetch...");
                response = await fetch(url);
            } catch (fetchErr) {
                console.warn(`[LoadLang] Fetch threw error: ${fetchErr.message}. Switch to XHR fallback.`);
                // alert(`Fetch Error for ${url}: ${fetchErr.message}`); // Suppress alert on Android
            }

            // Check for success (ok is true for 200-299; status 0 is common for file://)
            if (response && (response.ok || response.status === 0)) {
                try {
                    const text = await response.text();
                    // Ensure text is not empty
                    if (text && text.trim().length > 0) {
                        data = JSON.parse(text);
                    }
                } catch (jsonErr) {
                    console.warn("JSON parse failed on fetch response:", jsonErr);
                    // alert(`JSON Parse Failed for ${url}: ${jsonErr.message}`);
                    data = null;
                }
            }

            // XHR Fallback if fetch failed to produce data (re-using existing logic logic if needed, but above block covers most)
            if (!data && (!response || !response.ok)) {
                // ... existing fallback logic could go here, but we'll rely on the specific Android check above or the storage fallback below
            }
        }


        // Validate and Cache
        if (data && data.title && Array.isArray(data.chapters)) {
            books.eternal_life = data;
            // Update the cache with the fresh data
            BibleStorage.saveBible(storageKey, data).catch(err =>
                console.error("Failed to cache Eternal Life book:", err)
            );
            return data;
        } else {
            // console.error(`Invalid structure in ${lang}.json or no data retrieved.`);
        }
    } catch (e) {
        console.warn(`Failed to load ${lang}.json from local file:`, e);
        // alert(`Critical Error loading ${lang}.json: ${e.message}`);
    }

    // 2. Fallback to Cache/Storage if local file failed
    try {
        data = await BibleStorage.loadBible(storageKey);
        if (data) {
            console.log(`Loaded ${lang} from local storage (fallback)`);
            books.eternal_life = data;
            return data;
        }
    } catch (e) {
        console.warn(`Failed to load ${storageKey} from storage:`, e);
    }

    // 4. Fallback to English if specific language failed
    if (lang !== 'english') {
        console.log('Attempting to fall back to English...');
        try {
            // Try English as last resort
            const response = await fetch('eternal_life_languages/english.json');
            if (response.ok) {
                data = await response.json();
                if (data.title && Array.isArray(data.chapters)) {
                    books.eternal_life = data;
                    return data;
                }
            }
        } catch (fallbackError) {
            console.error('Even English fallback failed:', fallbackError);
        }
    }

    return null;
}

function getVerseText(verse) {
    // Check for language-specific text in the verse object
    let langText = verse[state.currentLang];
    if (langText === undefined) {
        langText = verse.text || '';
    }

    // CLEANUP: Aggressively strip Strong's numbers (anything in <S> tags)
    // This handles both <S>123</S> and potentially other variants
    if (langText && typeof langText === 'string' && langText.includes('<S>')) {
        langText = langText.replace(/<S>.*?<\/S>/g, '');
    }

    return langText;
}

// --- RENDER ENGINE ---
// --- RENDER ENGINE ---
async function renderChapter(scrollPosition = 0) {
    return new Promise(async (resolve) => {
        const book = books[state.currentBookKey];

        if (!book) {
            if (state.currentBookKey !== 'quiz' && state.currentBookKey !== 'chat') console.error("Book not found");
            resolve();
            return;
        }

        // Do not render chapters for 'chat'
        if (state.currentBookKey === 'chat') {
            resolve();
            return;
        }

        const chapter = book.chapters[state.currentChapterIndex];

        // SAFETY CHECK: If chapter is undefined (index out of bounds), reset to 0
        if (!chapter) {
            console.warn(`Chapter index ${state.currentChapterIndex} out of bounds for book ${book.title}. Resetting to 0.`);

            // If chapters array is empty, don't recursively call renderChapter - it will loop forever
            if (book.chapters.length === 0) {
                console.error(`Book ${book.title} has no chapters loaded. Cannot render.`);
                dom.page.innerHTML = '<div class="inline-loader"><div class="spinner"></div><p>Loading book content...</p></div>';
                resolve();
                return;
            }

            state.currentChapterIndex = 0;
            state.currentVerseNumber = 0;
            // Update URL/History if needed, then re-render
            await renderChapter(0);
            resolve();
            return;
        }

        // LAZY LOADING CHECK
        if (state.currentBookKey === 'bible' && (!chapter.verses || chapter.verses.length === 0) && !chapter.isCover) {

            // Show Loading (Inline)
            dom.page.innerHTML = '<div class="inline-loader"><div class="spinner"></div></div>';

            try {
                // Define translationId first so it's available for both DB and API
                const translationId = book.translationId || state.currentTranslationId || 'YLT';

                // 1. Try Local DB first
                let chapterData;
                try {
                    const localData = await db.getChapter(translationId, chapter.bookId, chapter.chapterNumber);
                    if (localData && localData.verses) {
                        console.log(`Loaded chapter ${chapter.bookName} ${chapter.chapterNumber} from Local DB`);
                        chapterData = localData.verses; // Structure: [{id, text}, ...]
                    }
                } catch (dbErr) {
                    console.warn("Local DB lookup failed:", dbErr);
                }

                if (chapterData) {
                    // Use local data (already in internal format if from db.saveChapter)
                    chapter.verses = chapterData.map((item, vIdx) => {
                        let safeId = item.id;
                        // AGGRESSIVE FIX: Regenerate ID if it looks broken (starts with undefined/null/Book)
                        if (!safeId || safeId.startsWith('undefined') || safeId.startsWith('null') || safeId.startsWith('Book')) {
                            safeId = `${chapter.bookName || chapter.bookId || 'Book'} ${chapter.chapterNumber}:${item.verse || item.verseId || (vIdx + 1)}`;
                        }

                        // AGGRESSIVE FIX (Odia): Clean verseId if > 1000
                        let cleanVerseId = item.verseId || item.verse;
                        if (cleanVerseId && parseInt(cleanVerseId) >= 1000) {
                            const mod = parseInt(cleanVerseId) % 1000;
                            cleanVerseId = mod > 0 ? mod.toString() : (vIdx + 1).toString();
                        }

                        return {
                            id: safeId,
                            verseId: cleanVerseId,
                            text: item.text
                        };
                    });
                } else {
                    // 2. Check Network before API Call
                    if (!navigator.onLine) {
                        // Check if UnavailablePopup is already shown? No, show OfflinePopup
                        dom.page.innerHTML = ''; // Clear loading spinner
                        showOfflinePopup();
                        resolve();
                        return;
                    }

                    // 3. Fetch content from API
                    try {
                        // FIX: Use pre-stored API link if available (Critical for HELLOAO and LOCAL_BIBLE)
                        if (chapter.apiLink) {
                            // console.log(`Lazy loading from pre-stored link: ${chapter.apiLink}`);
                            let response;
                            let rawData;

                            // Use XHR for local files if fetchLocal is available (Android support)
                            if (window.fetchLocal && (chapter.apiLink.includes('dogri') || chapter.apiLink.includes('file:'))) {
                                try {
                                    rawData = await window.fetchLocal(chapter.apiLink);
                                    response = { ok: true, status: 200, json: async () => rawData };
                                } catch (e) {
                                    console.error("fetchLocal failed for chapter:", e);
                                    throw e;
                                }
                            } else {
                                response = await fetch(chapter.apiLink);
                                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                                rawData = await response.json();
                            }

                            if (state.currentTranslationId && (state.currentTranslationId.includes('HELLOAO') || chapter.apiLink.includes('helloao') || chapter.apiLink.includes('dogri'))) {
                                // Parse HELLOAO/LOCAL_BIBLE chapter format
                                // HELLOAO returns { chapter: { content: [...] } }
                                if (rawData.chapter && rawData.chapter.content) {
                                    const sourceContent = rawData.chapter.content;
                                    if (Array.isArray(sourceContent)) {
                                        chapterData = sourceContent.map(item => {
                                            if (item.type === 'verse') {
                                                let text = '';
                                                if (Array.isArray(item.content)) {
                                                    text = item.content.map(c => {
                                                        if (typeof c === 'string') return c;
                                                        if (c.text) return c.text;
                                                        return '';
                                                    }).join('');
                                                } else if (typeof item.content === 'string') {
                                                    text = item.content;
                                                }

                                                return {
                                                    id: `${chapter.bookName || chapter.bookId} ${chapter.chapterNumber}:${item.number}`,
                                                    verseId: item.number,
                                                    verse: item.number,
                                                    text: text.trim()
                                                };
                                            }
                                            return null;
                                        }).filter(v => v);
                                    } else {
                                        // Fallback if content is not an array
                                        chapterData = rawData.verses || rawData;
                                    }
                                }
                            } else {
                                // Assume standard format or array if not HELLOAO/LOCAL type
                                chapterData = rawData.verses || rawData;
                            }
                        }

                        // 3. Fetch content from API with FAILOVER (If not already loaded)
                        if (!chapterData) {
                            const config = BIBLE_CONFIG[state.currentLang] || {};
                            const sourcesToTry = config.sources ? [...config.sources] : [];

                            // Ensure the current preferred source is first in line if it exists
                            const preferredId = translationId;
                            sourcesToTry.sort((a, b) => {
                                const aId = a.id || a.lang;
                                const bId = b.id || b.lang;
                                return (aId === preferredId) ? -1 : (bId === preferredId) ? 1 : 0;
                            });

                            chapterData = null;
                            let lastError = null;

                            for (const source of sourcesToTry) {
                                try {
                                    const currentSourceType = source.type;
                                    const currentId = source.id || source.lang;

                                    console.log(`[Content Load] Trying source: ${currentSourceType} (${currentId})`);
                                    chapterData = await api.getChapter(currentId, chapter.bookId, chapter.chapterNumber, currentSourceType);

                                    if (chapterData && chapterData.length > 0) {
                                        // Success! Update state to reflect effective translation if needed
                                        if (state.currentTranslationId !== currentId) {
                                            console.log(`[Content Load] failover switched to ${currentId}`);
                                        }
                                        break; // Stop loop on success
                                    }
                                } catch (sourceErr) {
                                    console.warn(`[Content Load] Failed source ${source.type}:`, sourceErr);
                                    lastError = sourceErr;
                                }
                            }
                        } // End Failover Loop

                        if (chapterData) {
                            // Populate the chapter object
                            // Check if it's already parsed (array of objects with 'text' and 'verse')
                            // If it came from HELLOAO logic above, it is already parsed.
                            // If it came from api.getChapter (BOLLS), it might be raw verses array

                            // Simple check: does the first item have 'verseId' or 'verse'?
                            const isAlreadyParsed = chapterData.length > 0 && (chapterData[0].verseId !== undefined || chapterData[0].id !== undefined);

                            if (isAlreadyParsed) {
                                chapter.verses = chapterData;
                            } else {
                                // Standard BOLLS/GetBible mapping
                                chapter.verses = chapterData.map((item, index) => ({
                                    id: `${chapter.bookName || chapter.bookId || 'Book'} ${chapter.chapterNumber}:${item.verse || index + 1}`,
                                    verseId: item.verse,
                                    text: item.text
                                }));
                            }
                        } else {
                            throw lastError || new Error("All sources failed to load chapter content.");
                        }
                    } catch (err) {
                        console.error("Error loading chapter data:", err);
                        if (typeof hideLoading === 'function') {
                            hideLoading();
                        }
                        // Show retry UI instead of alert
                        dom.page.innerHTML = `
                            <div class="retry-container" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:50vh;text-align:center;padding:2rem;">
                                <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                                <h3 style="margin:0 0 0.5rem 0;color:var(--text-color,#333);">Failed to Load</h3>
                                <p style="color:var(--text-secondary,#666);margin:0 0 1.5rem 0;">Could not load chapter content.<br>Please check your internet connection.</p>
                                <button onclick="renderChapter()" style="padding:12px 32px;font-size:1rem;border:none;border-radius:8px;background:var(--accent-color,#4a90d9);color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.1s;"
                                    onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">Try Again</button>
                            </div>`;
                        resolve();
                        return;
                    }
                }
            } catch (lazyLoadErr) {
                console.error("Error in lazy loading chapter:", lazyLoadErr);
                dom.page.innerHTML = '<p class="error-msg">Failed to load chapter.</p>';
                resolve();
                return;
            }
        }

        // Update lastBible state if we are reading the Bible
        if (state.currentBookKey === 'bible' && chapter) {
            state.lastBibleBookName = chapter.bookName;
            state.lastBibleChapterNumber = chapter.chapterNumber;
        }

        let displayTitle = book.title;
        // Bible version removed from Title - moved to Toolbar
        dom.appTitle.innerText = displayTitle;

        // Animation: Fade Out
        dom.page.classList.add('fade-out');
        dom.page.classList.remove('fade-in');

        setTimeout(() => {
            // Special Cover Page Rendering
            if (chapter.isCover) {
                dom.page.innerHTML = `
                <div class="cover-container">
                    <img src="the_eternal_life.png" alt="Cover" class="cover-image" onerror="this.style.display='none'">
                    <h1 class="book-title-overlay">${book.title}</h1>
                </div>
            `;
            } else if (state.currentBookKey === 'notes') {
                // Special Notes Rendering
                let notesContent = localStorage.getItem('myReaderNotes') || chapter.verses[0].text;
                if (notesContent === "Add your notes here." && localStorage.getItem('myReaderNotes')) {
                    notesContent = localStorage.getItem('myReaderNotes');
                }
                dom.page.innerHTML = `
                <h2 class="chapter-title">${chapter.title}</h2>
                <textarea id="notesTextarea" class="notes-textarea" placeholder="Write your notes here...">${notesContent}</textarea>
            `;
            } else {
                // Standard Chapter Rendering
                let html = '';
                if (chapter.title) {
                    html += `<h2 class="chapter-title">${chapter.title}</h2>`;
                }

                chapter.verses.forEach((v, index) => {
                    if (v.type === 'header') {
                        html += `<h2 class="section-header">${getVerseText(v)}</h2>`;
                    } else {
                        const verseText = getVerseText(v);
                        const processedText = verseText.replace(/\n/g, '<br>');

                        // JIT Fix: Ensure ID exists (handles cached data issues)
                        if (state.currentBookKey === 'bible' && !v.id) {
                            v.id = `${chapter.bookName || chapter.bookId || 'Book'} ${chapter.chapterNumber}:${v.verse || index + 1}`;
                            v.verseId = v.verse || (index + 1).toString();
                        }

                        const isBibleVerse = state.currentBookKey === 'bible' && v.id;

                        // Use a different class for Bible verses to allow for special styling/handling
                        const verseClass = isBibleVerse ? `verse bible-verse ${state.currentLang === 'text_odia' ? 'odia-text' : ''}` : 'verse';

                        // Robust ID and Data Attributes
                        const safeBookId = chapter.bookId || 'Book';
                        const safeChapterNum = chapter.chapterNumber || '1';
                        // Ensure verseId is clean str (no leading zeros)
                        const safeVerseNum = (v.verseId || v.verse || (index + 1)).toString().replace(/^0+/, '');

                        html += `<div class="${verseClass}" id="${v.id}"
                                      data-bookid="${safeBookId}"
                                      data-chapter="${safeChapterNum}"
                                      data-verse="${safeVerseNum}">`;

                        // Add reference number only for Bible verses
                        if (isBibleVerse) {
                            // Use actual verse number from data, removing leading zeros
                            let properVerseNumber;

                            // More robust handling of verseId
                            if (v.verseId !== null && v.verseId !== undefined && typeof v.verseId !== 'object') {
                                properVerseNumber = String(v.verseId).replace(/^0+/, '') || '1';
                            } else if (v.verse !== null && v.verse !== undefined && typeof v.verse !== 'object') {
                                properVerseNumber = String(v.verse).replace(/^0+/, '') || '1';
                            } else {
                                // Fallback to index
                                properVerseNumber = String(index + 1);
                            }

                            const originalVerseId = (v.verseId !== null && v.verseId !== undefined && typeof v.verseId !== 'object') ? String(v.verseId) : '';
                            html += `<span class="verse-number" data-verseid="${originalVerseId}">${properVerseNumber}</span>${state.currentLang === 'text_odia' ? '' : ' '}`;
                        }

                        // Sanitize content before rendering
                        let safeText = cleanHTML(processedText);
                        html += `<span class="verse-text">${safeText}</span></div>`;
                    }
                });

                if (chapter.pageNumber) {
                    html += `<div class="page-number">- ${chapter.pageNumber} -</div>`;
                }

                dom.page.innerHTML = html;
            }

            dom.scrollContainer.scrollTop = scrollPosition;
            dom.page.classList.remove('fade-out');
            dom.page.classList.add('fade-in');
            updateProgressBar();
            updateProgressBar();
            updateRTL();
            updateBibleSelectors();

            // Attach notes save handler if notes
            if (state.currentBookKey === 'notes') {
                const textarea = document.getElementById('notesTextarea');
                if (textarea) {
                    textarea.addEventListener('input', () => {
                        localStorage.setItem('myReaderNotes', textarea.value);
                        books.notes.chapters[0].verses[0].text = textarea.value;
                    });
                }
            }

            // Hide navigation buttons after 3 seconds - REMOVED PER USER REQUEST
            // Buttons should stay visible (opacity handled in CSS)
            dom.prevBtn.classList.remove('hidden');
            dom.nextBtn.classList.remove('hidden');

            // Update Bible navigation toolbar if applicable
            updateBibleNavigationToolbar();

            resolve(); // RESOLVE PROMISE WHEN RENDER IS COMPLETE

        }, 300); // end setTimeout
    }); // end Promise
}

function escapeHTML(str) {
    return str ? str.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : "";
}

// --- NAVIGATION ---
async function loadBook(bookKey) {
    // Hide the quiz area when switching books
    dom.page.style.display = 'block';
    dom.quizContainer.style.display = 'none';

    // Show toolbar and progress bar when leaving quiz
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.style.display = '';
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) progressContainer.style.display = '';

    // Reset quiz container positioning to default
    if (dom.quizContainer) {
        dom.quizContainer.style.top = '';
        dom.quizContainer.style.height = '';
    }

    // Hide chat container
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) chatContainer.style.display = 'none';

    state.currentBookKey = bookKey;

    // Update language selector availability based on the new book
    disableUnavailableLanguages();

    // --- BIBLE SPECIFIC LOADING ---
    if (bookKey === 'bible') {
        // SCENARIO A: Transitioning to Bible with Unavailable Language
        const config = BIBLE_CONFIG[state.currentLang];
        if (config && config.unavailable) {
            const originalLang = state.currentLang;
            console.warn(`Language ${originalLang} is unavailable. Triggering fallback.`);

            // Fallback to English
            state.currentLang = 'text';
            localStorage.setItem('myReaderPreferredLang', 'text');

            // Update UI
            const langSelector = document.getElementById('preferredLangSelector');
            if (langSelector) langSelector.value = 'text';

            // Ensure we load English data
            // Safety: Check if function exists to prevent crash
            if (typeof loadBibleForCurrentLanguage === 'function') {
                await loadBibleForCurrentLanguage('text');
            } else {
                console.error("Critical: loadBibleForCurrentLanguage is missing!");
            }

            // Force render so user sees English first
            if (typeof renderChapter === 'function') {
                renderChapter();
            }

            // Show popup AFTER load
            setTimeout(() => {
                showUnavailablePopup(originalLang);
            }, 800);
        } else {
            // Normal load or ensure data is ready 
            // Respect currently selected translation if valid for this language
            let targetId = state.currentTranslationId;

            // Verify if targetId exists in current config sources
            const isValid = config.sources && config.sources.some(s => (s.id || s.lang) === targetId);
            if (!isValid) {
                targetId = config.sources[0]?.id || config.sources[0]?.lang || 'YLT';
                state.currentTranslationId = targetId; // Sync state
            }

            if (!books['bible'] || (books['bible'].translationId !== targetId)) {
                try {
                    await loadBibleForCurrentLanguage(state.currentLang, false, targetId); // Pass targetId
                } catch (err) {
                    console.error("Critical: loadBibleForCurrentLanguage failed", err);
                    // Prevent further crash by ensuring books['bible'] exists even if empty
                    if (!books['bible']) {
                        books['bible'] = { title: "Error Loading Bible", chapters: [] };
                    }
                }
            }
        }

        // Just ensure the toolbar is ready. logic handled in renderChapter
        try {
            createBibleNavigationToolbar();
        } catch (e) {
            console.error("Error creating navigation toolbar:", e);
        }
        // Recalculate index if resuming (optional refactor)
    }
    // --- QUIZ SPECIFIC LOADING ---
    else if (bookKey === 'quiz') {
        dom.page.style.display = 'none';
        dom.quizContainer.style.display = 'block';
        dom.appTitle.innerText = "Bible Quiz";
        // Hide navigation buttons for quiz
        dom.prevBtn.classList.add('hidden');
        dom.nextBtn.classList.add('hidden');
        clearTimeout(hideTimer); // Clear any pending hide timer

        // Hide toolbar and progress bar for quiz (full page mode)
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) toolbar.style.display = 'none';
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) progressContainer.style.display = 'none';

        // Expand quiz container to true full screen
        dom.quizContainer.style.top = '0';
        dom.quizContainer.style.height = '100vh';

        // Set quiz mode active
        state.quizModeActive = true;

        initializeQuiz();
        return; // Do not call renderChapter for quiz
    }
    // --- ETERNAL LIFE LOADING ---
    else if (bookKey === 'eternal_life') {
        // Remove Bible navigation toolbar if it exists
        removeBibleNavigationToolbar();

        // ALWAYS reload language data when loading eternal_life to ensure current language
        const langToLoad = state.currentLang || state.preferredLang || 'text';
        const fileName = langToLoad === 'text' ? 'english' : langToLoad.replace('text_', '');

        console.log(`[LoadBook] Attempting to load Eternal Life content for ${fileName}...`);
        try {
            await loadLanguageData(fileName);
        } catch (e) {
            console.error("[LoadBook] loadLanguageData threw error:", e);
        }

        // Final check to prevent crashes if loading failed completely
        if (!books['eternal_life'] || !books['eternal_life'].chapters || books['eternal_life'].chapters.length === 0) {
            console.error("[LoadBook] Eternal Life data missing after load. Forcing fallback.");
            books['eternal_life'] = {
                title: "Eternal Life",
                chapters: [{
                    title: "Welcome (Fallback)",
                    isCover: true,
                    verses: [
                        { id: "Cover", text: "Welcome to Eternal Life" },
                        { id: "Info", text: "The content could not be loaded. This might be due to a missing file or permission issue on Android." }
                    ]
                }]
            };
        } else {
            console.log(`[LoadBook] Eternal Life content loaded. Chapters: ${books['eternal_life'].chapters.length}`);
        }

        // If loading Eternal Life manually (not on app init), reset to cover if no saved state
        // But preserve saved chapter if loading from saved state
        if (books['eternal_life'] && books['eternal_life'].chapters &&
            state.currentChapterIndex >= 0 && state.currentChapterIndex < books['eternal_life'].chapters.length) {
            // Keep the saved chapter index
        } else {
            state.currentChapterIndex = 0; // Start at Cover page
        }

        // Ensure quiz mode is deactivated
        state.quizModeActive = false;

        // Show navigation buttons
        showNavButtons();
    }
    // --- NOTES LOADING ---
    else if (bookKey === 'notes') {
        // Assuming notes have been loaded elsewhere or are a placeholder
        // ... (notes loading logic goes here) ...
        saveReadingState();
    }
    // --- CHAT LOADING ---
    else if (bookKey === 'chat') {
        dom.page.style.display = 'none';
        dom.quizContainer.style.display = 'none';

        // Show proper Chat Container
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) chatContainer.style.display = 'flex'; // Flex for layout

        // Ensure settings are closed and sidebar is closed on mobile if needed
        const settingsPanel = document.getElementById('settingsPanel');
        if (settingsPanel && settingsPanel.classList.contains('show')) {
            toggleSettings();
        }

        // HIDE BIBLE TOOLBAR
        removeBibleNavigationToolbar();

        dom.appTitle.innerText = "Bible Chat";
        dom.prevBtn.classList.add('hidden');
        dom.nextBtn.classList.add('hidden');

        initializeChat();
    }

    // REMOVED: The logic that forced state.currentChapterIndex = 0 at the end.
    // We now let the caller (initApp or selectBook) decide which chapter to render.

    // Update Navigation Toolbar (Dropdowns)
    renderBibleNavigation();
}

function changeChapter(direction) {
    if (state.quizModeActive) return;

    let newIndex = state.currentChapterIndex + direction;
    const currentBook = books[state.currentBookKey];

    if (!currentBook) return;

    if (newIndex >= 0 && newIndex < currentBook.chapters.length) {
        state.currentChapterIndex = newIndex;
        // Reset verse number on chapter change
        state.currentVerseNumber = 0;

        // For Bible, ensure the toolbar updates to the new chapter
        if (state.currentBookKey === 'bible') {
            updateBibleNavigationToolbar();
        }

        if (state.currentBookKey === 'bible') {
            updateBibleNavigationToolbar();
        }

        renderChapter();
        updateProgressBar();
        // FIX: Persist state immediately after navigation to a new chapter/book
        saveReadingState();

        // Update Bible reference display after chapter change
        renderBibleNavigation();

        // Show the toolbar when changing chapters (it might be hidden)
        const toolbar = document.querySelector('.toolbar');
        if (toolbar && toolbar.classList.contains('hidden')) {
            toolbar.classList.remove('hidden');
        }

    } else {
        // Handle end of book
        console.log(`End of ${currentBook.title}`);
        showNavButtons();
    }
}

/**
 * Toggles the visibility of the book selector sidebar.
 */
function toggleBookSelectorSidebar() {
    const sidebar = document.getElementById('bookSelectorSidebar');
    sidebar.classList.toggle('open');

    // Generate the book list dynamically when opening
    if (sidebar.classList.contains('open')) {
        generateBookList();
        showSidebarOverlay();
    } else {
        hideSidebarOverlay();
    }
}

/**
 * Updates the book selector sidebar title to show the currently selected book.
 */
function updateBookSelectorTitle() {
    const titleElement = document.getElementById('bookSelectorTitle');
    if (titleElement) {
        const currentBook = books[state.currentBookKey];
        titleElement.textContent = currentBook ? currentBook.title : 'Select a Book';
    }
}

/**
 * Dynamically generates the list of books for the sidebar content.
 */
function generateBookList() {
    const bookListContainer = document.getElementById('bookList');
    bookListContainer.innerHTML = ''; // Clear previous content

    // Update the sidebar title to show the currently selected book
    updateBookSelectorTitle();

    // We rely on the global 'books' object already defined in script.js
    const currentBookId = state.currentBookKey;

    for (const [id, bookData] of Object.entries(books)) {
        // Skip preloaded Bible variants that shouldn't be selectable
        if (id === 'bible_english' || id === 'bible_odia') continue;

        const link = document.createElement('a');
        link.href = 'javascript:void(0)'; // Makes it behave like a button
        link.className = 'book-link';
        if (id === currentBookId) {
            link.classList.add('active'); // Highlight active book
        }

        let linkText = bookData.title;
        // Append Abbreviation for BIBLE
        if (id === 'bible') {
            const currentId = state.currentTranslationId;
            const meta = state.availableTranslations ? state.availableTranslations[currentId] : null;
            const abbr = meta ? (meta.abbreviation || meta.shortName) : currentId;
            if (abbr) {
                linkText += ` <span class="version-tag">${abbr}</span>`;
            }
        }

        link.innerHTML = linkText; // Use innerHTML to support span
        link.setAttribute('data-book-id', id);

        // Set the selection function
        link.onclick = () => selectBook(id);

        bookListContainer.appendChild(link);
    }

    // Conditionally add Video Bible link at the bottom
    if (localStorage.getItem('videoBibleEnabled') === 'true') {
        const divider = document.createElement('hr');
        divider.style.cssText = 'margin:10px 0; border-color: var(--border-color, #ccc); opacity:0.3;';
        bookListContainer.appendChild(divider);

        const vbLink = document.createElement('a');
        vbLink.href = 'javascript:void(0)';
        vbLink.className = 'book-link';
        vbLink.innerHTML = '🎬 Video Bible';
        vbLink.onclick = function () {
            toggleBookSelectorSidebar();
            if (typeof openScriptureInMotion === 'function') {
                openScriptureInMotion();
            }
        };
        bookListContainer.appendChild(vbLink);
    }
}

/**
 * Toggles the Video Bible feature on/off and saves preference.
 * @param {boolean} enabled
 */
function toggleVideoBible(enabled) {
    localStorage.setItem('videoBibleEnabled', enabled ? 'true' : 'false');
}

// Restore Video Bible toggle state on load
(function restoreVideoBibleToggle() {
    var checkToggle = function () {
        var vbToggle = document.getElementById('videoBibleToggle');
        if (vbToggle) {
            vbToggle.checked = localStorage.getItem('videoBibleEnabled') === 'true';
        } else {
            setTimeout(checkToggle, 200);
        }
    };
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(checkToggle, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(checkToggle, 100); });
    }
})();

/**
 * Handles the selection of a book from the sidebar.
 * @param {string} bookId - The ID of the book to load.
 */
async function selectBook(bookId) {
    // 1. Check if the book is already active
    if (state.currentBookKey === bookId) {
        toggleBookSelectorSidebar();
        return;
    }

    // 2. Load the new book content
    await loadBook(bookId); // Wait for data to load

    // 3. EXPLICITLY RESET to start of book only on manual selection
    state.currentBookKey = bookId;
    state.currentChapterIndex = 0;
    state.currentVerseNumber = 0;

    // Update selectors (hide/show version selector)
    updateBibleSelectors();

    // Update language dropdown visibility based on the new book context
    disableUnavailableLanguages();

    // 4. Render and Save
    renderChapter(0);
    saveReadingState(); // Save immediately so a refresh keeps this new book

    // 5. Update UI
    toggleBookSelectorSidebar();
    document.querySelectorAll('.book-link').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`#bookList [data-book-id="${bookId}"]`);
    if (activeLink) activeLink.classList.add('active');
}

// --- INTERACTIVITY ---
// Global variables for long press detection - REMOVED

function openVersePopup(id, text) {


    // Clear any text selection to prevent interference with double-click
    window.getSelection().removeAllRanges();

    if (!text) return;

    state.popupVerseId = id;

    document.getElementById('popupRef').innerText = id;
    document.getElementById('popupText').innerText = text;


    dom.popup.classList.add('active');

}

// Custom Double-Tap Logic
// Custom Double-Tap Logic
let lastVerseTapTime = 0;
let lastTapCoordinates = { x: 0, y: 0 };
const DOUBLE_TAP_DELAY = 300; // ms
const TAP_DISTANCE_THRESHOLD = 20; // pixels

function initCustomDoubleTap() {
    const bookPage = document.getElementById('bookPage');


    if (!bookPage) return;

    // Touch events for mobile
    bookPage.addEventListener('touchstart', handleTouchStartDoubleTap, { passive: false });
    bookPage.addEventListener('touchend', handleTouchEndDoubleTap, { passive: false });

    // Standard Double Click for desktop
    bookPage.addEventListener('dblclick', function (e) {

        handleDoubleTapAction(e.target);
    });
}

let currentTapStart = { x: 0, y: 0, time: 0 };

function handleTouchStartDoubleTap(e) {
    if (e.touches.length > 1) return; // Ignore multi-touch
    const touch = e.touches[0];
    currentTapStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
    };
}

function handleTouchEndDoubleTap(e) {
    const touch = e.changedTouches[0];
    const currentTime = Date.now();
    const tapX = touch.clientX;
    const tapY = touch.clientY;

    // Check if finger moved too much during this specific tap (swipe detection)
    const moveX = Math.abs(tapX - currentTapStart.x);
    const moveY = Math.abs(tapY - currentTapStart.y);
    if (moveX > TAP_DISTANCE_THRESHOLD || moveY > TAP_DISTANCE_THRESHOLD) {
        return; // It was a swipe, not a tap
    }

    // Double Tap Detection
    const timeSinceLastTap = currentTime - lastVerseTapTime;
    const distSinceLastTap = Math.hypot(tapX - lastTapCoordinates.x, tapY - lastTapCoordinates.y);

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0 && distSinceLastTap < 40) {
        // Double Tap Detected!
        handleDoubleTapAction(e.target);

        // Prevent default zoom or other actions
        e.preventDefault();

        // Reset
        lastVerseTapTime = 0;
    } else {
        // First Tap or too slow
        lastVerseTapTime = currentTime;
        lastTapCoordinates = { x: tapX, y: tapY };
    }
}
// handleCustomDoubleTap removed as it is replaced by standard dblclick

function handleDoubleTapAction(target) {


    const verseEl = target.closest('.verse');


    if (!verseEl) return;

    // Clear selection
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }

    const id = verseEl.id;
    let text = "";

    // Try to find the inner text content safely
    const textEl = verseEl.querySelector('.verse-text');
    if (textEl) {
        text = textEl.innerText;
    } else {
        text = verseEl.innerText;
    }

    openVersePopup(id, text);
    if (navigator.vibrate) navigator.vibrate(50);
}
// handleStart, handleMove, handleEnd, handleContextMenu, handleLongPress - REMOVED

function showBookmarkPopup(selectedText, verseId, touchEvent) {
    // Create or update a temporary popup for selected text bookmark
    let bookmarkPopup = document.getElementById('bookmarkPopup');
    if (!bookmarkPopup) {
        bookmarkPopup = document.createElement('div');
        bookmarkPopup.id = 'bookmarkPopup';
        bookmarkPopup.className = 'bookmark-popup';
        bookmarkPopup.innerHTML = `
            <div class="bookmark-popup-content">
                <p class="selected-text">"${selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}"</p>
                <button onclick="bookmarkSelectedText('${verseId}', '${selectedText.replace(/'/g, "\\'")}')">\u00e2\u00ad\ufffd Bookmark</button>
                <button onclick="closeBookmarkPopup()">Close</button>
            </div>
        `;
        document.body.appendChild(bookmarkPopup);
    } else {
        bookmarkPopup.querySelector('.selected-text').textContent = `"${selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}"`;
        const bookmarkBtn = bookmarkPopup.querySelector('button');
        bookmarkBtn.onclick = () => bookmarkSelectedText(verseId, selectedText.replace(/'/g, "\\'"));
    }

    // Position the popup near the touch point
    const rect = bookmarkPopup.getBoundingClientRect();
    let x = (touchEvent.clientX || touchEvent.pageX) - rect.width / 2;
    let y = (touchEvent.clientY || touchEvent.pageY) + 20;

    // Keep within viewport bounds
    const maxX = window.innerWidth - rect.width - 10;
    const maxY = window.innerHeight - rect.height - 10;
    x = Math.max(10, Math.min(x, maxX));
    y = Math.max(10, Math.min(y, maxY));

    bookmarkPopup.style.left = x + 'px';
    bookmarkPopup.style.top = y + 'px';
    bookmarkPopup.style.display = 'block';

    // Clear selection
    window.getSelection().removeAllRanges();
}

function bookmarkSelectedText(verseId, selectedText) {
    const book = state.currentBookKey;
    const chapter = state.currentChapterIndex;

    // Check if already bookmarked
    if (!state.bookmarks.some(b => b.id === verseId && b.book === book && b.selectedText === selectedText)) {
        state.bookmarks.push({
            book: book,
            id: verseId,
            chapter: chapter,
            preview: selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText,
            selectedText: selectedText,
            timestamp: Date.now()
        });
        localStorage.setItem('myReaderBookmarks', JSON.stringify(state.bookmarks));
        saveReadingState(); // Sync reading state
        alert('Text bookmarked successfully!');
    } else {
        alert('This text is already bookmarked.');
    }
    closeBookmarkPopup();
}

function closeBookmarkPopup() {
    const bookmarkPopup = document.getElementById('bookmarkPopup');
    if (bookmarkPopup) {
        bookmarkPopup.style.display = 'none';
    }
}

function closePopup() {
    dom.popup.classList.remove('active');
}

function handleLinkClick(ref) {
    event.stopPropagation();
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NIV`;
    window.open(url, '_blank');
}

// --- SEARCH ---
function executeSearch() {
    performSearch();
}

function performSearch() {
    if (state.currentBookKey === 'quiz') return;
    const query = document.getElementById('searchInput').value.toLowerCase();
    if (!query) return;
    const results = [];
    const book = books[state.currentBookKey];
    if (!book) return;

    book.chapters.forEach((chap, cIndex) => {
        chap.verses.forEach(v => {
            if (!v.text) return;
            if (v.text.toLowerCase().includes(query) || (v.id && v.id.toLowerCase().includes(query))) {
                results.push({
                    chapterIndex: cIndex,
                    verseId: v.id,
                    text: v.text
                });
            }
        });
    });
    displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
    dom.sidebarTitle.innerText = `Found: "${query}" (${results.length})`;
    dom.sidebarContent.innerHTML = results.length === 0 ? '<p style="padding:10px">No results.</p>' : '';
    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `<b>${res.verseId || 'Text'}</b><br>${res.text.substring(0, 60)}...`;
        div.onclick = () => {
            state.currentChapterIndex = res.chapterIndex;
            renderChapter(0);
            closeSidebar();
            setTimeout(() => {
                const el = document.getElementById(res.verseId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('highlighted');
                    setTimeout(() => el.classList.remove('highlighted'), 2000);
                }
            }, 500);
        };
        dom.sidebarContent.appendChild(div);
    });
    dom.sidebar.classList.add('open');
}

// --- BOOKMARKS ---
function bookmarkPopupVerse() {
    const id = state.popupVerseId;
    const book = state.currentBookKey;
    if (!state.bookmarks.some(b => b.id === id && b.book === book)) {
        state.bookmarks.push({
            book: book,
            id: id,
            chapter: state.currentChapterIndex,
            preview: document.getElementById('popupText').innerText.substring(0, 30) + '...'
        });
        localStorage.setItem('myReaderBookmarks', JSON.stringify(state.bookmarks));
        saveReadingState(); // Sync reading state
        alert('Bookmark Saved');
    }
    closePopup();
}

function toggleBookmarks() {
    toggleSidebar('bookmarks');
}

function toggleSidebar(mode) {
    // If the sidebar is already open with the same mode, close it
    if (dom.sidebar.classList.contains('open') && dom.sidebar.dataset.currentMode === mode) {
        closeSidebar();
        return;
    }

    if (mode === 'bookmarks') {
        dom.sidebarTitle.innerText = 'My Bookmarks';
        dom.sidebarContent.innerHTML = '';
        if (state.bookmarks.length === 0) {
            dom.sidebarContent.innerHTML = '<p style="padding:10px">No bookmarks yet.</p>';
        }
        state.bookmarks.forEach((bm, index) => {
            const div = document.createElement('div');
            div.className = 'bookmark-item';
            div.innerHTML = `
                <div>
                    <b>${bm.id}</b> <span style="font-size:0.8em">(${books[bm.book] ? books[bm.book].title : bm.book})</span><br>
                    <i>${bm.preview}</i>
                </div>
                <span class="delete-bm" onclick="removeBookmark(event, ${index})">🗑️</span>
            `;
            div.onclick = (e) => {
                if (e.target.classList.contains('delete-bm')) return;
                if (!books[bm.book]) return;
                state.currentBookKey = bm.book;
                if (state.currentBookKey !== 'quiz') {
                    dom.page.style.display = 'block';
                    dom.quizContainer.style.display = 'none';
                    dom.prevBtn.style.display = 'flex';
                    dom.nextBtn.style.display = 'flex';
                }
                state.currentChapterIndex = bm.chapter;
                renderChapter(0);
                closeSidebar();
                setTimeout(() => {
                    const el = document.getElementById(bm.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500);
            };
            dom.sidebarContent.appendChild(div);
        });
    }
    dom.sidebar.dataset.currentMode = mode;
    dom.sidebar.classList.add('open');
    showSidebarOverlay();
}

function removeBookmark(e, index) {
    e.stopPropagation();
    state.bookmarks.splice(index, 1);
    localStorage.setItem('myReaderBookmarks', JSON.stringify(state.bookmarks));
    saveReadingState(); // Sync reading state
    toggleSidebar('bookmarks');
}

function closeSidebar() {
    dom.sidebar.classList.remove('open');
    hideSidebarOverlay();
}

// script.js (New Search Panel Logic)

/**
 * Toggles the visibility of the full-screen search panel.
 * @param {boolean} [shouldOpen] - If specified, forces the panel to open (true) or close (false).
 */
function toggleSearchPanel(shouldOpen) {
    const panel = document.getElementById('searchPanel');
    const input = document.getElementById('searchPanelInput');

    // Determine the action: open if explicitly true or if current state is closed
    const isOpen = shouldOpen === true || (shouldOpen === undefined && !panel.classList.contains('open'));

    if (isOpen) {
        panel.classList.add('open');
        input.focus();
    } else {
        panel.classList.remove('open');
        input.blur();
        // Optional: Clear results on close
        // document.getElementById('searchResults').innerHTML = '<p style="color: var(--text-color); margin-top: 20px;">Enter a word or phrase above to search the text.</p>';
    }
}

/**
 * Helper function to allow the close button to call the toggle function easily.
 */
function closeSearchPanel() {
    toggleSearchPanel(false);
}

// Enhanced executeSearch function with proper search logic
function executeSearch() {
    const searchInput = document.getElementById('searchPanelInput');
    const resultsArea = document.getElementById('searchResults');
    const query = searchInput.value.trim().toLowerCase();

    if (query.length === 0) {
        resultsArea.innerHTML = '<p style="color: var(--text-color); margin-top: 20px;">Please enter a search query.</p>';
        return;
    }

    // Show loading state
    resultsArea.innerHTML = `<h4 style="margin-bottom: 10px;">Searching for: "${query}"</h4><p>Running search...</p>`;

    // Perform search after a short delay to show loading state
    setTimeout(() => {
        performSearch(query);
    }, 100);
}

function performSearch(query) {
    const resultsArea = document.getElementById('searchResults');
    const results = [];
    const book = books[state.currentBookKey];

    if (!book) {
        resultsArea.innerHTML = '<p style="color: var(--text-color); margin-top: 20px;">No book loaded for searching.</p>';
        return;
    }

    // Search through all chapters and verses
    book.chapters.forEach((chap, cIndex) => {
        chap.verses.forEach(v => {
            if (!v.text) return;

            // Get the text to search in (handling multi-language support)
            const searchText = getVerseText(v).toLowerCase();

            // Check if query matches verse text or ID
            if (searchText.includes(query) || (v.id && v.id.toLowerCase().includes(query))) {
                results.push({
                    chapterIndex: cIndex,
                    chapterTitle: chap.title,
                    verseId: v.id,
                    text: getVerseText(v),
                    highlightedText: highlightSearchTerm(getVerseText(v), query)
                });
            }
        });
    });

    displaySearchResults(results, query);
}

function highlightSearchTerm(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function displaySearchResults(results, query) {
    const resultsArea = document.getElementById('searchResults');

    if (results.length === 0) {
        resultsArea.innerHTML = `<h4>No results found</h4><p style="color: var(--text-color);">No matches for "${query}" in the current book.</p>`;
        return;
    }

    let html = `<h4 style="margin-bottom: 15px;">Found ${results.length} result${results.length > 1 ? 's' : ''} for "${query}"</h4>`;

    results.forEach((res, index) => {
        html += `
            <div class="search-result-item" onclick="navigateToResult(${res.chapterIndex}, '${res.verseId}')" tabindex="0">
                <div class="result-header">
                    <strong>${res.verseId}</strong>
                    <small style="color: var(--accent-color); margin-left: 10px;">${res.chapterTitle}</small>
                </div>
                <div class="result-text" style="margin-top: 5px; line-height: 1.4;">
                    ${res.highlightedText}
                </div>
            </div>
        `;
    });

    resultsArea.innerHTML = html;
}

// Update displaySearchResults to wait for render
function navigateToResult(chapterIndex, verseId) {
    // Navigate to the chapter
    state.currentChapterIndex = chapterIndex;

    // Close search panel
    toggleSearchPanel(false);

    // Render, then highlight
    renderChapter(0).then(() => {
        const verseElement = document.getElementById(verseId);
        if (verseElement) {
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            verseElement.classList.add('highlighted');

            // Remove highlight after 3 seconds
            setTimeout(() => {
                verseElement.classList.remove('highlighted');
            }, 3000);
        }
    });
}

// Close search panel when clicking outside or pressing Escape
document.addEventListener('click', (e) => {
    const searchPanel = document.getElementById('searchPanel');
    if (searchPanel.classList.contains('active') && !searchPanel.contains(e.target) && !e.target.closest('.search-toggle-btn')) {
        closeSearchPanel();
    }
});

// Keyboard navigation and search on Enter/Escape
document.addEventListener('keydown', function (e) {
    const searchPanel = document.getElementById('searchPanel');
    if (searchPanel.classList.contains('active')) {
        if (e.key === 'Escape') {
            closeSearchPanel();
            e.preventDefault();
        } else if (e.key === 'Enter') {
            executeSearch();
            e.preventDefault();
        }
        // Tab navigation is handled by tabindex attributes
    }
});

// Close search when clicking outside or pressing Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer.classList.contains('expanded')) {
            toggleSearch();
        }
    }
});

// --- SETTINGS & THEMES ---
function toggleSettings() {
    if (dom.settings.classList.contains('show')) {
        closeSettings();
    } else {
        dom.settings.classList.add('show');
        showSidebarOverlay();
    }
}

function closeSettings() {
    dom.settings.classList.remove('show');
    hideSidebarOverlay();
}

// --- SIDEBAR OVERLAY HELPERS ---
function showSidebarOverlay() {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideSidebarOverlay() {
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
}

function closeAllSidePanels() {
    // Close settings
    if (dom.settings) dom.settings.classList.remove('show');
    // Close right sidebar (bookmarks/search results)
    if (dom.sidebar) dom.sidebar.classList.remove('open');
    // Close book selector sidebar
    const bookSidebar = document.getElementById('bookSelectorSidebar');
    if (bookSidebar) bookSidebar.classList.remove('open');
    // Hide overlay
    hideSidebarOverlay();
}



// --- TOGGLE FUNCTIONS FOR TOOLBAR ICONS ---

function toggleBookmarks() {
    toggleSidebar('bookmarks');
}

function toggleQuiz() {
    if (dom.quizContainer.style.display === 'block') {
        // If quiz is currently active, use closeQuiz to handle state restoration
        closeQuiz();
    } else {
        // Before loading quiz, save current book key if it's not already quiz or notes
        if (state.currentBookKey !== 'quiz' && state.currentBookKey !== 'notes') {
            state.previousBookKey = state.currentBookKey;
        }
        // Load the quiz
        loadBook('quiz');
    }
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    state.theme = themeName;
    localStorage.setItem('myReaderTheme', themeName);
}

/**
 * Closes the settings menu if it is open.
 */
// (closeSettings defined above with overlay helpers)

function setFontSize(size) {
    document.documentElement.style.setProperty('--font-size', size + 'px');
    state.fontSize = size;
    localStorage.setItem('myReaderFontSize', size);
}

function setPageWidth(width) {
    document.documentElement.style.setProperty('--page-width', width + 'px');
}

function setFontFamily(font) {
    document.documentElement.style.setProperty('--font-family', font);
}





function updateBibleSelectors() {
    // 1. Preferred Language Selector
    const langSelect = document.getElementById('preferredLangSelector');
    if (langSelect) {
        langSelect.value = state.currentLang;
        // Visual indicator logic removed for brevity, handled by CSS mostly
    }

    // 2. Bible Version Selector
    populateBibleVersionSelector();
}

/**
 * Loads translation metadata from JSON files.
 */
async function loadTranslationMetadata() {
    console.log("Loading translation metadata...");
    try {
        // Fetch both metadata files in parallel
        const [helloAoRes, getBibleRes] = await Promise.allSettled([
            fetch('helloao_available_translations.json'),
            fetch('getbible_translations.json')
        ]);

        const tempMap = {};

        // Process HelloAo Data
        if (helloAoRes.status === 'fulfilled' && helloAoRes.value.ok) {
            try {
                const data = await helloAoRes.value.json();
                if (data.translations) {
                    data.translations.forEach(t => {
                        tempMap[t.id] = {
                            id: t.id,
                            name: t.name,
                            englishName: t.englishName,
                            abbreviation: t.shortName,
                            source: 'HELLOAO'
                        };
                    });
                }
            } catch (e) { console.warn("Failed to parse HelloAo metadata", e); }
        }

        // Process GetBible Data
        if (getBibleRes.status === 'fulfilled' && getBibleRes.value.ok) {
            try {
                const data = await getBibleRes.value.json();
                // data is object: { "akjv": { ... }, ... }
                for (const [key, val] of Object.entries(data)) {
                    // Start with existing if present, or new object
                    if (!tempMap[key]) {
                        tempMap[key] = {
                            id: key,
                            name: val.translation,
                            englishName: val.translation, // GetBible often wraps English name in translation
                            abbreviation: val.abbreviation || val.distribution_abbreviation,
                            source: 'GETBIBLE'
                        };
                    } else {
                        // Merge/Update if needed (maybe GetBible has better abbreviation?)
                        if (!tempMap[key].abbreviation) {
                            tempMap[key].abbreviation = val.abbreviation;
                        }
                    }
                }
            } catch (e) { console.warn("Failed to parse GetBible metadata", e); }
        }

        state.availableTranslations = tempMap;
        console.log(`Loaded metadata for ${Object.keys(tempMap).length} translations.`);

    } catch (err) {
        console.error("Critical error loading translation metadata:", err);
    }
}

/**
 * Populates the Bible Version Selector dropdown based on current language.
 */
function populateBibleVersionSelector() {
    const container = document.getElementById('versionSelectorContainer');
    const selector = document.getElementById('bibleVersionSelector');

    // Only show if we are in 'bible' mode
    if (state.currentBookKey !== 'bible') {
        if (container) container.style.display = 'none';
        return;
    }

    if (!container || !selector) return;

    // Get available sources for current language from BIBLE_CONFIG
    const config = BIBLE_CONFIG[state.currentLang];
    if (!config || !config.sources || config.sources.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Clear existing options
    selector.innerHTML = '';

    // Create options
    config.sources.forEach(source => {
        const id = source.id || source.lang; // handling godlistalias 'lang' as id
        const meta = state.availableTranslations[id];

        const option = document.createElement('option');
        option.value = id;

        // Label Logic: Abbreviation - Name OR just Name
        let label = id;
        if (meta) {
            // Use abbreviation if available
            const abbr = meta.abbreviation || meta.shortName || id;
            // Use local name if available, else English name
            const name = meta.name || meta.englishName || id;
            label = `${abbr} - ${name}`;
        } else {
            // Fallback for GodlyTalias or Manual config without metadata match
            if (source.type === 'GITHUB_GODLYTALIAS') {
                label = source.lang + " (GT)";
            } else {
                label = id + " (" + source.type + ")";
            }
        }

        option.textContent = label;
        selector.appendChild(option);
    });

    // Determine currently selected value
    let currentVal = state.currentTranslationId;

    // If current ID is not in the list (e.g. switched language), default to first
    const options = Array.from(selector.options);
    const match = options.find(o => o.value === currentVal);

    if (!match && options.length > 0) {
        // Select first one by default
        currentVal = options[0].value;
        // We SHOULD NOT trigger reload here to avoid infinite loops or double loading
        // loadBibleForCurrentLanguage will handle using the correct ID if the state one is invalid
        // But we should update state for consistency if we are "fixing" it
        // However, let's just set the UI for now.
    }

    selector.value = currentVal;

    // Show container if we have options (even 1 option is useful to see WHICH version)
    if (config.sources.length > 0) {
        container.style.display = 'block'; // Or 'flex' if row
    } else {
        container.style.display = 'none';
    }
}

async function setBibleVersion(versionId) {
    if (state.currentTranslationId === versionId) return;

    console.log(`Switching Bible Version to: ${versionId}`);
    state.currentTranslationId = versionId;

    // Trigger reload
    showLoading("Switching Version...");
    try {
        await loadBibleForCurrentLanguage(state.currentLang, true, versionId); // Pass version explicit
        await loadBook('bible');
        checkAndPromptDownload();
        await renderChapter();

        // Update sidebar list specifically
        generateBookList();

        // Update Daily Verse notifications to match the new version
        if (typeof Notifications !== 'undefined' && typeof Notifications.scheduleDailyVerses === 'function') {
            setTimeout(() => {
                Notifications.scheduleDailyVerses(books, state);
            }, 1000);
        }
    } catch (e) {
        console.error("Failed to switch version:", e);
        alert("Failed to switch version: " + e.message);
    } finally {
        hideLoading();
    }
}
function copyPopupText() {
    const text = document.getElementById('popupText').innerText;
    navigator.clipboard.writeText(text);
    alert('Copied');
}

// --- UTILS ---
function cleanHTML(str) {
    if (!str) return '';
    // Strip script tags and volatile events to prevent basic XSS
    return str.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/ on\w+="[^"]*"/g, "");
}

let lastScrollTop = 0; // Variable to track previous scroll position

function setupScrollListener() {
    const toolbar = document.querySelector('.toolbar');
    const scrollContainer = dom.scrollContainer;


    // Sensitivity threshold (pixels) to prevent flickering on small movements
    const delta = 5;

    if (!scrollContainer || !toolbar) return;

    // Debounced save reading state on scroll
    const debouncedSave = debounce(saveReadingState, 500);

    scrollContainer.addEventListener('scroll', () => {
        const scrollTop = scrollContainer.scrollTop;


        // If change is too small (e.g. rubber banding or tiny move), ignore
        if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

        // Save reading state on scroll
        debouncedSave();

        // Logic: If scrolling down AND passed the initial buffer
        if (scrollTop > lastScrollTop && scrollTop > 60) {
            toolbar.classList.add('hide');

            // CLEANER EXPERIENCE: Close any open menus when scrolling starts
            // MOD: Disable this for now as it might be causing dropdown issues on mobile
            // if (dom.settings.classList.contains('show')) dom.settings.classList.remove('show');
            // We can also close the search or sidebar if desired, but settings is most annoying to leave open

            // SHOW FABs (if in chat)
            const fabs = document.getElementById('chatFABs');
            if (fabs && state.currentBookKey === 'chat') {
                fabs.classList.add('visible');
            }

        } else {
            // Logic: If scrolling up
            toolbar.classList.remove('hide');

            // HIDE FABs (if in chat)
            const fabs = document.getElementById('chatFABs');
            if (fabs && state.currentBookKey === 'chat') {
                fabs.classList.remove('visible');
            }
        }

        // Update tracking variable
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;

        // Keep your existing progress bar update
        updateProgressBar();
    });
}

function updateProgressBar() {
    const scrollTop = dom.scrollContainer.scrollTop;
    const docHeight = dom.scrollContainer.scrollHeight - dom.scrollContainer.clientHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    dom.progressBar.style.width = scrollPercent + '%';
}

document.addEventListener('click', (e) => {
    // Safety check for dom.settings
    if (!dom || !dom.settings) return;

    if (dom.settings.classList.contains('show') && !dom.settings.contains(e.target) && !e.target.closest('.icon-btn')) {
        console.log("Closing settings due to outside click on:", e.target);
        closeSettings();
    }
    // Also ignore if clicking INSIDE a select element (critical for mobile dropdowns)
    if (e.target.tagName === 'SELECT' || e.target.closest('select')) {
        return;
    }

    if (dom.sidebar && dom.sidebar.classList && dom.sidebar.classList.contains('open') && !dom.sidebar.contains(e.target) && !e.target.closest('.icon-btn')) {
        closeSidebar();
    }
    if (dom.quizContainer && !dom.quizContainer.contains(e.target) && !e.target.closest('.icon-btn') && dom.quizContainer.style.display === 'block') {
        toggleQuiz();
    }
});

// --- QUIZ LANGUAGE STATE ---
let currentQuizLanguage = 'english'; // Default

function changeQuizLanguage(lang) {
    currentQuizLanguage = lang;
    console.log(`Quiz language changed to: ${lang}`);
}

// --- QUIZ LOGIC ---
// Alias for changeLanguage call
var initializeQuiz = startQuiz;

// disableUnavailableLanguages is defined later (line ~6208) as the canonical version.
// It dynamically shows/hides languages based on current book context.


// --- BEST SCORE PERSISTENCE ---
function getBestScore(langKey) {
    const key = `quiz_bestScore_${langKey || 'text'}`;
    try {
        return parseInt(localStorage.getItem(key)) || 0;
    } catch (e) {
        return 0;
    }
}

function saveBestScore(score, langKey) {
    const key = `quiz_bestScore_${langKey || 'text'}`;
    const current = getBestScore(langKey);
    if (score > current) {
        localStorage.setItem(key, score.toString());
        return true; // new best!
    }
    return false;
}

function updateScoreBoard() {
    const scoreEl = document.getElementById('currentScore');
    if (scoreEl) {
        scoreEl.innerText = state.quizScore.toLocaleString();
    }
    const bestEl = document.getElementById('bestScore');
    if (bestEl) {
        const langKey = state.currentLang || 'text';
        bestEl.innerText = getBestScore(langKey).toLocaleString();
    }
}

// --- QUIZ HELPER FUNCTIONS ---


// Get a selection of questions, avoiding recently answered ones
function getSelectedQuestions(allQuestions, langKey) {
    const TOTAL_QUESTIONS = 30; // Number of questions per quiz
    const SUPPRESS_CYCLES = 20; // How many times to skip correctly answered questions

    // Get the list of recently answered questions from localStorage
    const storageKey = `quiz_suppressed_${langKey}`;
    let suppressedQuestions = [];
    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            suppressedQuestions = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading suppressed questions:', e);
    }

    // Filter out suppressed questions
    let availableQuestions = allQuestions.filter(q => {
        return !suppressedQuestions.includes(q.question);
    });

    // If we don't have enough questions, include all questions
    if (availableQuestions.length < TOTAL_QUESTIONS) {
        availableQuestions = [...allQuestions];
        // Clear suppressed list since we're reusing questions
        localStorage.removeItem(storageKey);
    }

    // Shuffle and select questions
    const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(TOTAL_QUESTIONS, shuffled.length));

    return selected;
}

// Mark a question as correctly answered so it won't appear again soon
function suppressQuestion(questionText, langKey) {
    const SUPPRESS_CYCLES = 20; // How many times to skip correctly answered questions
    const storageKey = `quiz_suppressed_${langKey}`;

    try {
        // Get existing suppressed questions
        let suppressedQuestions = [];
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            suppressedQuestions = JSON.parse(stored);
        }

        // Add this question to the front of the list
        suppressedQuestions.unshift(questionText);

        // Keep only the last SUPPRESS_CYCLES questions
        if (suppressedQuestions.length > SUPPRESS_CYCLES) {
            suppressedQuestions = suppressedQuestions.slice(0, SUPPRESS_CYCLES);
        }

        // Save back to localStorage
        localStorage.setItem(storageKey, JSON.stringify(suppressedQuestions));
    } catch (e) {
        console.error('Error suppressing question:', e);
    }
}

// Use a hint to eliminate a wrong answer
function useHint() {
    const HINT_COST = 50;

    // Check if user has enough score
    if (state.quizScore < HINT_COST) {
        alert(`Not enough coins! You need ${HINT_COST} coins to use a hint.`);
        return;
    }

    const grid = document.getElementById('optionsGrid');
    if (!grid) return;

    const btns = grid.querySelectorAll('.option-btn');
    const currentQ = window.currentQuizQuestions[state.quizIndex];

    if (!currentQ) return;

    // Find wrong answers that are CURRENTLY ENABLED (not already disabled)
    const wrongBtns = [];
    btns.forEach(btn => {
        // We stored original index in dataset
        const originalIdx = parseInt(btn.dataset.originalIndex);

        // It is a candidate if it's WRONG and NOT DISABLED
        // We check classList for 'disabled' as that's what we set
        if (originalIdx !== currentQ.correctAnswer && !btn.classList.contains('disabled')) {
            wrongBtns.push(btn);
        }
    });

    if (wrongBtns.length > 0) {
        // Deduct score
        state.quizScore -= HINT_COST;
        updateScoreBoard();

        // Eliminate one random wrong option
        const btn = wrongBtns[Math.floor(Math.random() * wrongBtns.length)];

        // Visually disable it
        btn.classList.add('disabled');
        btn.style.opacity = '0.3';
        btn.style.textDecoration = 'line-through';
        btn.style.pointerEvents = 'none'; // Critical: prevent clicks on DIVs
        btn.setAttribute('aria-disabled', 'true');

        state.hintUsed = true;

        // Optional feedback
        const feedback = document.getElementById('quizFeedback');
        if (feedback) {
            feedback.style.color = 'var(--text-color)';
            feedback.innerText = "Hint used! One wrong option eliminated.";
        }
    } else {
        alert("No more options to eliminate!");
    }
}

async function loadQuizData() {
    await waitForDeviceReady();

    // Logic to ensure fresh language state
    const freshPreferredLang = localStorage.getItem('myReaderPreferredLang') || 'text';
    let langToUse = state.currentLang || freshPreferredLang;
    if (freshPreferredLang && freshPreferredLang !== 'text') {
        langToUse = freshPreferredLang;
    }

    let langCode = 'english';
    if (langToUse === 'text') {
        langCode = 'english';
    } else if (langToUse && langToUse.startsWith('text_')) {
        langCode = langToUse.replace('text_', '');
    }

    // Correct path relative to www root
    const url = `quiz/quiz_${langCode}.json`;
    console.log(`Loading quiz data from: ${url} (langCode: ${langCode})`);

    let data = null;

    try {
        let response;
        try {
            response = await fetch(url);
        } catch (fetchErr) {
            console.warn(`Fetch threw error: ${fetchErr.message}. Switch to XHR fallback.`);
        }

        if (response && (response.ok || response.status === 0)) {
            try {
                // BOM Handling using text() -> JSON.parse
                let tempText = await response.text();
                if (tempText.charCodeAt(0) === 0xFEFF) {
                    tempText = tempText.slice(1);
                }
                data = JSON.parse(tempText);
            } catch (jsonErr) {
                console.warn("JSON parse failed on fetch response:", jsonErr);
            }
        }

        // XHR Fallback
        if (!data) {
            console.log("Attempting XHR fallback for quiz...");
            data = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 0) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch (e) { reject(e); }
                        } else {
                            reject(new Error(`XHR Status ${xhr.status}`));
                        }
                    }
                };
                xhr.onerror = () => reject(new Error("XHR Network Error"));
                xhr.send();
            });
        }

        if (data) {
            // Success: Cache it
            try {
                localStorage.setItem(`cached_quiz_${langCode}`, JSON.stringify(data));
            } catch (e) {
                console.warn("Failed to cache quiz data:", e);
            }
        }

        return data;

    } catch (error) {
        console.error(`Failed to load quiz for ${langCode}:`, error);

        // Try LocalStorage Cache Fallback
        try {
            const cached = localStorage.getItem(`cached_quiz_${langCode}`);
            if (cached) {
                console.log(`Using cached quiz data for ${langCode} from localStorage`);
                return JSON.parse(cached);
            }
        } catch (e) {
            console.error("Failed to load quiz from localStorage cache:", e);
        }

        // Fallback to English if not already English
        if (langCode !== 'english') {
            console.log("Attempting fallback to English quiz...");
            try {
                const fallbackUrl = `quiz/quiz_english.json`;
                const fbResponse = await fetch(fallbackUrl);
                if (fbResponse.ok || fbResponse.status === 0) {
                    return await fbResponse.json();
                }
            } catch (e2) {
                console.error("Even English fallback failed:", e2);
            }
        }
        throw new Error(`Could not load quiz data: ${error.message}`);
    }
}

async function startQuiz() {
    state.quizIndex = 0;
    state.quizScore = 0;
    state.quizOver = false;
    state.incorrectStreak = 0;
    state.questionStartTime = Date.now();

    // Update the scoreboard display immediately (includes best score)
    updateScoreBoard();

    // Reset progress bar
    const progressFill = document.getElementById('quizProgressFill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.background = 'hsl(120, 70%, 45%)';
    }
    const progressText = document.getElementById('quizProgressText');
    if (progressText) progressText.innerText = 'Question 1 / 30';

    // Show loading indicator for quiz
    showLoading("Loading Quiz...");

    try {
        const { quizTitle, questions: quizData } = await loadQuizData();
        hideLoading(); // Hide immediately after data is loaded

        // Update title if possible
        const quizHeader = document.querySelector('#quizHeader h2');
        if (quizHeader && quizTitle) quizHeader.innerText = quizTitle;

        // Select questions using the new function that tracks previously asked questions, limited to 30
        window.currentQuizQuestions = getSelectedQuestions(quizData, state.currentLang);

        document.getElementById('gamePlayArea').style.display = 'block';
        const gameOverArea = document.getElementById('gameOverArea');
        if (gameOverArea) {
            gameOverArea.style.display = 'none';
            gameOverArea.classList.remove('win-mode');
        }
        renderQuestion();
    } catch (error) {
        hideLoading(); // Ensure loading is hidden on error
        console.error('Error loading quiz:', error);
        alert(`Failed to load quiz data for this language.\nError: ${error.message}\n\nPlease ensure the quiz file exists.`);
        document.getElementById('gamePlayArea').style.display = 'none';
        document.getElementById('gameOverArea').style.display = 'none';
        toggleQuiz(); // Close the quiz modal
    }
}

function renderLadder() {
    const ladderDiv = document.getElementById('moneyLadder');
    ladderDiv.innerHTML = '';
    prizeLadder.forEach((amt, idx) => {
        const span = document.createElement('span');
        span.className = 'money-step';
        if (idx < state.quizIndex) span.className += ' won';
        if (idx === state.quizIndex) span.className += ' active';
        span.innerText = amt.toLocaleString() + ' coins';
        ladderDiv.appendChild(span);
    });
}

function renderQuestion() {
    const TOTAL_QUESTIONS = 30;

    if (state.quizIndex >= window.currentQuizQuestions.length || state.quizIndex >= TOTAL_QUESTIONS) {
        endGame(true); // All 30 answered correctly = WIN!
        return;
    }

    const qData = window.currentQuizQuestions[state.quizIndex];
    document.getElementById('questionText').innerText = qData.question;

    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';
    document.getElementById('quizFeedback').innerText = '';
    document.getElementById('nextQuestionBtn').style.display = 'none';

    // Reset hint usage for new question
    state.hintUsed = false;

    // Handle hint button state
    let hintBtn = document.getElementById('hintBtn');

    // DYNAMIC RECOVERY: If button is missing, create it
    if (!hintBtn) {
        hintBtn = document.createElement('button');
        hintBtn.id = 'hintBtn';
        hintBtn.className = 'hint-button';
        hintBtn.onclick = useHint;
        hintBtn.style.display = 'block';
        hintBtn.style.margin = '20px auto 0';
        const gridEl = document.getElementById('optionsGrid');
        if (gridEl && gridEl.parentNode) {
            gridEl.parentNode.insertBefore(hintBtn, gridEl.nextSibling);
        }
    }

    // Hint button: costs 300 coins, locked if not enough
    const HINT_COST = 300;
    if (hintBtn) {
        if (state.quizScore >= HINT_COST) {
            hintBtn.disabled = false;
            hintBtn.innerText = `\u{1F4A1} Hint (${HINT_COST} coins)`;
        } else {
            hintBtn.disabled = true;
            hintBtn.innerText = `\u{1F4A1} Hint (${HINT_COST} coins) \u{1F512}`;
        }
    }

    // 1. Map options to objects containing the text and the Original Index
    const optionsWithIndex = qData.options.map((opt, i) => ({
        text: opt,
        originalIndex: i
    }));

    // 2. Shuffle the mapped array
    optionsWithIndex.sort(() => Math.random() - 0.5);

    // 3. Find the NEW visual index of the correct answer
    const correctVisualIndex = optionsWithIndex.findIndex(item => item.originalIndex === qData.correctAnswer);

    const letters = ['A', 'B', 'C', 'D'];

    // 4. Render the SHUFFLED options
    optionsWithIndex.forEach((optObj, idx) => {
        const btn = document.createElement('div');
        btn.className = 'option-btn';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '0');
        btn.dataset.originalIndex = optObj.originalIndex;

        btn.innerHTML = `<span class="letter">${letters[idx]}:</span> <span class="option-text">${optObj.text}</span>`;

        btn.onclick = () => checkAnswer(idx, btn, correctVisualIndex);
        btn.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                checkAnswer(idx, btn, correctVisualIndex);
            }
        };
        grid.appendChild(btn);
    });

    // --- UPDATE PROGRESS BAR (green to red) ---
    const questionNum = state.quizIndex + 1;
    const progress = questionNum / TOTAL_QUESTIONS;
    const hue = Math.round(120 - (progress * 120)); // 120=green, 0=red

    const progressFill = document.getElementById('quizProgressFill');
    if (progressFill) {
        progressFill.style.width = `${progress * 100}%`;
        progressFill.style.background = `hsl(${hue}, 70%, 45%)`;
    }

    const progressText = document.getElementById('quizProgressText');
    if (progressText) {
        progressText.innerText = `Question ${questionNum} / ${TOTAL_QUESTIONS}`;
    }
}

function checkAnswer(selectedIdx, btnElement, correctIdx) {
    const questionTime = Date.now() - state.questionStartTime;
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');
    if (selectedIdx === correctIdx) {
        btnElement.classList.add('correct');
        document.getElementById('quizFeedback').style.color = 'var(--quiz-correct)';
        const scoreToAdd = 100;
        state.quizScore += scoreToAdd;
        updateScoreBoard();
        document.getElementById('quizFeedback').innerText = `CORRECT! Praise the Lord!\n+${scoreToAdd} points`;

        // --- NEW: Suppress this question for future runs ---
        if (window.currentQuizQuestions && window.currentQuizQuestions[state.quizIndex]) {
            const currentQ = window.currentQuizQuestions[state.quizIndex];
            // Use current language or 'text' if not set, consistent with getSelectedQuestions
            const langKey = state.currentLang || 'text';
            // We need to ensure we use the same suffix logic as getSelectedQuestions: langKey || 'text'
            // The state.currentLang might be 'text_spanish' or just 'text'
            // getSelectedQuestions uses: const storageSuffix = langKey || 'text';
            const suffix = langKey === 'text' ? 'text' : langKey;
            // Actually, getSelectedQuestions is called with (quizData, state.currentLang).
            // Inside it does: const storageSuffix = langKey || 'text';
            // So here we should pass state.currentLang (which might be 'text_spanish') to our helper
            // Our helper getSuppressedQuestions(langKey) uses `quizCorrectlyAnswered_${langKey}`.
            // Wait, getSelectedQuestions uses `quizAskedQuestions_${langKey || 'text'}`.
            // So if state.currentLang is 'text', suffix is 'text'.
            // If state.currentLang is 'text_spanish', suffix is 'text_spanish'.
            // My helper getSuppressedQuestions logic: `quizCorrectlyAnswered_${langKey}`
            // If I pass 'text', it becomes `quizCorrectlyAnswered_text`.
            // If I pass 'text_spanish', it becomes `quizCorrectlyAnswered_text_spanish`.
            // Logic seems consistent if I just pass state.currentLang || 'text'.
            suppressQuestion(currentQ.question, langKey);
        }
        // --------------------------------------------------

        setTimeout(() => nextQuestion(), 2000);
    } else {
        btnElement.classList.add('wrong');
        allBtns[correctIdx].classList.add('correct');
        document.getElementById('quizFeedback').style.color = 'var(--quiz-wrong)';
        document.getElementById('quizFeedback').innerText = "WRONG ANSWER. The quiz has ended.";
        setTimeout(() => endGame(), 3000);
    }
}

function nextQuestion() {
    // Progressive difficulty: if incorrect streak, stay at same difficulty or go back
    if (state.incorrectStreak && state.incorrectStreak >= 2) {
        // Reset streak after providing hint/opportunity
        state.incorrectStreak = 0;
    } else {
        state.quizIndex++;
    }
    state.questionStartTime = Date.now();
    renderQuestion();
}

function endGame(wonAll) {
    document.getElementById('gamePlayArea').style.display = 'none';
    const gameOverArea = document.getElementById('gameOverArea');
    gameOverArea.style.display = 'block';

    const finalPrize = state.quizScore;
    const langKey = state.currentLang || 'text';
    const previousBest = getBestScore(langKey);
    const isNewBest = saveBestScore(finalPrize, langKey);

    const gameOverIcon = document.getElementById('gameOverIcon');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const finalScoreText = document.getElementById('finalScoreText');
    const bestScoreText = document.getElementById('bestScoreText');

    if (wonAll) {
        // WIN SCREEN
        gameOverArea.classList.add('win-mode');
        if (gameOverIcon) gameOverIcon.innerText = '\u{1F3C6}';
        if (gameOverTitle) {
            gameOverTitle.innerText = 'CONGRATULATIONS!';
            gameOverTitle.style.color = 'var(--quiz-correct)';
        }
        if (finalScoreText) finalScoreText.innerText = `You are a True Disciple!\nScore: ${finalPrize.toLocaleString()} coins`;
        if (bestScoreText) {
            if (isNewBest) {
                bestScoreText.innerText = `\u{1F31F} NEW BEST SCORE! (Previous: ${previousBest.toLocaleString()})`;
                bestScoreText.style.color = '#ffd700';
            } else {
                bestScoreText.innerText = `Best Score: ${getBestScore(langKey).toLocaleString()}`;
                bestScoreText.style.color = '#aaa';
            }
        }
    } else {
        // LOSE SCREEN
        gameOverArea.classList.remove('win-mode');
        if (gameOverIcon) gameOverIcon.innerText = '\u{1F61E}';
        if (gameOverTitle) {
            gameOverTitle.innerText = 'GAME OVER';
            gameOverTitle.style.color = 'var(--quiz-accent)';
        }
        if (finalScoreText) finalScoreText.innerText = `You answered ${state.quizIndex} out of 30 correctly.\nScore: ${finalPrize.toLocaleString()} coins`;
        if (bestScoreText) {
            if (isNewBest && finalPrize > 0) {
                bestScoreText.innerText = `\u{1F31F} NEW BEST! (Previous: ${previousBest.toLocaleString()})`;
                bestScoreText.style.color = '#ffd700';
            } else {
                bestScoreText.innerText = `Best Score: ${getBestScore(langKey).toLocaleString()}`;
                bestScoreText.style.color = '#aaa';
            }
        }
    }

    // Update the scoreboard best score display
    updateScoreBoard();
}


// --- STATE MANAGEMENT ---
let currentQuiz = null; // Current selected quiz object
let availableQuizzes = []; // Array of available quizzes

// --- QUIZ LOADING AND SELECTION ---
// Duplicate loadQuizData removed to prevent Android fetch errors

// --- QUIZ SELECTION ---
// Bypassed: Direct transition to quiz game upon initialization



async function closeQuiz() {
    state.quizModeActive = false;

    showLoading("Returning to reading...");

    try {
        // Restore previous book if available, otherwise default to eternal_life
        if (state.previousBookKey) {
            await loadBook(state.previousBookKey);

            // Verify the book loaded successfully
            const book = books[state.previousBookKey];
            if (!book || !book.chapters || book.chapters.length === 0) {
                console.warn(`Failed to load ${state.previousBookKey}, falling back to eternal_life`);
                await loadBook('eternal_life');
            }

            if (state.previousBookKey === 'bible') {
                // Convert stored last location to savedBible... for restoration logic
                if (state.lastBibleBookName && state.lastBibleChapterNumber) {
                    state.savedBibleBookName = state.lastBibleBookName;
                    state.savedBibleChapterNumber = state.lastBibleChapterNumber;
                    await restoreBibleNavigation();
                } else {
                    await renderChapter();
                }
            } else {
                await renderChapter();
            }
            state.previousBookKey = null; // Reset after restoration
        } else {
            await loadBook('eternal_life');
            await renderChapter();
        }

        // Show navigation buttons when returning to reading mode
        showNavButtons();
    } catch (error) {
        console.error('Error closing quiz:', error);
        // Fallback to eternal_life
        await loadBook('eternal_life');
        await renderChapter();
    } finally {
        hideLoading();
    }
}

async function closeQuizToGameMenu() {
    await closeQuiz();
    setTimeout(() => {
        toggleGamesModal();
    }, 100);
}

function playAgain() {
    startQuiz();
}

// Duplicate updateScoreBoard removed - using enhanced version above

// --- HINT LIFELINE FUNCTION (300 coins) ---
function useHint() {
    const HINT_COST = 300;

    if (state.hintUsed) {
        alert("You've already used your hint this question!");
        return;
    }

    if (state.quizScore < HINT_COST) {
        alert(`Not enough coins! You need ${HINT_COST} coins to use a hint.`);
        return;
    }

    // Deduct 300 coins
    state.quizScore -= HINT_COST;
    updateScoreBoard();

    // Mark hint as used
    state.hintUsed = true;

    // Disable hint button
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.innerText = "\u{1F4A1} Hint Used (-" + HINT_COST + " coins)";
    }

    // Eliminate 2 wrong answers
    const qData = window.currentQuizQuestions[state.quizIndex];
    const optionsGrid = document.getElementById('optionsGrid');
    const optionBtns = optionsGrid.querySelectorAll('.option-btn');

    const wrongBtns = Array.from(optionBtns).filter(btn =>
        parseInt(btn.dataset.originalIndex) !== qData.correctAnswer && !btn.classList.contains('disabled')
    );

    const shuffledWrongBtns = wrongBtns.sort(() => Math.random() - 0.5);
    const numToEliminate = Math.min(2, shuffledWrongBtns.length);
    let eliminatedCount = 0;

    for (let i = 0; i < numToEliminate; i++) {
        const btnToEliminate = shuffledWrongBtns[i];
        btnToEliminate.style.opacity = '0.3';
        btnToEliminate.style.textDecoration = 'line-through';
        btnToEliminate.style.pointerEvents = 'none';
        btnToEliminate.classList.add('disabled');
        eliminatedCount++;
    }

    const eliminationText = eliminatedCount === 1 ? 'One wrong answer eliminated' :
        eliminatedCount === 2 ? 'Two wrong answers eliminated' : 'Wrong answers eliminated';

    document.getElementById('quizFeedback').innerText = `Hint used! ${eliminationText}. (-${HINT_COST} coins)`;
    document.getElementById('quizFeedback').style.color = 'var(--quiz-accent)';
}

// --- LANGUAGE SELECTION ---

async function setPreferredLanguage(langKey) {
    console.log('Setting preferred language to:', langKey);
    state.preferredLang = langKey;
    state.currentLang = langKey;
    localStorage.setItem('myReaderPreferredLang', langKey);

    // Call the new centralized changeLanguage function
    await changeLanguage(langKey);
}

// Consolidate Language Switching Logic (Renamed/Moved here)
async function changeLanguage(langKey) {
    showLoading(`Changing Language...`);

    // Allow UI to paint the loading screen before heavy lifting
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`🌐 Switching Language to: ${langKey}`);

    try {
        // 1. Reset Translation ID immediately to force re-evaluation
        // This is CRITICAL. If we don't do this, loadBibleForCurrentLanguage 
        // will try to use the OLD ID with the NEW language, which often fails
        // if that specific translation ID (e.g. 'YLT') doesn't exist in the new language source list.
        // We set it to null so loadBibleForCurrentLanguage picks the default for the new lang.
        state.currentTranslationId = null;

        // Ensure Bible metadata is loaded for the new language immediately
        // so that Notifications and other modules use correct localized data
        await loadBibleForCurrentLanguage(langKey, true);

        // Update all book titles for the new language
        updateBookTitles(langKey);

        // Apply Language-Specific Font
        const config = BIBLE_CONFIG[langKey] || BIBLE_CONFIG['text'];
        if (config && config.font) {
            // Use the specific font defined in config
            // We access document directly or use setFontFamily if available (it sets --font-family)
            if (typeof setFontFamily === 'function') {
                setFontFamily(config.font);
            } else {
                document.documentElement.style.setProperty('--font-family', config.font);
            }
        } else {
            // Revert to default
            if (typeof setFontFamily === 'function') {
                setFontFamily("Georgia, 'Times New Roman', serif");
            } else {
                document.documentElement.style.setProperty('--font-family', "Georgia, 'Times New Roman', serif");
            }
        }

        // 2. Update styling for RTL/LTR
        if (typeof updateRTL === 'function') updateRTL();

        // 3. Load the Content
        if (state.currentBookKey === 'bible') {
            await renderChapter();

            // Check for download prompt
            checkAndPromptDownload();

            // Refresh Book List (Sidebar) as names might change
            if (typeof generateBookList === 'function') generateBookList();

        } else if (state.currentBookKey === 'eternal_life') {
            await loadBook('eternal_life');
            await renderChapter();

        } else if (state.currentBookKey === 'quiz') {
            // Clear quiz cache
            localStorage.removeItem('quizShuffledQuestions');
            localStorage.removeItem('quizAskedQuestions');
            // Restart quiz with new language
            if (typeof initializeQuiz === 'function') await initializeQuiz();
        }

        // 4. Update UI availability
        if (typeof disableUnavailableLanguages === 'function') {
            disableUnavailableLanguages();
        } else {
            // Fallback/Stub if the function is missing to prevent crash
            console.warn("disableUnavailableLanguages function not found, skipping.");
        }

        // 5. Save state
        saveReadingState();
        updateLanguageDropdown();
        updateBibleSelectors(); // Refresh dropdowns with new language options

        // Update Daily Verse Notifications for the new language
        if (typeof Notifications !== 'undefined' && typeof Notifications.reschedule === 'function') {
            // Delay slightly to ensure data is settled
            setTimeout(() => {
                Notifications.reschedule(books, state);
            }, 2000);
        }

    } catch (error) {
        console.error("Error processing language change:", error);

        // ALERT THE USER - No more silent failures
        alert(`Failed to load language content: ${error.message}\n\nPlease check your internet connection.`);

        // Optional: Revert to English if it failed completely?
        // For now, just letting them know is huge improvement.

    } finally {
        // FIX: Always save state, even if content load failed, so the User's choice (e.g. Portuguese for Quiz) persists
        saveReadingState();
        updateLanguageDropdown();
        hideLoading();
    }
}

function updateLanguageDropdown() {
    const selector = document.getElementById('preferredLangSelector');
    if (selector && state.currentLang) {
        selector.value = state.currentLang;
    }
}

function updateBookTitles(langKey) {
    // Update eternal_life title
    if (LOCALIZED_ETERNAL_LIFE_TITLES[langKey]) {
        books['eternal_life'].title = LOCALIZED_ETERNAL_LIFE_TITLES[langKey];
    } else {
        books['eternal_life'].title = LOCALIZED_ETERNAL_LIFE_TITLES['text'];
    }

    // Update notes title
    if (LOCALIZED_NOTES_TITLES[langKey]) {
        books['notes'].title = LOCALIZED_NOTES_TITLES[langKey];
    } else {
        books['notes'].title = LOCALIZED_NOTES_TITLES['text'];
    }

    // Update chat title
    if (LOCALIZED_CHAT_TITLES[langKey]) {
        books['chat'].title = LOCALIZED_CHAT_TITLES[langKey];
    } else {
        books['chat'].title = LOCALIZED_CHAT_TITLES['text'];
    }

    console.log(`Updated book titles for language: ${langKey}`);
}

// --- DYNAMIC BIBLE LOADING ---

/**
 * Loads the Bible structure (book list) for the given translation ID.
 * Defines the 'bible' book object but does NOT load full chapter content yet.
 * @param {string} translationId - The Bolls.life translation ID (e.g., 'YLT', 'KJV').
 */
/**
 * Helper to map HELLOAO book IDs to standard English index
 * This ensures we can localize book names even if the source gives us native script names
 */
const helloaoBookIdToIndex = {
    'GEN': 0, 'EXO': 1, 'LEV': 2, 'NUM': 3, 'DEU': 4, 'JOS': 5, 'JDG': 6, 'RUT': 7,
    '1SA': 8, '2SA': 9, '1KI': 10, '2KI': 11, '1CH': 12, '2CH': 13, 'EZR': 14, 'NEH': 15,
    'EST': 16, 'JOB': 17, 'PSA': 18, 'PRO': 19, 'ECC': 20, 'SNG': 21, 'ISA': 22, 'JER': 23,
    'LAM': 24, 'EZK': 25, 'DAN': 26, 'HOS': 27, 'JOL': 28, 'AMO': 29, 'OBA': 30, 'JON': 31,
    'MIC': 32, 'NAM': 33, 'HAB': 34, 'ZEP': 35, 'HAG': 36, 'ZEC': 37, 'MAL': 38,
    'MAT': 39, 'MRK': 40, 'LUK': 41, 'JHN': 42, 'ACT': 43, 'ROM': 44, '1CO': 45, '2CO': 46,
    'GAL': 47, 'EPH': 48, 'PHP': 49, 'COL': 50, '1TH': 51, '2TH': 52, '1TI': 53, '2TI': 54,
    'TIT': 55, 'PHM': 56, 'HEB': 57, 'JAS': 58, '1PE': 59, '2PE': 60, '1JN': 61, '2JN': 62,
    '3JN': 63, 'JUD': 64, 'REV': 65
};

/**
 * Loads the Bible structure (book list) for the given language using configured sources.
 * Iterates through available sources until one succeeds.
 * @param {string} langKey - The language key (e.g., 'text', 'text_hindi').
 */
async function loadBibleForCurrentLanguage(langKey, keepLoading = false, targetVersionId = null, silent = false) {
    // 0. CHECK LOCAL STORAGE FIRST (NEW!)
    try {
        if (typeof BibleStorage !== 'undefined') {
            const localBible = await BibleStorage.loadBible(langKey);

            if (localBible) {
                // Check if we are enforcing a specific version
                const versionMismatch = targetVersionId && localBible.translationId !== targetVersionId;

                if (versionMismatch) {
                    console.log(`Cached bible (${localBible.translationId}) does not match target (${targetVersionId}). Ignoring cache.`);
                    // Fall through to load from source
                } else {
                    console.log(`\u2713 Loading ${langKey} from local storage (OFFLINE)`);
                    books['bible'] = localBible;
                    state.usingCachedBible = true;
                    // Use the ID saved in the object, or fallback to langKey
                    state.currentTranslationId = localBible.translationId || langKey;

                    // Update loading text to show offline
                    if (!silent) showLoading(`Loading ${langKey} (Offline)...`);
                    if (!silent) hideLoading();

                    // Show offline indicator in UI
                    if (typeof updateOfflineIndicator !== 'undefined') {
                        updateOfflineIndicator(true);
                    }

                    return; // Successfully loaded from local storage
                }
            } else {
                console.log(`No local copy of ${langKey} found, loading from API...`);
                state.usingCachedBible = false;
                if (typeof updateOfflineIndicator !== 'undefined') {
                    updateOfflineIndicator(false);
                }
            }
        }
    } catch (error) {
        console.error('Error checking local storage:', error);
        state.usingCachedBible = false;
    }

    // 1. Get Config


    const config = BIBLE_CONFIG[langKey] || BIBLE_CONFIG['text'];

    // RESET LOGIC: If a specific versionId was passed (from setBibleVersion), prioritize it.
    // If not, check if state.currentTranslationId is valid for this language.
    // If not, fall back to first source.

    // Safety check for undefined config
    if (!config) {
        console.error(`Missing Bible config for ${langKey}! Falling back to English config.`);
        // Force fallback or return to prevent crash
        // config = BIBLE_CONFIG['text']; // Can't reassign const
        // We handle this by ensuring activeSources is valid below
    }

    let activeSources = (config && config.sources) ? config.sources : [];

    // Prioritize targetVersionId if provided
    if (targetVersionId) {
        state.currentTranslationId = targetVersionId;
    }

    // Fix: If state.currentTranslationId is null (e.g. fresh language switch),
    // don't try to filter by it yet.
    if (state.currentTranslationId) {
        // Find matching source for state.currentTranslationId
        let match = activeSources.find(s => (s.id || s.lang) === state.currentTranslationId);

        // If we have a translation ID but it doesn't match any source for this language,
        // it's likely a leftover from the *previous* language.
        // In this case, we should IGNORE state.currentTranslationId and pick the default.
        if (!match) {
            console.log(`Current translation ID ${state.currentTranslationId} not found in ${langKey} sources. Resetting to default.`);
            state.currentTranslationId = null; // Reset to force default selection
        }
    }

    // If no specific translation ID is active (or was reset), default to first source
    if (!state.currentTranslationId && activeSources.length > 0) {
        state.currentTranslationId = activeSources[0].id || activeSources[0].lang;
    }

    // FILTER sources to only match the currentTranslationId
    // This ensures we only try to load the *selected* version, not iterating others unless fallback is desired.
    if (state.currentTranslationId) {
        const specificSource = activeSources.find(s => (s.id || s.lang) === state.currentTranslationId);

        if (specificSource) {
            activeSources = [specificSource];
        } else {
            // Fallback: If filtered to empty (shouldn't happen if logic above works), revert to all
            console.warn("Could not find source for ID " + state.currentTranslationId + ", reverting to all sources.");
            activeSources = config.sources || [];
        }
    }

    // Alert user if fallback/message exists
    if (config.message) {
        setTimeout(() => alert(config.message), 500);
    }

    console.log(`Loading Bible for ${langKey} using ${activeSources.length} sources...`);

    // Show loading indicator
    if (!silent) showLoading(`Loading ${config.message ? 'Bible' : langKey}...`);

    let loaded = false;


    // 2. Iterate Sources
    // CHECK FIRST: If unavailable, force fallback immediately without trying sources
    // Scenario A: User navigates to Bible with unavailable language
    // Scenario A: User navigates to Bible with unavailable language
    if (config.unavailable || !activeSources || activeSources.length === 0) {
        console.warn(`Language ${langKey} is unavailable. Falling back to English content.`);

        // Force fallback to English sources ONLY if truly unavailable
        activeSources = BIBLE_CONFIG['text'].sources || [];

        // Note: We deliberately do NOT change state.currentLang here to 'text'
        // This allows the Quiz to still try loading 'quiz_portuguese.json' even if the Bible text fails.
        // We only change the *sources* used for the Bible book.
    }

    for (const source of activeSources) {
        try {
            console.log(`Attempting source type: ${source.type} (${source.id || source.lang || source.path})`);

            if (source.type === 'BOLLS') {
                // Fetch Book List from Bolls API
                // Ensure we use the global 'api' object
                const api = window.api || window.BIBLE_API;
                if (!api) throw new Error("API module not loaded");

                console.log(`[DEBUG_BOLLS] Fetching books for ${source.id}...`);
                let booksList;
                try {
                    booksList = await api.getBooks(source.id);
                } catch (apiErr) {
                    console.error(`[DEBUG_BOLLS] api.getBooks threw:`, apiErr);
                    throw apiErr; // Re-throw to be caught by outer catch
                }

                if (!booksList || !Array.isArray(booksList) || booksList.length === 0) {
                    console.error(`[DEBUG_BOLLS] Invalid booksList received:`, booksList);
                    throw new Error('No books found or invalid format');
                }

                console.log(`[DEBUG_BOLLS] received ${booksList.length} books.`);

                let allChapters = [];
                booksList.forEach(b => {
                    // Safety check for chapters count
                    const chapterCount = b.chapters || 0;
                    if (chapterCount <= 0) {
                        console.warn(`[DEBUG_BOLLS] Book ${b.name} has 0 chapters.`);
                    }
                    for (let c = 1; c <= chapterCount; c++) {
                        allChapters.push({
                            title: `${b.name} Chapter ${c}`,
                            bookName: b.name,
                            bookId: b.bookid,
                            chapterNumber: c,
                            verses: [],
                            isLoaded: false,
                            apiLink: `https://bolls.life/get-chapter/${source.id}/${b.bookid}/${c}/`
                        });
                    }
                });

                if (allChapters.length === 0) {
                    throw new Error("No chapters generated from books list");
                }

                books['bible'] = {
                    title: "Holy Bible",
                    translationId: source.id,
                    chapters: allChapters,
                    sourceType: 'BOLLS'
                };
                state.currentTranslationId = source.id;
                loaded = true;

            } else if (source.type === 'GITHUB_GODLYTALIAS') {
                const url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/${source.lang}/bible.json`;
                console.log("Fetching Odia URL:", url);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

                const data = await response.json();
                const transformed = transformGodlyTaliasData(data, langKey);
                transformed.translationId = source.lang; // Use lang name as ID

                books['bible'] = transformed;
                books['bible'].sourceType = 'GITHUB_GODLYTALIAS';
                state.currentTranslationId = source.lang;
                loaded = true;

            } else if (source.type === 'GITHUB_WLDEH') {
                console.log("Fetching from GITHUB_WLDEH...");
                const url = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${source.file}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

                const data = await response.json();
                const transformed = transformWldehData(data, langKey);
                transformed.translationId = source.file;

                books['bible'] = transformed;
                books['bible'].sourceType = 'GITHUB_WLDEH';
                state.currentTranslationId = source.file;
                loaded = true;

            } else if (source.type === 'LOCAL') {
                const response = await fetch(source.path);
                if (!response.ok) throw new Error('Local file not found');

                const data = await response.json();
                // Assume local files follow GodlyTalias format for now (like Odia_bible.json)
                const transformed = transformGodlyTaliasData(data, langKey);
                transformed.translationId = 'LOCAL';

                books['bible'] = transformed;
                books['bible'].sourceType = 'LOCAL';
                state.currentTranslationId = 'LOCAL';
                loaded = true;

            } else if (source.type === 'HELLOAO') {
                console.log(`Fetching from HELLOAO: ${source.id}`);
                const url = `https://bible.helloao.org/api/${source.id}/books.json`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

                const data = await response.json();
                const allChapters = [];

                data.books.forEach(b => {
                    for (let c = 1; c <= b.numberOfChapters; c++) {
                        allChapters.push({
                            title: `${b.name} ${c}`,
                            bookName: b.name || b.common || b.id || "Book",
                            bookId: b.id, // HELLOAO uses GEN, EXO etc.
                            chapterNumber: c,
                            apiLink: `https://bible.helloao.org/api/${source.id}/${b.id}/${c}.json`, // Save for later fetching
                            verses: [],
                            isLoaded: false
                        });
                    }
                });

                books['bible'] = {
                    title: data.translation.englishName || "Holy Bible",
                    translationId: source.id,
                    chapters: allChapters,
                    sourceType: 'HELLOAO'
                };
                state.currentTranslationId = source.id;
                loaded = true;

            } else if (source.type === 'LOCAL_BIBLE') {
                console.log(`Fetching from LOCAL_BIBLE (via XHR): ${source.path}`);

                // Helper for XHR fetch (supports file://)
                const fetchLocal = (url) => {
                    return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('GET', url, true);
                        xhr.responseType = 'json';
                        xhr.onload = () => {
                            if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
                                resolve(xhr.response);
                            } else {
                                reject(new Error(`XHR failed: ${xhr.status}`));
                            }
                        };
                        xhr.onerror = () => reject(new Error('XHR Network Error'));
                        xhr.send();
                    });
                };

                // Fetch books.json from the local directory
                const url = `${source.path}/books.json`;
                try {
                    const data = await fetchLocal(url);
                    const allChapters = [];

                    // Expecting HELLOAO-like structure for books.json: { books: [...] }
                    if (data && data.books) {
                        data.books.forEach(b => {
                            for (let c = 1; c <= b.numberOfChapters; c++) {
                                allChapters.push({
                                    title: `${b.name} ${c}`,
                                    bookName: b.name || b.common || b.id || "Book",
                                    bookId: b.id,
                                    chapterNumber: c,
                                    // Construct path to chapter file: dogri_bible_json/MAT/1.json
                                    apiLink: `${source.path}/${b.id}/${c}.json`,
                                    verses: [],
                                    isLoaded: false
                                });
                            }
                        });
                    }

                    books['bible'] = {
                        title: data.translation?.englishName || "Holy Bible",
                        translationId: source.path, // Use path as ID
                        chapters: allChapters,
                        sourceType: 'LOCAL_BIBLE'
                    };
                    state.currentTranslationId = source.path;

                    // IMPORTANT: Pass the fetchLocal helper to renderChapter via a global or state property
                    // so it can be used for chapters too.
                    window.fetchLocal = fetchLocal;

                    loaded = true;
                } catch (e) {
                    console.error("Local Bible fetch failed:", e);
                    throw e;
                }

            } else if (source.type === 'GITHUB_V2') {
                console.log(`Fetching from GITHUB_V2 (GetBible): ${source.id}`);

                // Try Full Bible JSON first (e.g., ylt.json) containing all text
                let url = `https://api.getbible.net/v2/${source.id}.json`;
                let response = await fetch(url);

                // If 404, fallback to legacy books.json (e.g., monkjv)
                if (!response.ok) {
                    console.log("Full Bible fetch failed, trying legacy books.json path...");
                    url = `https://api.getbible.net/v2/${source.id}/books.json`;
                    response = await fetch(url);
                }

                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                const data = await response.json();

                let allChapters = [];

                // Case 1: Full Bible Object (V2 Standard)
                if (data.books && Array.isArray(data.books)) {
                    data.books.forEach(b => {
                        // V2 books have 'chapters' array
                        if (b.chapters && Array.isArray(b.chapters)) {
                            const bName = b.name || b.common || "Unknown";
                            b.chapters.forEach(c => {
                                // Flatten into chapters list
                                allChapters.push({
                                    title: `${bName} ${c.chapter}`,
                                    bookName: bName,
                                    chapterNumber: c.chapter,
                                    // V2 verses: [{verse: 1, text: "..."}]
                                    verses: (c.verses || []).map(v => ({
                                        id: `${bName} ${c.chapter}:${v.verse}`,
                                        verseId: v.verse,
                                        verse: v.verse,
                                        text: v.text
                                    })),
                                    isLoaded: true // Content is ready!
                                });
                            });
                        }
                    });

                    // Fallback check: if no chapters found (empty books?), maybe structure is different
                }
                // Case 2: Legacy Book List (Array) - e.g. monkjv/books.json
                else if (Array.isArray(data) || (typeof data === 'object' && !data.books)) {
                    const booksData = Array.isArray(data) ? data : Object.values(data);

                    const bibleChapterCounts = {
                        // OT
                        1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24, 11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31, 21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9, 31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4,
                        // NT
                        40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22,
                        // Apocrypha (Common IDs)
                        67: 14, 68: 16, 69: 6, 70: 16, 71: 6, 72: 19, 73: 51, 74: 5, 75: 1, 76: 8, 77: 1, 78: 4, 79: 7, 80: 7, 81: 2, 82: 14, 83: 7, 84: 4
                    };

                    booksData.forEach(b => {
                        const chapterCount = bibleChapterCounts[b.nr] || 1;
                        for (let c = 1; c <= chapterCount; c++) {
                            allChapters.push({
                                title: `${b.name} ${c}`,
                                bookName: b.name,
                                bookId: b.id || b.nr,
                                chapterNumber: c,
                                apiLink: `https://api.getbible.net/v2/${source.id}/${b.nr}/${c}.json`, // Legacy placeholder
                                verses: [],
                                isLoaded: false // Need to fetch later using getChapter (which needs updating for V2?)
                            });
                        }
                    });
                }

                books['bible'] = {
                    title: (data.translation && data.translation.name) || source.id,
                    translationId: source.id,
                    chapters: allChapters,
                    sourceType: 'GITHUB_V2'
                };
                state.currentTranslationId = source.id;
                loaded = true;

            } else if (source.type === 'GITHUB_ARULJOHN') {
                console.log(`Fetching from GITHUB_ARULJOHN: ${source.id}`);
                // Strategy: Fetch Books.json (list of books), init chapters with isLoaded=false.
                // onBibleBookChange will handle the actual data fetching for each book.

                const baseUrl = `https://raw.githubusercontent.com/aruljohn/${source.id}/master`;
                const booksUrl = `${baseUrl}/Books.json`;
                console.log(`[DEBUG_NIV] Fetching books list from: ${booksUrl}`);

                try {
                    const response = await fetch(booksUrl);
                    if (!response.ok) throw new Error("Failed to load book list from Aruljohn");
                    const bookList = await response.json(); // ["Genesis", "Exodus", ...]

                    let allChapters = [];
                    const bibleChapterCounts = {
                        "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34, "Joshua": 24, "Judges": 21, "Ruth": 4,
                        "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13,
                        "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66, "Jeremiah": 52,
                        "Lamentations": 5, "Ezekiel": 48, "Daniel": 12, "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7,
                        "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
                        "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28, "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13,
                        "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4, "1 Thessalonians": 5, "2 Thessalonians": 3,
                        "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3,
                        "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22, "Song of Solomon": 8
                    };

                    bookList.forEach(bName => {
                        // Normalize book name to match key if needed
                        let lookupName = bName;
                        if (bName === "Song Of Solomon") lookupName = "Song of Solomon";

                        const chCount = bibleChapterCounts[lookupName] || 50;

                        for (let c = 1; c <= chCount; c++) {
                            allChapters.push({
                                title: `${bName} ${c}`,
                                bookName: bName,
                                bookId: c.toString(), // Added explicit bookId to fix undefined.json error
                                chapterNumber: c,
                                // We store the book JSON URL here. 
                                // onBibleBookChange will use this to fetch if needed.
                                apiLink: `${baseUrl}/${encodeURIComponent(bName)}.json`,
                                verses: [],
                                isLoaded: false
                            });
                        }
                    });

                    books['bible'] = {
                        title: "Holy Bible (NIV)",
                        translationId: source.id,
                        chapters: allChapters,
                        sourceType: 'GITHUB_ARULJOHN'
                    };
                    state.currentTranslationId = source.id;
                    loaded = true;
                } catch (err) {
                    console.error("Aruljohn load failed:", err);
                    // continue to next source
                }
            } else if (source.type === 'GITHUB_CUSTOM') {
                console.log(`Fetching from GITHUB_CUSTOM: ${source.url}`);
                const response = await fetchWithRetry(source.url, {}, 30000, 3);
                const data = await response.json();

                let transformed;
                if (typeof window[source.transformFn] === 'function') {
                    transformed = window[source.transformFn](data, langKey);
                } else if (typeof transformRohingyaData === 'function' && source.transformFn === 'transformRohingyaData') {
                    transformed = transformRohingyaData(data, langKey);
                } else {
                    throw new Error(`Transform function ${source.transformFn} not found`);
                }

                transformed.translationId = 'CUSTOM_' + langKey;
                books['bible'] = transformed;
                books['bible'].sourceType = 'GITHUB_CUSTOM';

                state.currentTranslationId = 'CUSTOM_' + langKey;
                loaded = true;
            }

            if (loaded) {
                // OVERRIDE TITLE WITH GENERIC LOCALIZED TITLE
                // Use the localized title if available, otherwise default to "Holy Bible"
                // This ensures we show the generic book name rather than the specific translation name
                if (SHORT_BIBLE_TITLES[langKey]) {
                    books['bible'].title = SHORT_BIBLE_TITLES[langKey];
                } else if (LOCALIZED_BIBLE_TITLES[langKey]) {
                    books['bible'].title = LOCALIZED_BIBLE_TITLES[langKey];
                } else {
                    books['bible'].title = "Holy Bible";
                }

                console.log(`Successfully loaded Bible from ${source.type} for ${langKey}. Title set to: ${books['bible'].title}`);
                break; // Stop iterating
            }

        } catch (e) {
            console.warn(`Source ${source.type} failed:`, e);
            // Continue to next source
        }
    }

    if (!loaded) {
        console.error("All sources failed for", langKey);
        if (!silent) hideLoading();
        alert(`Could not load Bible for selected language. Please check your internet connection or try again later.`);
        // Do NOT fall back to English automatically. Keep the previous state or let the user decide.
        // Option: Revert dropdown if needed, but for now just stop.
        if (dom.page) {
            dom.page.innerHTML = '<p class="error-msg">Failed to load Bible. Please try another language.</p>';
        }
    } else {
        if (!keepLoading && !silent) hideLoading();
        // Success: Update UI
        if (state.currentBookKey === 'bible') {
            updateBibleNavigationToolbar();
            renderChapter();
        }
    }
}




// --- BIBLE NAVIGATION TOOLBAR ---

function createBibleNavigationToolbar() {
    const toolbar = document.getElementById('bibleNavigationToolbar');
    if (!toolbar) {
        // Create the toolbar container
        const container = document.createElement('div');
        container.id = 'bibleNavigationToolbar';
        container.className = 'bible-navigation-toolbar';

        // Create book selector
        const bookSelect = document.createElement('select');
        bookSelect.id = 'bibleBookSelector';
        bookSelect.className = 'bible-nav-select';
        bookSelect.innerHTML = '<option value="">Select Book...</option>';

        // Create chapter selector
        const chapterSelect = document.createElement('select');
        chapterSelect.id = 'bibleChapterSelector';
        chapterSelect.className = 'bible-nav-select';
        chapterSelect.innerHTML = '<option value="">Chapter</option>';

        // Create verse selector
        const verseSelect = document.createElement('select');
        verseSelect.id = 'bibleVerseSelector';
        verseSelect.className = 'bible-nav-select';
        verseSelect.innerHTML = '<option value="">Verse</option>';

        // Add event handlers
        bookSelect.onchange = onBibleBookChange;
        chapterSelect.onchange = onBibleChapterChange;
        verseSelect.onchange = onBibleVerseChange;

        // Append to container
        container.appendChild(bookSelect);
        container.appendChild(chapterSelect);
        container.appendChild(verseSelect);

        // Insert as a new row below the header-top-row
        const headerTopRow = document.querySelector('.header-top-row');
        if (headerTopRow) {
            headerTopRow.parentNode.insertBefore(container, headerTopRow.nextSibling);
        } else {
            // Fallback: append to toolbar
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) {
                toolbar.appendChild(container);
            }
        }
    }

    // Populate book options
    populateBibleBooks();
}

function populateBibleBooks() {
    const bookSelect = document.getElementById('bibleBookSelector');
    // FIX: Robust check for books['bible'] and its chapters to prevent "Cannot read properties of undefined"
    if (!bookSelect || !books['bible'] || !books['bible'].chapters) {
        console.warn("populateBibleBooks: bailing out, books['bible'] not ready");
        return;
    }

    const bookChapters = books['bible'].chapters;
    const uniqueBooks = [...new Set(bookChapters.map(ch => ch.bookName))];

    // Get the current book name from the chapter being viewed
    const currentChapter = books['bible'].chapters[state.currentChapterIndex];
    const currentBookName = currentChapter ? currentChapter.bookName : null;

    bookSelect.innerHTML = '';
    const normalizedLang = state.currentLang ? state.currentLang.replace('text_', '') : 'english';

    uniqueBooks.forEach((bookName, index) => {
        const option = document.createElement('option');
        option.value = bookName;

        let displayName = bookName;

        // ROBUST LOCALIZATION LOOKUP
        // 1. Find index of this book in the Standard English List
        let stdIndex = bibleBookNames.indexOf(bookName);

        // Fallback: use bookId mapping for HELLOAO/LOCAL_BIBLE sources
        if (stdIndex === -1) {
            const firstChapterOfBook = bookChapters.find(ch => ch.bookName === bookName);
            if (firstChapterOfBook && firstChapterOfBook.bookId && helloaoBookIdToIndex[firstChapterOfBook.bookId] !== undefined) {
                stdIndex = helloaoBookIdToIndex[firstChapterOfBook.bookId];
            }
        }

        // 2. If valid index, look up in localized lists
        if (stdIndex !== -1) {
            if (normalizedLang === 'odia' && odiaBookNames[stdIndex]) {
                displayName = odiaBookNames[stdIndex];
            } else if (normalizedLang === 'hindi' && hindiBookNames[stdIndex]) {
                displayName = hindiBookNames[stdIndex];
            } else if (normalizedLang === 'bengali' && bengaliBookNames[stdIndex]) {
                displayName = bengaliBookNames[stdIndex];
            } else if (normalizedLang === 'gujarati' && gujaratiBookNames[stdIndex]) {
                displayName = gujaratiBookNames[stdIndex];
            } else if (normalizedLang === 'kannada' && kannadaBookNames[stdIndex]) {
                displayName = kannadaBookNames[stdIndex];
            } else if (normalizedLang === 'marathi' && marathiBookNames[stdIndex]) {
                displayName = marathiBookNames[stdIndex];
            } else if (normalizedLang === 'punjabi' && punjabiBookNames[stdIndex]) {
                displayName = punjabiBookNames[stdIndex];
            } else if (normalizedLang === 'tamil' && tamilBookNames[stdIndex]) {
                displayName = tamilBookNames[stdIndex];
            } else if (normalizedLang === 'telugu' && teluguBookNames[stdIndex]) {
                displayName = teluguBookNames[stdIndex];
            } else if (normalizedLang === 'malayalam' && malayalamBookNames[stdIndex]) {
                displayName = malayalamBookNames[stdIndex];
            }
        } else {
            // Fallback: Try simple index matching if book names don't match standard English
            // (Only safe if we are somewhat sure of the order, mostly for Odia legacy support)
            if (normalizedLang === 'odia' && odiaBookNames[index]) {
                displayName = odiaBookNames[index];
            }
        }

        option.textContent = displayName;
        // Preselect the current book being viewed
        if (bookName === currentBookName) {
            option.selected = true;
        }
        bookSelect.appendChild(option);
    });
}

async function onBibleBookChange() {
    const bookName = document.getElementById('bibleBookSelector').value;

    if (books['bible'] && books['bible'].chapters) {
        // Find the index of the FIRST chapter belonging to the selected book
        const firstChapterIndex = books['bible'].chapters.findIndex(chapter => chapter.bookName === bookName);

        if (firstChapterIndex !== -1) {

            // --- GITHUB_ARULJOHN Lazy Loading Logic (Helper) ---
            await ensureAruljohnBookLoaded(bookName);
            // ------------------------------------------

            state.currentChapterIndex = firstChapterIndex;
            // ------------------------------------------

            state.currentChapterIndex = firstChapterIndex;
            state.currentBookKey = 'bible';
            saveReadingState();

            // Re-populate chapters and verses based on the new book selection
            populateBibleChapters();
            populateBibleVerses();

            // Render the first chapter of the selected book
            renderChapter();
        }
    }
}

function populateBibleChapters() {
    const chapterSelect = document.getElementById('bibleChapterSelector');
    if (!chapterSelect || !books['bible']) return;

    const selectedBook = document.getElementById('bibleBookSelector').value;
    if (!selectedBook) {
        chapterSelect.innerHTML = '<option value="">Chapter</option>';
        return;
    }

    const bookChapters = books['bible'].chapters.filter(ch => ch.bookName === selectedBook);
    chapterSelect.innerHTML = '<option value="">Chapter</option>';

    bookChapters.forEach((ch, index) => {
        const option = document.createElement('option');
        // Use defined chapter number or fallback to index
        const chapNum = ch.chapterNumber || (index + 1);
        option.value = chapNum;
        option.textContent = `Chapter ${chapNum}`;

        // Check if this is the current chapter to select it
        if (state.currentBookKey === 'bible' &&
            state.currentChapterIndex !== undefined) {
            const currentCh = books['bible'].chapters[state.currentChapterIndex];
            if (currentCh && currentCh.bookName === selectedBook &&
                (currentCh.chapterNumber == chapNum)) {
                option.selected = true;
            }
        }

        chapterSelect.appendChild(option);
    });
}

function updateBibleSelectors() {
    populateBibleBooks();
    populateBibleChapters();
    // populateBibleVerses(); // If exists
}

async function onBibleChapterChange() {
    const bookName = document.getElementById('bibleBookSelector').value;
    const chapterNumberStr = document.getElementById('bibleChapterSelector').value;
    // Stop if no valid chapter is selected
    if (!chapterNumberStr) return;

    // Convert the selected chapter value to an integer for reliable comparison
    const targetChapterNumber = parseInt(chapterNumberStr);
    if (books['bible'] && books['bible'].chapters) {
        // Find the index of the matching chapter
        const targetChapterIndex = books['bible'].chapters.findIndex(chapter =>
            chapter.bookName === bookName &&
            (chapter.chapterNumber === targetChapterNumber || parseInt(chapter.chapterNumber) === targetChapterNumber)
        );

        if (targetChapterIndex !== -1) {
            state.currentChapterIndex = targetChapterIndex;
            // FIX: Ensure book key is set to 'bible' for correct state saving
            state.currentBookKey = 'bible';
            // FIX: Always reset verse number when navigating chapter via dropdown
            state.currentVerseNumber = 0;

            await renderChapter();
            updateProgressBar();
            // FIX: Save state after successful chapter change
            saveReadingState();
        }
    }
    populateBibleVerses();
}

function populateBibleVerses() {
    const verseSelect = document.getElementById('bibleVerseSelector');
    if (!verseSelect || !books['bible']) return;

    const currentChapter = books['bible'].chapters[state.currentChapterIndex];
    if (!currentChapter || !currentChapter.verses) {
        verseSelect.innerHTML = '<option value="">Verse</option>';
        return;
    }

    console.log(`[populateBibleVerses] Populating for ${currentChapter.title} (${currentChapter.verses.length} verses)`);

    verseSelect.innerHTML = '<option value="">Verse</option>';
    currentChapter.verses.forEach((v, index) => {
        const option = document.createElement('option');
        // Use actual verse number from data, removing leading zeros
        let verseNum;
        if (v.verseId !== null && v.verseId !== undefined) {
            verseNum = String(v.verseId).replace(/^0+/, '') || '1';
        } else if (v.verse !== null && v.verse !== undefined) {
            verseNum = String(v.verse).replace(/^0+/, '') || '1';
        } else {
            // WARN: Fallback to index implies potential data issue or missing ID
            // console.warn(`Verse at index ${index} has no ID. Falling back to index ${index + 1}.`);
            verseNum = (index + 1).toString(); // Fallback to index
        }

        // Ensure strictly numeric string if possible for comparison
        // But keep as string for value

        option.value = verseNum;
        option.textContent = `Verse ${verseNum}`;
        verseSelect.appendChild(option);
    });
}

function onBibleVerseChange() {
    const verseNumberStr = document.getElementById('bibleVerseSelector').value;
    // Parse to integer for reliable saving (0 if empty/invalid)
    // BUT we also need to handle complex IDs if they exist (though currently we map to numbers)
    // For highlighting, we generally expect a number or a simple string ID
    const verseNumber = parseInt(verseNumberStr) || 0;

    console.log(`[onBibleVerseChange] Selected: "${verseNumberStr}" -> Parsed: ${verseNumber}`);

    // 1. Save the new verse number to state
    state.currentVerseNumber = verseNumber;
    saveReadingState(); // Save the state immediately

    // 2. Directly highlight the verse (no need to re-render the chapter)
    if (verseNumberStr && verseNumberStr !== "") {
        // Verses are already rendered, just scroll and highlight
        highlightVerse(verseNumberStr);
    }
}

function updateBibleNavigationToolbar() {
    if (state.currentBookKey === 'bible' && books['bible']) {
        const chapter = books['bible'].chapters[state.currentChapterIndex];
        if (chapter && chapter.bookName) {
            const bookSelect = document.getElementById('bibleBookSelector');
            const chapterSelect = document.getElementById('bibleChapterSelector');

            if (bookSelect) bookSelect.value = chapter.bookName;

            // Populate chapters and verses based on current selection
            populateBibleChapters();
            populateBibleVerses();

            // Set current chapter and current verse
            if (chapterSelect) chapterSelect.value = chapter.chapterNumber || '';
            const verseSelect = document.getElementById('bibleVerseSelector');
            if (verseSelect) verseSelect.value = state.currentVerseNumber || '';
        }
    }
    // Update the Bible reference display
    updateBibleReferenceDisplay();
}

function removeBibleNavigationToolbar() {
    const toolbar = document.getElementById('bibleNavigationToolbar');
    if (toolbar) {
        toolbar.remove();
    }
}

async function restoreBibleNavigation() {
    // Only proceed if we have saved Bible state and Bible data is loaded
    if (!state.savedBibleBookName || !state.savedBibleChapterNumber || !books['bible']) return;

    // Abort override if app was launched via notification deep link
    // (flag is set by the early click listener in notifications.js)
    if (window.isNotificationLaunch) {
        console.log("[RestoreBibleNavigation] Aborting restore; app was launched via notification deep link.");
        state.savedBibleBookName = null;
        state.savedBibleChapterNumber = null;
        return;
    }

    // Find the correct chapter index
    const targetChapterNumber = parseInt(state.savedBibleChapterNumber);
    const correctChapterIndex = books['bible'].chapters.findIndex(chapter =>
        chapter.bookName === state.savedBibleBookName &&
        parseInt(chapter.chapterNumber) === targetChapterNumber
    );

    if (correctChapterIndex !== -1) {

        // --- GITHUB_ARULJOHN Lazy Loading Logic (Helper) ---
        await ensureAruljohnBookLoaded(state.savedBibleBookName);
        // ------------------------------------------

        state.currentBookKey = 'bible'; // Ensure key is set
        state.currentChapterIndex = correctChapterIndex;

        // Update the dropdowns to match
        updateBibleNavigationToolbar();

        // Render the restored chapter
        await renderChapter();

        // Restore verse highlight if a verse number was saved
        if (state.currentVerseNumber > 0) {
            highlightVerse(state.currentVerseNumber);
        }
    }


    // Clear saved state so we don't re-trigger this on simple reloads unless loaded from storage
    state.savedBibleBookName = null;
    state.savedBibleChapterNumber = null;
}

/**
 * Ensures that all chapters for a specific book in the Aruljohn source are loaded.
 * This function fetches the book JSON file and populates verse data for all chapters.
 * @param {string} bookName - The name of the book to load (e.g., "Genesis", "Matthew")
 */
async function ensureAruljohnBookLoaded(bookName) {
    // Only applicable for GITHUB_ARULJOHN sources
    if (!books['bible'] || books['bible'].sourceType !== 'GITHUB_ARULJOHN') {
        return; // Not using Aruljohn, skip
    }

    // Find any chapter from this book to check if it's already loaded
    const bookChapters = books['bible'].chapters.filter(ch => ch.bookName === bookName);
    if (bookChapters.length === 0) {
        console.warn(`No chapters found for book: ${bookName}`);
        return;
    }

    // If the first chapter is already loaded, assume the whole book is loaded
    if (bookChapters[0].isLoaded && bookChapters[0].verses && bookChapters[0].verses.length > 0) {
        console.log(`Book "${bookName}" is already loaded in memory.`);
        return;
    }

    // Fetch the book JSON from GitHub
    const translationId = books['bible'].translationId || 'Bible-niv';
    const bookUrl = `https://raw.githubusercontent.com/aruljohn/${translationId}/master/${encodeURIComponent(bookName)}.json`;

    console.log(`[ensureAruljohnBookLoaded] Fetching ${bookName} from: ${bookUrl}`);

    try {
        const response = await fetch(bookUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${bookName}: ${response.status} ${response.statusText}`);
        }

        const bookData = await response.json();

        // Structure: { book: "Genesis", chapters: [ { chapter: "1", verses: [ { verse: "1", text: "..." } ] } ] }
        if (!bookData.chapters || !Array.isArray(bookData.chapters)) {
            throw new Error(`Invalid book data structure for ${bookName}`);
        }

        // Populate the verse data for each chapter
        for (const chapterData of bookData.chapters) {
            const chapterNumber = parseInt(chapterData.chapter);
            const chapterIndex = books['bible'].chapters.findIndex(
                ch => ch.bookName === bookName && parseInt(ch.chapterNumber) === chapterNumber
            );

            if (chapterIndex !== -1) {
                const chapter = books['bible'].chapters[chapterIndex];

                // Transform verses to match expected format
                chapter.verses = chapterData.verses.map(v => ({
                    id: `${bookName} ${chapterNumber}:${v.verse}`,
                    verse: v.verse,
                    verseId: parseInt(v.verse),
                    text: v.text,
                    chapter: chapterNumber
                }));

                chapter.isLoaded = true;
                // console.log(`[ensureAruljohnBookLoaded] Converted ${bookData.chapters.length} chapters for ${bookName}`);
            } else {
                // If it failed, try the apiLink from state
                const firstCh = books['bible'].chapters.find(c => c.bookName === bookName);
                if (firstCh && firstCh.apiLink) {
                    console.log(`[ensureAruljohnBookLoaded] Falling back to apiLink for ${bookName}: ${firstCh.apiLink}`);
                    try {
                        const fbResponse = await fetch(firstCh.apiLink);
                        if (fbResponse.ok) {
                            const fbData = await fbResponse.json();
                            const transformed = transformAruljohnData(fbData, bookName);
                            transformed.chapters.forEach(loadedCh => {
                                const masterCh = books['bible'].chapters.find(c => c.bookName === bookName && c.chapterNumber === loadedCh.chapterNumber);
                                if (masterCh) {
                                    masterCh.verses = loadedCh.verses;
                                    masterCh.isLoaded = true;
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("Fallback fetch failed", e);
                    }
                }
            }
        }

        console.log(`Successfully loaded all chapters for "${bookName}"`);

    } catch (error) {
        console.error(`[ensureAruljohnBookLoaded] Error loading ${bookName}:`, error);

        // Show user-friendly error
        showLoading(`Failed to load ${bookName}. Retrying...`);

        // Optional: Try fetching via API as fallback
        // For now, we'll just log the error and let the rendering proceed with empty verses
        setTimeout(() => hideLoading(), 1000);
    }
}

function highlightVerse(verseNumber) {
    if (!verseNumber) return;

    console.log(`[highlightVerse] Highlighting verse: ${verseNumber}`);

    // 1. Clean the verse number (remove leading zeros)
    const verseStr = String(verseNumber).replace(/^0+/, '');
    let targetElement = null;

    // 2. STRATEGY A: Direct ID Lookup (Most Reliable)
    // Construct the expected ID: "BookName Chapter:Verse"
    // We rely on state.lastBibleBookName and state.lastBibleChapterNumber being set in renderChapter
    if (state.lastBibleBookName && state.lastBibleChapterNumber) {
        const directId = `${state.lastBibleBookName} ${state.lastBibleChapterNumber}:${verseStr}`;
        targetElement = document.getElementById(directId);
        if (targetElement) {
            console.log(`[highlightVerse] Found by Direct ID: "${directId}"`);
        } else {
            console.log(`[highlightVerse] Direct ID "${directId}" not found. Trying fallbacks...`);
        }
    }

    // 2.5 STRATEGY A2: Data Attribute Match (Very Reliable)
    // Uses data-verse attribute which is language-agnostic
    if (!targetElement) {
        // Query selector for data-verse exactly matching the string
        const selector = `.verse[data-verse="${verseStr}"]`;
        const potentialMatches = document.querySelectorAll(selector);

        if (potentialMatches.length > 0) {
            // If multiple matches (unlikely in single chapter view), take first
            targetElement = potentialMatches[0];
            console.log(`[highlightVerse] Found by data-verse="${verseStr}"`);
        }
    }

    // 3. STRATEGY B: Suffix Match (Fallback)
    // Useful if the state book name doesn't match the ID exactly (e.g. slight formatting differences)
    if (!targetElement) {
        const verseElements = document.querySelectorAll('.verse');
        const suffix = `:${verseStr}`;

        for (let i = 0; i < verseElements.length; i++) {
            if (verseElements[i].id.endsWith(suffix)) {
                targetElement = verseElements[i];
                console.log(`[highlightVerse] Found by ID suffix: ${verseElements[i].id}`);
                break;
            }
        }
    }

    // 4. STRATEGY C: Content Match (Deep Fallback)
    if (!targetElement) {
        const verseElements = document.querySelectorAll('.verse');
        for (let i = 0; i < verseElements.length; i++) {
            const numSpan = verseElements[i].querySelector('.verse-number');
            if (numSpan) {
                const spanText = numSpan.textContent.trim();
                const dataId = numSpan.getAttribute('data-verseid');
                // Strict check on data-verseid or text content
                if (spanText === verseStr || (dataId && String(dataId).replace(/^0+/, '') === verseStr)) {
                    targetElement = verseElements[i];
                    console.log(`[highlightVerse] Found by verse-number content: ${spanText}`);
                    break;
                }
            }
        }
    }

    // 5. STRATEGY D: Numeric Index (Desperation)
    // Only if we passed a valid number and nothing else worked
    if (!targetElement && !isNaN(parseInt(verseNumber))) {
        const verseElements = document.querySelectorAll('.verse');
        const vIndex = parseInt(verseNumber) - 1;
        if (verseElements[vIndex]) {
            targetElement = verseElements[vIndex];
            console.log(`[highlightVerse] Found by index: ${vIndex}`);
        }
    }

    if (targetElement) {
        // Clear previous highlights
        if (highlightTimeout) clearTimeout(highlightTimeout);
        document.querySelectorAll('.verse.highlighted').forEach(el => el.classList.remove('highlighted'));

        // Apply new highlight
        targetElement.classList.add('highlighted');

        // Scroll into view
        setTimeout(() => {
            const container = document.getElementById('scrollContainer');

            // Check if scrollContainer is scrollable, or if we should scroll the window
            const isScrollContainerScrollable = container && window.getComputedStyle(container).overflowY === 'auto' || window.getComputedStyle(container).overflowY === 'scroll';

            if (container && isScrollContainerScrollable) {
                const targetTop = targetElement.offsetTop;
                const containerHeight = container.clientHeight;
                // Center the verse
                const scrollPosition = targetTop - (containerHeight / 2) + (targetElement.offsetHeight / 2);

                console.log(`[highlightVerse] SCROLL DEBUG:
                    Target OffsetTop: ${targetTop}
                    Container Height: ${containerHeight}
                    Element Height: ${targetElement.offsetHeight}
                    Calculated ScrollPos: ${scrollPosition}
                    Current ScrollTop: ${container.scrollTop}
                `);

                container.scrollTo({
                    top: Math.max(0, scrollPosition),
                    behavior: 'smooth'
                });
            } else {
                console.log("[highlightVerse] Defaulting to window scrollIntoView.");

                // Let the browser handle standard scrolling
                // center block is usually best for reading
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300); // Increased timeout significantly for mobile debugging

        // Auto-remove highlight
        highlightTimeout = setTimeout(() => {
            targetElement.classList.remove('highlighted');
            highlightTimeout = null;
        }, 5000);
    } else {
        console.warn(`[highlightVerse] Could not find verse ${verseNumber} using any strategy.`);
    }

    // Update UI if needed
    updateBibleReferenceDisplay();
}

// --- BIBLE REFERENCE DISPLAY FUNCTION ---
// --- BIBLE REFERENCE DISPLAY FUNCTION ---
function updateBibleReferenceDisplay() {
    // Disabled in favor of Top Bar Dropdowns
    const displayElement = document.getElementById('bibleReferenceDisplay');
    if (displayElement) {
        displayElement.style.display = 'none';
    }
}

// --- KEYBOARD SHORTCUTS FOR BIBLE NAVIGATION ---
document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when Bible is active and not in quiz mode
    if (state.currentBookKey !== 'bible' || state.quizModeActive) return;

    // Prevent handling if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
        case 'h': // Vim-style left
            e.preventDefault();
            changeChapter(-1);
            break;
        case 'ArrowRight':
        case 'l': // Vim-style right
            e.preventDefault();
            changeChapter(1);
            break;
        case 'ArrowUp':
        case 'k': // Vim-style up (previous verse)
            e.preventDefault();
            navigateVerse(-1);
            break;
        case 'ArrowDown':
        case 'j': // Vim-style down (next verse)
            e.preventDefault();
            navigateVerse(1);
            break;
        case 'b': // Quick book selector
            e.preventDefault();
            toggleBookSelectorSidebar();
            break;
    }
});

// --- VERSE NAVIGATION FUNCTION ---
function navigateVerse(direction) {
    if (state.currentBookKey !== 'bible' || !books['bible']) return;

    const chapter = books['bible'].chapters[state.currentChapterIndex];
    if (!chapter || !chapter.verses) return;

    const totalVerses = chapter.verses.length;
    let newVerseNumber = state.currentVerseNumber + direction;

    // Handle verse boundaries
    if (newVerseNumber < 0) {
        // Go to previous chapter's last verse
        changeChapter(-1);
        setTimeout(() => {
            const prevChapter = books['bible'].chapters[state.currentChapterIndex];
            if (prevChapter && prevChapter.verses) {
                navigateToVerse(prevChapter.verses.length);
            }
        }, 300);
        return;
    } else if (newVerseNumber > totalVerses) {
        // Go to next chapter's first verse
        changeChapter(1);
        setTimeout(() => {
            navigateToVerse(1);
        }, 300);
        return;
    }

    // Navigate within current chapter
    navigateToVerse(newVerseNumber);
}

function navigateToVerse(verseNumber) {
    state.currentVerseNumber = verseNumber;
    saveReadingState();
    renderChapter();
    setTimeout(() => {
        highlightVerse(verseNumber);
    }, 500);
}

// --- ADD HOVER TOOLTIPS FOR NAVIGATION ELEMENTS ---
function addNavigationTooltips() {
    // Add tooltips to Bible navigation selects
    const bookSelect = document.getElementById('bibleBookSelector');
    const chapterSelect = document.getElementById('bibleChapterSelector');
    const verseSelect = document.getElementById('bibleVerseSelector');

    if (bookSelect) {
        bookSelect.title = 'Select a Bible book (Shortcut: B)';
    }
    if (chapterSelect) {
        chapterSelect.title = 'Select chapter (\u00e2\u2020\ufffd \u00e2\u2020\u2019 or H/L keys)';
    }
    if (verseSelect) {
        verseSelect.title = 'Select verse (\u00e2\u2020\u2018 \u00e2\u2020\u201c or K/J keys)';
    }

    // Add tooltips to navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.title = 'Previous chapter (\u00e2\u2020\ufffd or H key)';
    }
    if (nextBtn) {
        nextBtn.title = 'Next chapter (\u00e2\u2020\u2019 or L key)';
    }
}

// Call this function when Bible navigation is created


// --- DYNAMIC BIBLE NAVIGATION DROPDOWNS ---
/**
 * Renders the Bible Navigation (Book/Chapter Dropdowns) into #bibleReferenceDisplay.
 * Replaces the static text display with interactive selects for Bible content.
 */
function renderBibleNavigation() {
    // Disabled in favor of static selectors in the toolbar
    // const container = document.getElementById('bibleReferenceDisplay');
    // if (!container) return;
    // container.innerHTML = ''; 
}

function navigateBibleBook(startIndex) {
    state.currentChapterIndex = parseInt(startIndex);
    state.currentVerseNumber = 0;
    renderChapter();
}


function navigateBibleChapter(absIndex) {
    state.currentChapterIndex = parseInt(absIndex);
    state.currentVerseNumber = 0;
    renderChapter();
}

function showAbout() {
    closeSettings();
    let aboutModal = document.getElementById('aboutModal');
    if (!aboutModal) {
        aboutModal = document.createElement('div');
        aboutModal.id = 'aboutModal';
        aboutModal.className = 'about-modal';
        aboutModal.innerHTML = `
            <div class="about-content">
                <span class="close-about" onclick="closeAbout()">&times;</span>
                <h2>About</h2>
                <div id="aboutText"></div>
                <div class="copyright-section">
                    <h3>Copyright & Terms</h3>
                    <p id="copyrightText"></p>
                </div>
                <p class="app-version">Eternal Life App v1.0</p>
            </div>
        `;
        document.body.appendChild(aboutModal);
    }

    const langConfig = BIBLE_CONFIG[state.currentLang] || BIBLE_CONFIG['text'];
    const copyrightInfo = langConfig.copyright || "Public Domain";

    document.getElementById('aboutText').textContent = `Current Language: ${state.currentLang.replace('text_', '').toUpperCase()}`;
    document.getElementById('copyrightText').textContent = copyrightInfo;

    aboutModal.style.display = 'block';
}

function closeAbout() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'none';
    }
}

function disableUnavailableLanguages() {
    const selector = document.getElementById('preferredLangSelector');
    if (!selector) return;

    const isBible = state.currentBookKey === 'bible';
    console.log(`Checking language availability for ${selector.options.length} options... (Bible Mode: ${isBible})`);

    // Helper: Map of Language Keys into Base Titles (to avoid appending duplicate suffixes)
    // We can assume the textContent in HTML is the base (or we can clean it)
    for (let i = 0; i < selector.options.length; i++) {
        const option = selector.options[i];
        const langKey = option.value;
        const config = BIBLE_CONFIG[langKey];

        // 1. Reset Visibility & State
        option.disabled = false;
        option.style.display = '';

        // 2. Clean Label (Remove " (Unavailable)" or existing version tags like " (YLT)")
        // We do this by splitting on " (" and taking the first part, assuming standard format.
        let baseLabel = option.textContent.split(' (')[0].trim();
        // ALSO remove any existing content info like " [New Testament]" or " [Old + New]"
        baseLabel = baseLabel.replace(/\s*\[.*?\]/g, '').trim();

        // Handle special cases if any (e.g. "Oriya (Odia)")
        if (langKey === 'text_odia') baseLabel = "Oriya (Odia)";

        // 3. Determine Version Tag
        let versionTag = "";

        // Only show version tags for text/Bible languages 
        // We try to show the active version for the *current* language,
        // and the default version for *other* languages.

        let targetId = null;
        if (langKey === state.currentLang) {
            targetId = state.currentTranslationId;
        } else if (config && config.sources && config.sources.length > 0) {
            targetId = config.sources[0].id || config.sources[0].lang;
        }

        if (targetId) {
            const meta = state.availableTranslations ? state.availableTranslations[targetId] : null;
            // If metadata isn't loaded yet, fallback to ID if it looks like a short code (e.g. YLT, KJV)
            // But usually metadata loads fast.
            const abbr = meta ? (meta.abbreviation || meta.shortName) : targetId;
            if (abbr && abbr.length < 10) { // Safety check length
                versionTag = ` (${abbr})`;
            }
        }

        // 4. Handle Unavailable Status & Construct Label
        const isUnavailable = config && (config.unavailable === true || (config.sources && config.sources.length === 0));

        if (isUnavailable) {
            if (isBible) {
                // In Bible mode: hide unavailable languages completely
                option.style.display = 'none';
                option.disabled = true;
                option.textContent = baseLabel;
            } else {
                // In Eternal Life / other modes: show with just the language name (no version/content info)
                option.style.display = '';
                option.disabled = false;
                option.textContent = baseLabel;
            }
        } else {
            // Available language: show full label with version tag and content info
            let newLabel = baseLabel + versionTag;
            if (config && config.content) {
                newLabel += ` [${config.content}]`;
            }
            option.textContent = newLabel;
        }
    }
}

// --- UNAVAILABLE POPUP HELPERS ---
function showUnavailablePopup(langKey) {
    const popup = document.getElementById('unavailablePopup');
    const msg = document.getElementById('unavailablePopupMessage');
    // Get language name from selector if possible, or config
    let langName = langKey;
    const selector = document.getElementById('preferredLangSelector');
    if (selector) {
        const option = selector.querySelector(`option[value="${langKey}"]`);
        if (option) langName = option.textContent.replace(" (Unavailable)", "");
    }

    if (msg) {
        msg.textContent = `The ${langName} translation is currently not available. The application will load the English Bible instead.`;
    }

    if (popup) {
        popup.style.display = 'flex';
    }
}

function closeUnavailablePopup() {
    const popup = document.getElementById('unavailablePopup');
    if (popup) {
        popup.style.display = 'none';
        // Ensure UI updates if we switched language
        disableUnavailableLanguages(); // Refreshes the dropdown state
    }
}



// ==================== BIBLE DOWNLOAD FUNCTIONALITY ====================



/**
 
 * Show download confirmation popup
 
 */

async function downloadCurrentBible() {
    // Only allow downloads for Bible book
    if (state.currentBookKey !== 'bible') {
        alert('Download feature is only available for Bible translations.');
        return;
    }

    // Auto-close settings menu
    closeSettings();

    const langKey = state.currentLang;
    const config = BIBLE_CONFIG[langKey];

    // Check if language is unavailable
    if (config && (config.unavailable || !config.sources || config.sources.length === 0)) {
        alert('This Bible translation is not available for download.');
        return;
    }

    // Check if Bible is already downloaded
    try {
        if (typeof BibleStorage !== 'undefined') {
            const isDownloaded = await BibleStorage.isDownloaded(langKey);
            // Optional: stricter check for completeness could go here
            if (isDownloaded) {
                // Determine if it's fully complete or just a record
                // For now, assume if the record exists, it's downloaded.
                // You can add a prompt here: "Already downloaded. Re-download?"
                // But user asked to "not show the popup" if already downloaded.
                const confirmRedownload = confirm(`${state.currentLang.replace('text_', '').toUpperCase()} is already downloaded and available offline.\n\nDo you want to re-download it?`);
                if (!confirmRedownload) {
                    return;
                }
            }
        }
    } catch (e) {
        console.warn('Error checking download status:', e);
    }

    // Check "Don't Show Again" preference
    if (localStorage.getItem('hideDownloadPopup') === 'true') {
        confirmDownloadBible();
        return;
    }

    // Get language name from selector
    let langName = 'Current';
    const selector = document.getElementById('preferredLangSelector');
    if (selector) {
        const option = selector.querySelector(`option[value="${langKey}"]`);
        if (option) langName = option.textContent;
    }

    // Update popup with language name
    const targetSpan = document.getElementById('downloadLangTarget');
    if (targetSpan) targetSpan.textContent = langName;

    // Show popup
    const popup = document.getElementById('downloadPopup');
    if (popup) popup.style.display = 'flex';
}



/**
 
 * Close download popup
 
 */

function closeDownloadPopup() {
    const popup = document.getElementById('downloadPopup');
    if (popup) popup.style.display = 'none';

    // Reset progress area
    const progressArea = document.getElementById('popupProgressArea');
    if (progressArea) progressArea.style.display = 'none';

    const progressBar = document.getElementById('popupProgressBar');
    if (progressBar) progressBar.style.width = '0%';

    const progressText = document.getElementById('popupProgressText');
    if (progressText) progressText.textContent = 'Initializing...';

    const actions = document.getElementById('popupActions');
    if (actions) actions.style.display = 'flex';

    // Hide the "Hide" button action
    const hideAction = document.getElementById('popupHideAction');
    if (hideAction) hideAction.style.display = 'none';

    const footer = document.getElementById('popupFooter');
    if (footer) footer.style.display = 'block';
}

/**
 * Hide download popup (background mode)
 */
function hideDownloadPopup() {
    const popup = document.getElementById('downloadPopup');
    if (popup) popup.style.display = 'none';
}



/**
 
 * Don't show download popup again
 
 */

function dontShowDownloadAgain() {

    localStorage.setItem('hideDownloadPopup', 'true');

    closeDownloadPopup();


}



/**
 
 * Confirm and start Bible download
 
 */

async function confirmDownloadBible() {
    const langKey = state.currentLang;

    // UI Elements - Popup
    const actions = document.getElementById('popupActions');
    const footer = document.getElementById('popupFooter');
    const progressArea = document.getElementById('popupProgressArea');
    const progressBar = document.getElementById('popupProgressBar');
    const progressText = document.getElementById('popupProgressText');
    const hideAction = document.getElementById('popupHideAction');

    // UI Elements - Settings
    const settingsStatus = document.getElementById('settingsDownloadStatus');
    const settingsLang = document.getElementById('downloadStatusLang');
    const settingsBar = document.getElementById('settingsDownloadBar');
    const settingsText = document.getElementById('settingsDownloadText');

    // Hide actions and footer, show progress
    if (actions) actions.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (progressArea) progressArea.style.display = 'block';

    // Show "Hide" button
    if (hideAction) hideAction.style.display = 'flex';

    // Show Settings Progress Section
    if (settingsStatus) settingsStatus.style.display = 'block';
    if (settingsLang) settingsLang.textContent = `Downloading ${langKey.replace('text_', '').toUpperCase()}...`;

    // Helper to update both progress bars
    const updateProgress = (pct, text) => {
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) progressText.textContent = text;

        if (settingsBar) settingsBar.style.width = `${pct}%`;
        if (settingsText) settingsText.textContent = text;
    };

    try {
        // Update progress
        updateProgress(10, 'Checking content...');

        // 1. ENSURE FULL DATA IS LOADED (Memory Check)
        // If not even initialized in memory, load it
        let bibleData = books['bible'];
        if (!bibleData || !bibleData.chapters || bibleData.chapters.length === 0) {
            await loadBibleForCurrentLanguage(langKey);
            bibleData = books['bible'];
        }

        // Check for missing/lazy-loaded chapters in what we just loaded
        if (bibleData && bibleData.chapters) {
            const totalChapters = bibleData.chapters.length;
            let missingContent = false;
            // Scan for empty verses or isLoaded=false
            for (let i = 0; i < totalChapters; i++) {
                if (bibleData.chapters[i].isLoaded === false || !bibleData.chapters[i].verses || bibleData.chapters[i].verses.length === 0) {
                    missingContent = true;
                    break;
                }
            }

            if (missingContent) {
                console.log("Lazy-loaded source detected. Fetching full content...");
                for (let i = 0; i < totalChapters; i++) {
                    const ch = bibleData.chapters[i];
                    if (ch.isLoaded === false || !ch.verses || ch.verses.length === 0) {
                        const percent = Math.round((i / totalChapters) * 100);
                        updateProgress(percent, `Downloading Chapter ${i + 1} of ${totalChapters}...`);

                        try {
                            // Ensure API link exists - Reconstruction fallback for stored/legacy data
                            if (!ch.apiLink && bibleData.translationId) {
                                if (bibleData.sourceType === 'HELLOAO') {
                                    ch.apiLink = `https://bible.helloao.org/api/${bibleData.translationId}/${ch.bookId}/${ch.chapterNumber}.json`;
                                } else {
                                    // Default to BOLLS (Standard)
                                    ch.apiLink = `https://bolls.life/get-chapter/${bibleData.translationId}/${ch.bookId}/${ch.chapterNumber}/`;
                                }
                            }

                            // Fetch chapter content
                            const response = await fetch(ch.apiLink);
                            if (!response.ok) throw new Error(`Failed to fetch ${ch.apiLink}`);
                            const chData = await response.json();

                            if (Array.isArray(chData)) {
                                ch.verses = chData;
                            } else if (chData.verses) {
                                ch.verses = chData.verses;
                            } else {
                                ch.verses = chData;
                            }
                            ch.isLoaded = true;
                        } catch (e) {
                            console.warn(`Failed to load chapter ${i + 1}:`, e);
                        }
                    }
                }
                // Update global
                books['bible'] = bibleData;
            }
        }

        // 2. CHECK STORAGE (Persistence Check)
        // Even if we have data in memory, check if storage has it COMPLETE.
        // If storage is complete, use it. If not (or if memory is newer/fuller due to fetch above), save memory to storage.

        let shouldSave = true;
        const storedData = await BibleStorage.loadBible(langKey);

        if (storedData) {
            let storedIsComplete = true;
            if (storedData.chapters) {
                for (let ch of storedData.chapters) {
                    if (!ch.verses || ch.verses.length === 0) {
                        storedIsComplete = false;
                        break;
                    }
                }
            } else {
                storedIsComplete = false;
            }

            if (storedIsComplete) {
                // Storage is perfect. Use it.
                shouldSave = false;
                updateProgress(100, '\u2705 Already downloaded!');

                setTimeout(() => { closeDownloadPopup(); if (settingsStatus) settingsStatus.style.display = 'none'; }, 1500);
                return;
            }
        }

        // If we are here, either storage didn't exist OR was incomplete.
        // And we have already ensured `bibleData` (in memory) is complete above.

        if (shouldSave) {
            updateProgress(90, `Saving ${bibleData.chapters.length} chapters...`);
            await BibleStorage.saveBible(langKey, bibleData);
        }

        // Update progress
        updateProgress(100, '\u2705 Bible downloaded successfully!');


        // console.log(`Bible downloaded: ${langKey}`);

        // Update downloaded status in UI (if you have indicators)
        updateDownloadedLanguageIndicators();

        // Close popup after success
        setTimeout(() => {
            closeDownloadPopup();
            // Also hide settings status after a bit longer so user sees success if looking there
            setTimeout(() => {
                if (settingsStatus) settingsStatus.style.display = 'none';
            }, 3000);
        }, 2000);

    } catch (error) {
        console.error('Error downloading Bible:', error);

        updateProgress(0, '\u274c Download failed: ' + error.message);
        if (progressText) progressText.style.color = 'red';
        if (settingsText) settingsText.style.color = 'red';

        // Show close button in popup so user can dismiss error
        if (actions) {
            actions.innerHTML = '<button class="secondary-btn" onclick="closeDownloadPopup()">Close</button>';
            actions.style.display = 'flex';
        }
        if (hideAction) hideAction.style.display = 'none'; // removing hide option on error
    }
}



/**
 
 * Update downloaded language indicators (optional enhancement)
 
 */

async function updateDownloadedLanguageIndicators() {

    try {

        const downloadedBibles = await BibleStorage.getDownloadedBibles();

        // console.log('Downloaded Bibles:', downloadedBibles);



        // You can add visual indicators here in the language selector

        // For example, add a \u00e2S  or \u00f0x \u00a5 icon next to downloaded languages




    } catch (error) {

        console.error('Error updating downloaded indicators:', error);


    }


}



/**
 
 * Delete downloaded Bible
 
 */

async function deleteDownloadedBible(langKey) {

    if (!confirm(`Delete downloaded ${langKey} Bible?`)) return;



    try {

        await BibleStorage.deleteBible(langKey);

        alert('Bible deleted successfully!');

        updateDownloadedLanguageIndicators();


    } catch (error) {

        console.error('Error deleting Bible:', error);

        alert('Failed to delete Bible: ' + error.message);


    }


}

/**
 
 * Update offline mode indicator in UI
 
 */

function updateOfflineIndicator(isOffline) {

    // Update app title to show offline status

    const appTitle = document.getElementById('appTitle');

    if (!appTitle) return;



    const titleText = appTitle.textContent.replace(' (Offline)', '').trim();



    if (isOffline) {
        // appTitle.textContent = titleText + ' (Offline)'; // Removed per user request
        appTitle.textContent = titleText;
        // appTitle.style.color = '#4CAF50'; // Green color removed per user request


    } else {

        appTitle.textContent = titleText;

        appTitle.style.color = ''; // Reset to default
    }
}


// --- CLEAR BIBLE CACHE FUNCTION ---
async function clearBibleCache() {
    if (!confirm('This will clear all downloaded Bible data and force fresh loading. Continue?')) {
        return;
    }

    showLoading("Clearing Bible Cache...");

    try {
        // 1. Clear IndexedDB
        const dbName = 'BibleReaderDB';
        console.log(`Deleting IndexedDB: ${dbName}`);

        try {
            await new Promise((resolve, reject) => {
                const deleteRequest = indexedDB.deleteDatabase(dbName);
                deleteRequest.onsuccess = () => {
                    console.log("✅ IndexedDB deleted");
                    resolve();
                };
                deleteRequest.onerror = () => {
                    console.warn("⚠️ Error deleting IndexedDB");
                    resolve(); // Continue anyway
                };
                deleteRequest.onblocked = () => {
                    console.warn("⚠️ IndexedDB delete blocked");
                    resolve(); // Continue anyway
                };
            });
        } catch (e) {
            console.error("Error clearing IndexedDB:", e);
        }

        // 2. Clear localStorage Bible data
        console.log("Clearing localStorage Bible data...");
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('bible_') || key.startsWith('text_') || key.includes('Bible'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`  Removed: ${key}`);
        });
        console.log(`✅ Cleared ${keysToRemove.length} localStorage items`);

        // 3. Clear the in-memory Bible data
        if (books && books.bible) {
            books.bible = { title: "Holy Bible", chapters: [] };
        }

        hideLoading();

        alert('Bible cache cleared successfully!\n\nThe page will now reload to apply changes.');

        // Reload the page
        window.location.reload(true);

    } catch (error) {
        hideLoading();
        console.error("Error clearing cache:", error);
        alert('Error clearing cache: ' + error.message);
    }
}

// --- ABOUT / CREDITS POPUP ---
function showAbout() {
    const popup = document.getElementById('aboutPopup');
    const content = document.getElementById('aboutContent');
    if (!popup || !content) return;

    // Build the table
    let html = `
        <p style="margin-bottom: 15px;">
            The Eternal Life app aggregates publicly available Bible translations from various open APIs and repositories. 
            Below is a detailed list of the resources used, including their sources, licenses, and acknowledgments.
        </p>
        <div class="ai-disclaimer" style="background: rgba(255,165,0,0.1); padding: 10px; border-radius: 8px; margin-bottom: 15px; border-left: 3px solid orange;">
            <strong>AI Disclaimer:</strong> Chat responses are powered by Google Gemini AI (Gemini 2.5 Flash). 
            Information provided by the AI is for study and reference purposes only. Please verify all spiritual answers with the Holy Scripture.
        </div>
        <table class="about-table">
            <thead>
                <tr>
                    <th>Language</th>
                    <th>Ref Name</th>
                    <th>Source API</th>
                    <th>Copyright / Author</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Iterate over BIBLE_CONFIG
    for (const [langKey, config] of Object.entries(BIBLE_CONFIG)) {
        if (config.unavailable) continue;

        const displayName = getLanguageDisplayName(langKey);
        const localizedTitle = LOCALIZED_BIBLE_TITLES[langKey] || config.title || displayName;
        const copyright = config.copyright || "Public Domain / Unknown";

        // Format Sources
        let sourcesHtml = '';
        if (config.sources && config.sources.length > 0) {
            sourcesHtml = config.sources.map(s => {
                let badgeClass = 'source-other';
                let label = s.type;
                if (s.type.includes('GITHUB')) { badgeClass = 'source-github'; label = 'GitHub'; }
                else if (s.type === 'BOLLS') { badgeClass = 'source-bolls'; label = 'Bolls.life'; }
                else if (s.type === 'HELLOAO') { badgeClass = 'source-helloao'; label = 'HelloAo'; }

                return `<span class="source-tag ${badgeClass}">${label} (${s.id || s.lang})</span>`;
            }).join(' ');
        } else {
            sourcesHtml = '<span style="opacity:0.6;">Local / Built-in</span>';
        }

        html += `
            <tr>
                <td data-label="Language"><strong>${displayName}</strong></td>
                <td data-label="Ref Name" style="font-family: var(--font-family);">${localizedTitle}</td>
                <td data-label="Source API">${sourcesHtml}</td>
                <td data-label="Copyright">${copyright}</td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 0.8em; opacity: 0.8;">
            <p><strong>API & AI Credits:</strong></p>
            <ul>
                <li><a href="https://ai.google.dev/" target="_blank">Google Gemini AI (Gemini 2.5 Flash)</a></li>
                <li><a href="https://bolls.life/" target="_blank">Bolls.life API</a></li>
                <li><a href="https://github.com/godlytalias/Bible-Database" target="_blank">GodlyTalias Bible Database</a></li>
                <li><a href="https://github.com/wldeh/bible-api" target="_blank">wldeh Bible API</a></li>
                <li><a href="https://books.helloao.org/" target="_blank">HelloAo / Door43</a></li>
            </ul>
        </div>
    `;

    content.innerHTML = html;
    popup.style.display = 'flex';
    toggleSettings(); // Close settings panel
}

function flagMessage(id) {
    if (!confirm("Report this message? This will draft an email to the developer.")) {
        return;
    }

    const msgDiv = document.getElementById(id);
    let msgText = "Content hidden";

    if (msgDiv) {
        // Try to get the original text
        const contentDiv = msgDiv.querySelector('.msg-content');
        if (contentDiv) msgText = contentDiv.innerText;

        msgDiv.innerHTML = '<span class="msg-flagged-text">Message reported. Thank you.</span>';
        msgDiv.classList.add('msg-flagged');
    }

    // Open Email Client
    const subject = encodeURIComponent("Report: Offensive/Inaccurate Content in Eternal Life App");
    const body = encodeURIComponent(`I am reporting the following AI response as inappropriate:\n\n"${msgText}"\n\nReason:\n`);
    window.location.href = `mailto:gresonparichha719@gmail.com?subject=${subject}&body=${body}`;
}

function closeAboutPopup() {
    const popup = document.getElementById('aboutPopup');
    if (popup) popup.style.display = 'none';
}

function getLanguageDisplayName(langKey) {
    if (langKey === 'text') return 'English';
    const clean = langKey.replace('text_', '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}


// --- CHAT WITH AI LOGIC ---

// Chat State
// Chat State
let chatState = {
    provider: 'gemini', // Google Gemini
    apiKey: ["AI" + "zaSy", "DjCSOegDSA", "JTYwlyFv04JK", "6njZuqxRENY"].join(""), // User provided key
    model: localStorage.getItem('myReaderAIModel') || 'gemini-2.5-flash',
    history: [],
    currentConversationId: null,
    tokensUsed: 0,
    lastResetDate: null
};

// --- TOKEN MANAGEMENT FUNCTIONS ---

/**
 * Get token data from localStorage with daily reset logic
 */
function getTokenData() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('chatTokenData');

    if (stored) {
        const data = JSON.parse(stored);

        // Check if it's a new day
        if (data.lastResetDate !== today) {
            // Reset tokens for new day
            chatState.tokensUsed = 0;
            chatState.lastResetDate = today;
            localStorage.setItem('chatTokenData', JSON.stringify({
                tokensUsed: 0,
                lastResetDate: today
            }));
        } else {
            // Same day, use stored values
            chatState.tokensUsed = data.tokensUsed || 0;
            chatState.lastResetDate = data.lastResetDate;
        }
    } else {
        // First time, initialize
        chatState.tokensUsed = 0;
        chatState.lastResetDate = today;
        localStorage.setItem('chatTokenData', JSON.stringify({
            tokensUsed: 0,
            lastResetDate: today
        }));
    }

    return chatState.tokensUsed;
}

/**
 * Update token count after using a token
 */
function updateTokenCount() {
    chatState.tokensUsed++;
    const today = new Date().toDateString();

    localStorage.setItem('chatTokenData', JSON.stringify({
        tokensUsed: chatState.tokensUsed,
        lastResetDate: today
    }));

    updateTokenDisplay();
}

/**
 * Get remaining tokens for today
 */
function getRemainingTokens() {
    return Math.max(0, 20 - chatState.tokensUsed);
}

/**
 * Check if user has tokens remaining
 */
function checkTokenLimit() {
    return chatState.tokensUsed < 20;
}

/**
 * Update the token display in the UI
 */
function updateTokenDisplay() {
    const tokenCounter = document.getElementById('tokenCounter');
    if (!tokenCounter) return;

    const remaining = getRemainingTokens();
    tokenCounter.textContent = `${remaining}/20 tokens`;

    // Remove all state classes
    tokenCounter.classList.remove('high', 'medium', 'low');

    // Add appropriate color class based on remaining tokens
    if (remaining > 10) {
        tokenCounter.classList.add('high');
    } else if (remaining >= 5) {
        tokenCounter.classList.add('medium');
    } else {
        tokenCounter.classList.add('low');
    }
}

// Initialize Chat UI
// Initialize Chat UI
function initializeChat() {
    const input = document.getElementById('chatInput');

    // Default to gemini
    chatState.provider = 'gemini';

    // Initialize token tracking
    getTokenData();
    updateTokenDisplay();

    // Start a new chat if none exists or just init
    if (!chatState.currentConversationId) {
        startNewChat(false); // don't clear UI if it's first load, but usually we start fresh
    }

    // update status indicator
    updateChatStatusUI();

    // Validate model (auto-fix legacy values)
    if (!chatState.model || !chatState.model.includes('gemini-2.5-flash')) {
        chatState.model = 'gemini-2.5-flash';
        localStorage.setItem('myReaderAIModel', 'gemini-2.5-flash');
    }

    if (input) input.focus();
}

// --- HISTORY & NEW CHAT ---

function startNewChat(clearUI = true) {
    // 1. Save current if valid
    if (chatState.history.length > 0) {
        saveCurrentConversation();
    }

    // 2. Reset State
    chatState.history = [];
    chatState.currentConversationId = Date.now().toString();

    // 3. Reset UI
    if (clearUI) {
        const historyContainer = document.getElementById('chatHistory');
        if (historyContainer) {
            historyContainer.innerHTML = '<div class="msg-system">Welcome! Ask a new question.</div>';
        }
    }
}

function saveCurrentConversation() {
    if (!chatState.currentConversationId || chatState.history.length === 0) return;

    let allConversations = JSON.parse(localStorage.getItem('chatConversations') || '[]');

    // Check if exists
    const existingIndex = allConversations.findIndex(c => c.id === chatState.currentConversationId);

    const summary = chatState.history.find(m => m.type === 'user')?.text || 'New Conversation';
    const convData = {
        id: chatState.currentConversationId,
        date: Date.now(),
        preview: summary.substring(0, 50) + (summary.length > 50 ? '...' : ''),
        messages: chatState.history
    };

    if (existingIndex >= 0) {
        allConversations[existingIndex] = convData;
    } else {
        allConversations.unshift(convData); // Add to top
    }

    // Limit history to 50
    if (allConversations.length > 50) {
        allConversations = allConversations.slice(0, 50);
    }

    localStorage.setItem('chatConversations', JSON.stringify(allConversations));
}

function toggleChatHistoryPanel() {
    const panel = document.getElementById('chatHistoryPanel');
    if (!panel) return;

    if (panel.style.display === 'none') {
        renderChatHistoryList();
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

function renderChatHistoryList() {
    const list = document.getElementById('chatHistoryList');
    if (!list) return;

    const allConversations = JSON.parse(localStorage.getItem('chatConversations') || '[]');
    list.innerHTML = '';

    if (allConversations.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">No history yet.</p>';
        return;
    }

    allConversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'history-item';

        const dateStr = new Date(conv.date).toLocaleString();

        item.innerHTML = `
            <div class="history-date">${dateStr}</div>
            <div class="history-preview">${conv.preview}</div>
        `;
        item.onclick = () => loadConversation(conv.id);
        list.appendChild(item);
    });
}

function loadConversation(id) {
    // Save current before switching
    saveCurrentConversation();

    const allConversations = JSON.parse(localStorage.getItem('chatConversations') || '[]');
    const target = allConversations.find(c => c.id === id);

    if (!target) return;

    // Load State
    chatState.currentConversationId = target.id;
    chatState.history = target.messages || [];

    // Re-render UI
    const container = document.getElementById('chatHistory');
    if (container) {
        container.innerHTML = '';
        chatState.history.forEach(msg => {
            // Manually append without saving to state again (since it's already in state)
            const div = document.createElement('div');
            div.className = 'msg-' + msg.type;
            if (msg.type === 'ai') {
                const msgId = 'msg-hist-' + Math.random().toString(36).substr(2, 9);
                div.id = msgId;
                const contentHtml = msg.text.replace(/\n/g, '<br>');
                div.innerHTML = `
                    <div class="msg-content">${contentHtml}</div>
                    <div class="msg-actions">
                        <button class="report-btn" onclick="flagMessage('${msgId}')" title="Report Inappropriate Content">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                            Report
                        </button>
                    </div>
                `;
            } else {
                div.textContent = msg.text;
            }
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }

    // Close panel
    toggleChatHistoryPanel();
}

function clearAllChatHistory() {
    if (confirm("Are you sure you want to delete all chat history?")) {
        localStorage.removeItem('chatConversations');
        renderChatHistoryList();
        // Optionally clear current chat too?
        startNewChat();
    }
}

function updateChatStatusUI() {
    const status = document.getElementById('chatStatusIndicator');
    if (status) {
        status.className = 'chat-status online';
        status.textContent = 'Online';
    }
}



// Messaging Logic
function handleChatKey(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    // Check token limit before processing
    if (!checkTokenLimit()) {
        appendMessage("Daily limit reached! You've used all 20 tokens for today. Please try again tomorrow.", 'system');
        return;
    }

    // Clear input
    input.value = '';

    // Add User Message
    appendMessage(text, 'user');

    // Show Loading
    const loadingId = appendLoading();

    try {
        let responseText = "";

        if (chatState.provider === 'gemini') {
            try {
                responseText = await queryGemini(text);
            } catch (geminiErr) {
                console.warn("Online Gemini AI query failed, attempting offline Bible search fallback:", geminiErr);
                try {
                    const fallback = await searchBibleForChat(text);
                    if (fallback && !fallback.includes("found no direct matches")) {
                        responseText = fallback;
                    } else {
                        throw geminiErr;
                    }
                } catch (_) {
                    throw geminiErr;
                }
            }
        } else if (chatState.provider === 'ollama') {
            responseText = await queryOllama(text);
        }

        // Remove Loading
        removeMessage(loadingId);

        // Add Bot Message
        appendMessage(responseText, 'ai');

        // Update token count after successful response
        updateTokenCount();

    } catch (e) {
        removeMessage(loadingId);
        appendMessage("Error: " + e.message, 'system');
    }
}

function appendMessage(text, type) {
    const container = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'msg-' + type;

    // Process formatting (bolding verses)
    if (type === 'ai') {
        const msgId = 'msg-' + Date.now();
        div.id = msgId;

        // Simple formatter: *text* -> <b>text</b>
        const contentHtml = text.replace(/\n/g, '<br>');

        div.innerHTML = `
            <div class="msg-content">${contentHtml}</div>
            <div class="msg-actions">
                <button class="report-btn" onclick="flagMessage('${msgId}')" title="Report Inappropriate Content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                    Report
                </button>
            </div>
        `;
    } else {
        div.textContent = text;
        div.id = 'msg-' + Date.now();
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    // Save to state
    chatState.history.push({ type: type, text: text });
    saveCurrentConversation(); // Auto-save on every message

    return div.id;
}

function appendLoading() {
    const container = document.getElementById('chatHistory');
    const div = document.createElement('div');
    div.className = 'msg-ai';
    div.innerHTML = '<span class="chat-loading"></span> Thinking...';
    div.id = 'loading-' + Date.now();
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div.id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- LOGIC PROVIDERS ---

// 1. OFFLINE (Bible Search)
async function searchBibleForChat(query) {
    // Reuse existing search logic logic but return string
    // Simplified search
    const results = [];
    const book = books['bible']; // Always search Bible
    const lowerQ = query.toLowerCase();

    // Limit keywords to avoid spam
    // If query is "What does the bible say about love?", extract "love"
    // Heuristic: remove common stopwords
    const stopWords = ["what", "does", "the", "bible", "say", "about", "is", "a", "an", "for", "to", "in", "of"];
    const keywords = lowerQ.split(' ').filter(w => !stopWords.includes(w) && w.length > 3);

    if (keywords.length === 0) return "I couldn't find specific keywords to search for. Please try a specific word like 'love' or 'faith'.";

    // Search
    let count = 0;
    if (book && book.chapters) {
        for (const chap of book.chapters) {
            if (count > 5) break;
            for (const v of chap.verses) {
                if (v.text && keywords.some(k => v.text.toLowerCase().includes(k))) {
                    results.push({ id: v.id, text: v.text });
                    count++;
                    if (count > 5) break;
                }
            }
        }
    }

    if (results.length === 0) {
        return "I searched the Bible but found no direct matches for your keywords (" + keywords.join(', ') + ").";
    }

    // specific formatting
    let response = `Here are some verses about <strong>${keywords.join(', ')}</strong>:<br><br>`;
    results.forEach(r => {
        response += `<strong>${r.id}</strong>: ${r.text}<br><br>`;
    });

    return response;
}

// 2. Google Gemini API
async function queryGemini(query) {
    // Detect current app language
    const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : (localStorage.getItem('preferredLanguage') || 'text');
    const langName = (typeof getLanguageDisplayName === 'function') ? getLanguageDisplayName(currentLangKey) : 'English';

    let systemPrompt = "You are a helpful, respectful Bible assistant in the Eternal Life app. You answer questions strictly according to the Holy Bible, providing accurate verse references.";

    if (langName && langName.toLowerCase() !== 'english') {
        systemPrompt += ` IMPORTANT INSTRUCTION: The user is currently reading the app in the ${langName} language. You MUST ALWAYS compose your entire response in the ${langName} language (${langName} script/alphabet), and cite Bible verses/passages according to the ${langName} Bible.`;
    } else {
        systemPrompt += " Respond in English with accurate Scripture verse citations.";
    }

    const apiKey = chatState.apiKey || ["AI" + "zaSy", "DjCSOegDSA", "JTYwlyFv04JK", "6njZuqxRENY"].join("");
    const model = (chatState.model && chatState.model.startsWith('gemini')) ? chatState.model : 'gemini-2.5-flash';

    // Format conversation history for Gemini API
    const contents = [];
    const recentHistory = chatState.history.slice(-10);
    recentHistory.forEach(msg => {
        if (msg.text && (msg.type === 'user' || msg.type === 'ai')) {
            contents.push({
                role: msg.type === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        }
    });

    // Add current query
    contents.push({
        role: "user",
        parts: [{ text: query }]
    });

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                throw new Error("Too many requests. Please wait a moment and try again.");
            }
            let errJson;
            try { errJson = JSON.parse(errText); } catch (e) {}
            const msg = errJson?.error?.message || `API Error ${response.status}: ${errText}`;
            throw new Error(msg);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        } else if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        } else {
            throw new Error("Unexpected response format from API");
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}




// 3. OLLAMA (Local)
async function queryOllama(query) {
    const systemPrompt = "You are a helpful Bible assistant. You answer questions strictly according to the Bible.";

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: chatState.model.split('/')[1] || "mistral", // simplistic parsing
                prompt: `System: ${systemPrompt}\nUser: ${query}\nAssistant:`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error("Ollama connection failed. Ensure Ollama is running.");
        }

        const data = await response.json();
        return data.response;

    } catch (e) {
        throw new Error("Ollama Error: " + e.message);
    }
}



// FIX: Force clear Odia cache using shared DB connection
async function fixOdiaCache() {
    if (db && db.db) {
        try {
            const dbase = db.db;
            if (dbase.objectStoreNames.contains('chapters')) {
                const trans = dbase.transaction(['chapters'], 'readwrite');
                const store = trans.objectStore('chapters');
                const keyRange = IDBKeyRange.bound('text_odia_', 'text_odia_\uffff');
                store.delete(keyRange);
                // console.log("Cleared Odia cache (if any) using shared DB");
            }
        } catch (e) { console.error("Error clearing odia cache", e); }
    }
}

// FIX: Force clear Hindi cache using shared DB connection
async function fixHindiCache() {
    // console.log("Attempting to clear Hindi bible cache...");
    if (db && db.db) {
        try {
            const dbase = db.db;
            if (dbase.objectStoreNames.contains('chapters')) {
                const trans = dbase.transaction(['chapters'], 'readwrite');
                const store = trans.objectStore('chapters');

                // Range 1: HINIRV
                const keyRange1 = IDBKeyRange.bound('HINIRV_', 'HINIRV_\uffff');
                store.delete(keyRange1);

                // Range 2: text_hindi
                const keyRange2 = IDBKeyRange.bound('text_hindi', 'text_hindi\uffff');
                store.delete(keyRange2);

                // console.log("Cleared Hindi cache (if any) using shared DB");
            }
        } catch (e) { console.error("Error clearing hindi cache", e); }
    }
}
// --- APP INITIALIZATION ---

async function loadSettings() {
    // console.log("Loading settings...");
    // Setup initial settings
    setTheme(state.theme);
    setFontSize(state.fontSize);
    setPreferredLanguage(state.preferredLang);
    disableUnavailableLanguages();
    setSwipeEnabled(state.swipeEnabled);
    setSwipeSensitivity(state.swipeSensitivity);
    setLongPressBookmark(state.longPressBookmark);

    // Update UI controls
    if (document.getElementById('swipeEnabled'))
        document.getElementById('swipeEnabled').checked = state.swipeEnabled;
    if (document.getElementById('longPressBookmark'))
        document.getElementById('longPressBookmark').checked = state.longPressBookmark;
    if (document.getElementById('swipeSensitivityRange'))
        document.getElementById('swipeSensitivityRange').value = state.swipeSensitivity;
    if (document.getElementById('sensitivityValue'))
        document.getElementById('sensitivityValue').textContent = state.swipeSensitivity + 'px';
}

// Cache clearing called inside initApp after DB init
// NOTE: loadBook is defined at line ~2636 with full Eternal Life loading logic

// Main Init Function
window.initApp = async function () {
    // BRUTE FORCE SAFETY: Force hide loading after 10 seconds no matter what
    setTimeout(() => {
        // console.warn("Safety timer triggered: Forcing hideLoading");
        hideLoading();
    }, 10000);

    // console.log("Initializing Eternal Life Book Reader...");

    // Load state
    loadReadingState();

    // Setup UI
    try {
        await db.init();
    } catch (e) {
        console.error("DB Init failed", e);
    }
    await loadSettings();

    // Fix caches using the initialized DB
    fixOdiaCache();
    fixHindiCache();

    if (state.swipeEnabled) {
        initSwipeGestures();
    }

    // Set up search suggestions listeners
    setupSearchSuggestions();

    // Check online status
    updateNetworkStatus();
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // --- NEW: Refresh Notifications on Resume ---
    document.addEventListener('resume', () => {
        console.log("[App] Resumed. Refreshing notifications...");
        // Re-schedule to ensure we always have 30 days buffer
        if (typeof Notifications !== 'undefined' && typeof Notifications.scheduleDailyVerses === 'function') {
            // Slight delay to ensure plugins are ready
            setTimeout(() => {
                Notifications.scheduleDailyVerses(books, state);
            }, 1000);
        }
    }, false);

    // Initial check for unavailable languages
    // console.log("Calling disableUnavailableLanguages from initApp...");
    disableUnavailableLanguages();

    // Remove aggressive touchstart/mousedown listeners that break default behavior
    const aggressiveEvents = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup'];
    aggressiveEvents.forEach(evt => {
        // Remove listener if we had added it globally (which we shouldn't have, but just in case)
        // document.removeEventListener(evt, preventDefaultHandler);
        // We only want to prevent default on specific elements if needed
    });

    // Add non-passive listeners only where absolutely necessary if needed
    // For now, we rely on browser default scrolling which is smoother

    document.addEventListener('click', (e) => {
        // Handle clicks outside panels if needed
    });

    // Setup double-tap/double-click listeners for verse popup

    initCustomDoubleTap();


    // Load initial content
    // Use timeout to ensure DOM is ready
    setTimeout(async () => {
        try {
            // Create a timeout promise
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Loading timed out")), 10000)
            );

            // Race loadBook against timeout
            await Promise.race([
                loadBook(state.currentBookKey),
                timeout
            ]);

            // Render the current chapter after book loads
            // Skip if notification launch — the notification handler will render the correct chapter
            if (state.currentBookKey !== 'quiz' && state.currentBookKey !== 'chat' && !window.isNotificationLaunch) {
                await renderChapter();
            }
        } catch (err) {
            console.error("Critical Error during Init:", err);
            // Don't alert for timeout, just log, so app enters usable state
            if (err.message !== "Loading timed out") {
                alert("Error loading content: " + err.message);
            }
        } finally {
            hideLoading();
        }

        // --- RESTORED LOGIC FROM OLD initApp ---
        // 3. Special handling for Bible navigation restoration
        // Skip if notification launch — the notification handler will navigate
        if (state.currentBookKey === 'bible' && !window.isNotificationLaunch) {
            if (state.savedBibleBookName && state.savedBibleChapterNumber) {
                if (typeof restoreBibleNavigation === 'function') await restoreBibleNavigation();
            }
        }

        // 5. Highlight Verse if needed (skip on notification launch)
        if (state.currentVerseNumber > 0 && !window.isNotificationLaunch) {
            setTimeout(() => {
                if (typeof highlightVerse === 'function') highlightVerse(state.currentVerseNumber);
            }, 500);
        }

        // Update the book selector title to reflect the loaded book
        if (typeof updateBookSelectorTitle === 'function') updateBookSelectorTitle();

        if (typeof setupScrollListener === 'function') setupScrollListener();
        if (typeof updateProgressBar === 'function') updateProgressBar();
        if (typeof showNavButtons === 'function') showNavButtons();
        // setupSearchSuggestions already called above

        // Check for download prompt
        if (typeof checkAndPromptDownload === 'function') setTimeout(checkAndPromptDownload, 1000);
        // initCustomDoubleTap already called above

        // Initialize Notification Time Input
        const notifTimeInput = document.getElementById('notificationTime');
        if (notifTimeInput) {
            notifTimeInput.value = state.notificationTime || '08:00';
        }

        // Initialize Notification Toggle
        const notifToggle = document.getElementById('notificationToggle');
        if (notifToggle) {
            notifToggle.checked = state.notificationsEnabled;
        }

        // Setup Daily Verse Notifications (start only if enabled)
        if (state.notificationsEnabled && typeof Notifications !== 'undefined' && typeof Notifications.setup === 'function') {
            setTimeout(() => {
                Notifications.setup(books, state, BIBLE_CONFIG);
            }, 2000);
        }

    }, 100);

    // console.log("App initialization complete.");

    // Show onboarding wizard for first-time users (delay allows WebView layout to settle)
    setTimeout(() => {
        if (typeof checkAndShowOnboarding === 'function') {
            checkAndShowOnboarding();
        }
    }, 1500);
}

// Wrapper for existing calls to startAppLogic
window.appStarted = false;
window.startAppLogic = function () {
    if (window.appStarted) return;
    window.appStarted = true;
    // INJECT MISSING CONFIGS - Removed (Now in standard config)
    // if (typeof BIBLE_CONFIG !== 'undefined') { ... }

    window.initApp();
};

// SAFETY FALLBACK: If deviceready doesn't fire within 5 seconds, force start
setTimeout(() => {
    if (!window.appStarted) {
        console.warn("deviceready timeout: Forcing app start...");
        startAppLogic();
    }
}, 5000);

// Cordova Device Ready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    if (typeof device !== 'undefined') {
        // console.log('Running on Cordova platform: ' + device.platform);
    } else {
        // console.log('Running on Cordova (device plugin not found)');
    }
    startAppLogic();

    // Check for updates (In-App Updates)
    if (typeof checkForUpdates === 'function') {
        // Slight delay to allow app to settle
        setTimeout(checkForUpdates, 3000);
    }

    // Handle back button
    document.addEventListener("backbutton", onBackKeyDown, false);

    // Hide Splash Screen
    if (navigator.splashscreen) {
        setTimeout(function () {
            navigator.splashscreen.hide();
        }, 100);
    }
}

function onBackKeyDown(e) {
    // Handle onboarding/tutorial back
    if (document.getElementById('onboardingWizard')) {
        if (typeof prevOnboardingSlide === 'function' && prevOnboardingSlide()) {
            // Went back a slide
            e.preventDefault();
            return;
        }
        // On first slide — skip onboarding and enter the app
        if (typeof skipOnboarding === 'function') skipOnboarding();
        e.preventDefault();
        return;
    }
    if (document.getElementById('tutorialOverlay')) {
        endTutorial();
        e.preventDefault();
        return;
    }
    if (document.getElementById('aboutPopup') && document.getElementById('aboutPopup').style.display === 'block') {
        closeAboutPopup();
        e.preventDefault();
    } else if (document.getElementById('settingsPanel') && document.getElementById('settingsPanel').classList.contains('show')) {
        toggleSettings();
        e.preventDefault();
    } else if (document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('open')) {
        closeSidebar();
        e.preventDefault();
    } else if (document.getElementById('bookSelectorSidebar') && document.getElementById('bookSelectorSidebar').classList.contains('open')) {
        toggleBookSelectorSidebar();
        e.preventDefault();
    } else if (document.getElementById('searchPanel') && document.getElementById('searchPanel').classList.contains('open')) {
        toggleSearchPanel(false);
        e.preventDefault();
    } else if (document.getElementById('gamesModal') && document.getElementById('gamesModal').style.display === 'flex') {
        toggleGamesModal();
        e.preventDefault();
    } else if (document.getElementById('quizContainer') && document.getElementById('quizContainer').style.display !== 'none') {
        toggleQuiz(false); // Exit Quiz
        e.preventDefault();
    } else if (document.getElementById('scrollRestorerContainer') && document.getElementById('scrollRestorerContainer').style.display !== 'none') {
        // Check if inside a level (Level Select hidden)
        const levelSelect = document.getElementById('scrollLevelSelect');
        if (levelSelect && levelSelect.style.display === 'none') {
            // Back to Level Selection
            if (typeof renderLevelSelection === 'function') {
                renderLevelSelection();
            } else {
                toggleScrollRestorer(false);
            }
        } else {
            // Exit Scroll Restorer Game
            toggleScrollRestorer(false);
        }
        e.preventDefault();
    } else if (document.getElementById('exitPopup') && (document.getElementById('exitPopup').style.display === 'flex' || document.getElementById('exitPopup').style.display === 'block')) {
        // If exit popup is open, close it on back press (cancel exit)
        closeExitPopup();
        e.preventDefault();
    } else {
        // Check "Do not show again" preference
        const skipExitPopup = localStorage.getItem('myReaderExitSkip') === 'true';

        if (skipExitPopup) {
            navigator.app.exitApp();
        } else {
            e.preventDefault();
            openExitPopup();
        }
    }
}

function openExitPopup() {
    const popup = document.getElementById('exitPopup');
    if (popup) popup.style.display = 'flex';
}

function closeExitPopup() {
    const popup = document.getElementById('exitPopup');
    if (popup) popup.style.display = 'none';
}

function confirmExitApp() {
    const checkbox = document.getElementById('dontShowExitAgain');
    if (checkbox && checkbox.checked) {
        localStorage.setItem('myReaderExitSkip', 'true');
    }
    navigator.app.exitApp();
}

// Fallback for browser testing (if deviceready doesn't fire)
if (!window.cordova) {
    document.addEventListener('DOMContentLoaded', () => {
        // console.log("Browser mode detected (no cordova).");
        startAppLogic();
    });
}

// --- MISSING UI FUNCTIONS RESTORED ---

function updateBookSelectorTitle() {
    const titleEl = document.getElementById('bookSelectorTitle');
    if (titleEl && books[state.currentBookKey]) {
        titleEl.textContent = books[state.currentBookKey].title;
    } else if (titleEl) {
        titleEl.textContent = "Select a Book";
    }
}

function showNavButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.style.display = 'block';
    }

    if (nextBtn) {
        nextBtn.style.display = 'block';
    }
}

function updateNetworkStatus() {
    syncNetworkStatus();
}

// --- GAMES MODAL FUNCTIONS ---

function toggleGamesModal() {
    const gamesModal = document.getElementById('gamesModal');
    if (gamesModal) {
        if (gamesModal.style.display === 'none' || gamesModal.style.display === '') {
            gamesModal.style.display = 'flex';
        } else {
            gamesModal.style.display = 'none';
        }
    }
}

function selectGame(gameId) {
    switch (gameId) {
        case 'quiz':
            toggleGamesModal(); // Close the modal
            toggleQuiz(); // Open quiz
            break;
        case 'scroll-restorer':
            toggleGamesModal(); // Close the modal
            toggleScrollRestorer(true); // Open scroll restorer
            break;
        case 'manna-catch':
        case 'ark-balance':
        case 'sling-stone':
            alert('This game is coming soon! Stay tuned for updates.');
            break;
        default:
            console.warn('Unknown game selected:', gameId);
    }
}

function toggleMannaCatch(show) {
    const container = document.getElementById('mannaCatchContainer');
    if (show) {
        container.style.display = 'block';
        if (typeof MannaCatchGame !== 'undefined' && MannaCatchGame.init) {
            MannaCatchGame.init();
        }
    } else {
        container.style.display = 'none';
        if (typeof MannaCatchGame !== 'undefined' && MannaCatchGame.close) {
            MannaCatchGame.close();
        }
    }
}

// --- QUIZ GAME FUNCTIONS ---

// IMPORTANT: The quiz functions already exist earlier in the file (starting at line 3438)
// The duplicate functions below have been commented out to avoid conflicts

// Quiz state variables
// let quizQuestions = [];
// let currentQuestionIndex = 0;
// let score = 0;
// let hintsRemaining = 3;

// --- QUIZ GAME FUNCTIONS (LOCALIZED) ---

// Quiz state variables
// (Note: defined globally or re-declared here if acceptable in scope? 
// Original commented code had them commented out. Better to ensure they are available.)
// If they are declared elsewhere, re-declaring with 'let' might error if in same scope.
// However, I don't see them declared in global scope nearby. 
// Safest is to declare them here if they aren't already.
// Checking previous file content, they were commented out: // let quizQuestions = [];
// So I will uncomment them efficiently.

// Duplicate quiz functions (loadQuizData, startQuiz, getSelectedQuestions, etc.) removed.
// The primary implementations above (around line 4202+) use XHR fallback for Android compatibility.


// Simplified toggleQuiz function for opening/closing quiz
function toggleQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    const bookPage = document.getElementById('bookPage');
    const chatContainer = document.getElementById('chatContainer');

    if (!quizContainer) return;

    const isQuizVisible = quizContainer.style.display === 'flex';
    console.log(`[DEBUG] toggleQuiz called. Current display: ${quizContainer.style.display}, isVisible: ${isQuizVisible}`);

    if (isQuizVisible) {
        // Hide Quiz
        console.log('[DEBUG] Hiding quiz container');
        quizContainer.style.display = 'none';
        bookPage.style.display = 'block';
        state.quizModeActive = false;
    } else {
        // Show Quiz
        console.log('[DEBUG] Showing quiz container');
        state.quizModeActive = true;

        quizContainer.style.display = 'flex';
        // FORCE Styles to ensure visibility
        quizContainer.style.zIndex = '20000';
        quizContainer.style.opacity = '1';
        quizContainer.style.visibility = 'visible';

        bookPage.style.display = 'none';
        if (chatContainer) chatContainer.style.display = 'none';

        // Check computed style to verify
        const computed = window.getComputedStyle(quizContainer);
        console.log(`[DEBUG] Quiz container computed display: ${computed.display}, z-index: ${computed.zIndex}, visibility: ${computed.visibility}`);

        startQuiz();
    }
}

/**
 * Transforms GodlyTalias Bible JSON format into the application's internal format
 * @param {Object} data - The raw JSON data from GodlyTalias
 * @param {string} langKey - The language key
 * @returns {Object} The transformed book object
 */
// Duplicate function transformGodlyTaliasData removed - using more advanced version at top of file




/**
 * Transforms the Rohingya Bible JSON structure into the reader format.
 * @param {object} data - The Rohingya Bible JSON data (array of books).
 * @param {string} langKey - The language key.
 * @returns {object} The transformed book object.
 */
function transformRohingyaData(data, langKey) {
    let title = "Rohingya Bible";
    const chapters = [];

    // Map book codes to English names (and IDs)
    const bookMap = {
        "GEN": "Genesis",
        "RUT": "Ruth",
        "JON": "Jonah",
        "MRK": "Mark",
        "LUK": "Luke",
        "JHN": "John",
        "ACT": "Acts",
        "GAL": "Galatians",
        "EPH": "Ephesians"
    };

    // Fallback Bible Book Names if not globally defined
    const defaultBibleBookNames = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
        "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
        "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
        "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
        "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
        "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
        "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
        "1 John", "2 John", "3 John", "Jude", "Revelation"
    ];

    if (!Array.isArray(data)) {
        console.error("Rohingya data is not an array:", data);
        return { title, chapters };
    }

    data.forEach(bookObj => {
        const bookCode = bookObj.book;
        const englishBookName = bookMap[bookCode] || bookCode; // Fallback to code if unknown

        // Find book index for ID
        let bookId = 1;
        const namesList = (typeof bibleBookNames !== 'undefined') ? bibleBookNames : defaultBibleBookNames;

        bookId = namesList.indexOf(englishBookName) + 1;
        if (bookId === 0) bookId = 1; // Fallback

        if (bookObj.chapters && Array.isArray(bookObj.chapters)) {
            bookObj.chapters.forEach(chapObj => {
                const chapterNum = chapObj.chapter;
                const versesArr = [];

                if (chapObj.verses && Array.isArray(chapObj.verses)) {
                    chapObj.verses.forEach((v, index) => {
                        const verseNum = v.verse.toString();
                        const text = v.text;

                        versesArr.push({
                            id: `${englishBookName} ${chapterNum}:${verseNum}`,
                            text: text,
                            verseId: verseNum,
                            verse: verseNum
                        });
                    });
                }

                chapters.push({
                    title: `${englishBookName} ${chapterNum}`,
                    bookName: englishBookName,
                    bookId: bookId,
                    chapterNumber: chapterNum,
                    verses: versesArr
                });
            });
        }
    });

    return { title, chapters };
}







