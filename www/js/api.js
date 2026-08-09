const API_CONFIG = {
    // Primary API (Open Source / Free)
    primary: {
        baseUrl: 'https://bolls.life',
        headers: {}
    },
    // Placeholder for Commercial/Premium API
    // commercial: {
    //     baseUrl: 'https://api.scripture.api.bible/v1',
    //     headers: { 'api-key': 'YOUR_API_KEY' }
    // }
};

let currentApiConfig = API_CONFIG.primary;
let API_BASE = currentApiConfig.baseUrl;

// Function to switch API provider
function setApiProvider(providerKey) {
    if (API_CONFIG[providerKey]) {
        currentApiConfig = API_CONFIG[providerKey];
        API_BASE = currentApiConfig.baseUrl;
        // console.log(`Switched API provider to: ${providerKey}`);
    }
}

const api = {
    // Cache for translations list
    translations: null,

    async fetchTranslations() {
        if (this.translations) return this.translations;

        try {
            const response = await fetch(`${API_BASE}/static/bolls/app/views/languages.json`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            // Flatten the structure if needed or just return. 
            // The structure is typically: [{ language: "English", translations: [...] }, ...]
            this.translations = data;
            return data;
        } catch (error) {
            console.error("Failed to fetch translations:", error);
            return [];
        }
    },

    async getBooks(translationId, sourceType = 'BOLLS') {
        if (!navigator.onLine) {
            // console.warn("Device is offline. Skipping API call.");
            return []; // Return empty list when offline
        }
        try {
            if (sourceType === 'HELLOAO') {
                const response = await fetch(`https://bible.helloao.org/api/${translationId}/books.json`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();

                // Transform to match Bolls structure: [{ bookid, name, chapters }, ...]
                // HelloAo data structure: { books: [{ id: "GEN", name: "Genesis", numberOfChapters: 50 }, ...] }
                if (data.books) {
                    return data.books.map(b => ({
                        bookid: b.id,
                        name: b.name,
                        chapters: b.numberOfChapters
                    }));
                }
                return [];
            } else if (sourceType === 'LOCAL_BIBLE') {
                // Fetch books from local JSON (Using XHR for Android support)
                // translationId is the path (e.g., 'dogri_bible_json')

                return new Promise((resolve, reject) => {
                    const url = `${translationId}/books.json`;
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    xhr.responseType = 'json';
                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 0) {
                            const data = xhr.response;
                            if (data && data.books) {
                                resolve(data.books.map(b => ({
                                    bookid: b.id,
                                    name: b.name,
                                    chapters: b.numberOfChapters
                                })));
                            } else {
                                resolve([]);
                            }
                        } else {
                            // resolve([]); // Fail silently or reject?
                            console.error(`XHR failed for books.json: ${xhr.status}`);
                            resolve([]);
                        }
                    };
                    xhr.onerror = () => {
                        console.error("XHR Network Error for books.json");
                        resolve([]);
                    };
                    xhr.send();
                });

            } else if (sourceType === 'GITHUB_V2') {
                // Fetch from GetBible V2 Books endpoint
                // https://api.getbible.net/v2/[TRANS_ID]/books.json
                const response = await fetch(`https://api.getbible.net/v2/${translationId}/books.json`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();

                // GetBible returns object keys or array?
                // Usually: {"books": [...]} or just array depending on endpoint version details.
                // Let's assume standard V2: { ... , books: [{nr:1, name:"..."}, ...] } or purely array?
                // Checking docs/responses: V2 often returns object key "books".

                let booksArray = [];
                if (Array.isArray(data)) booksArray = data;
                else if (data.books) booksArray = data.books;
                else booksArray = Object.values(data); // Handle { "1": {...}, "2": {...} }

                return booksArray.map(b => ({
                    bookid: b.nr || b.id, // Use 'nr' (number) or 'id'
                    name: b.name || b.common,
                    chapters: b.chapters // GetBible might not give chapter count in simple cached list? 
                })).map(b => {
                    if (!b.chapters) {
                        const bibleChapterCounts = {
                            1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24, 11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31, 21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9, 31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4, 40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
                        };
                        // Parse bookid to int to lookup chapters
                        const nr = parseInt(b.bookid);
                        if (!isNaN(nr)) {
                            b.chapters = bibleChapterCounts[nr] || 1;
                        } else {
                            // Fallback if ID is not a number (unlikely for V2 legacy)
                            b.chapters = 1;
                        }
                    }
                    return b;
                });
            } else if (sourceType === 'GITHUB_ARULJOHN') {
                console.log(`[DEBUG_NIV] api.getBooks fetching from GITHUB_ARULJOHN for ${translationId}`);
                // Fetch list of books from aruljohn repo
                let repoName = translationId;
                if (repoName === 'niv') repoName = 'Bible-niv';

                const response = await fetch(`https://raw.githubusercontent.com/aruljohn/${repoName}/master/Books.json`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();

                // data is ["Genesis", "Exodus", ...]
                return data.map((name, index) => ({
                    bookid: index + 1, // Use 1-based index or name? Let's use 1-based index for consistency
                    name: name,
                    chapters: 50 // Dummy chapter count, or we need a map. 
                    // ideally we should have a map of chapter counts, but for now let's rely on the fallback in line 92-103 if 0/undefined
                })).map(b => {
                    const bibleChapterCounts = {
                        1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24, 11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31, 21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9, 31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4, 40: 28, 41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6, 50: 4, 51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5, 60: 5, 61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
                    };
                    b.chapters = bibleChapterCounts[b.bookid] || 1;
                    return b;
                });
            } else if (sourceType === 'GITHUB_GODLYTALIAS' || sourceType === 'LOCAL' || sourceType === 'GITHUB_WLDEH') {
                // These sources are single-file and do not support book-list fetching via this API method.
                // They should be handled by fetching the full file and transforming it.
                // script.js handles this logic directly.
                // console.warn(`api.getBooks called for single-file source: ${sourceType}. Returning empty list.`);
                return [];
            } else {
                // Default to BOLLS
                // e.g., https://bolls.life/get-books/YLT/
                const url = `${API_BASE}/get-books/${translationId}/`;
                console.log(`[API] Fetching books from BOLLS: ${url}`);
                const response = await fetch(url);
                if (!response.ok) {
                    console.error(`[API] BOLLS get-books failed: ${response.status} ${response.statusText}`);
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();

                // BOLLS usually returns an array of objects
                // [{ "bookid": 1, "name": "Genesis", "chronorder": 1, "chapters": 50 }, ...]
                if (Array.isArray(data)) {
                    return data;
                } else if (data && data.error) {
                    console.error(`[API] BOLLS returned error: ${data.error}`);
                    return [];
                } else {
                    console.warn(`[API] BOLLS returned unexpected structure:`, data);
                    return [];
                }
            }
        } catch (error) {
            console.error(`Failed to fetch books for ${translationId} (${sourceType}):`, error);
            return [];
        }
    },

    async getChapter(translationId, bookId, chapterId, sourceType = 'BOLLS') {
        try {
            let url = '';
            if (sourceType === 'GITHUB_ARULJOHN') {
                const englishBookNames = [
                    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
                    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
                    "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song Of Solomon", "Isaiah", "Jeremiah",
                    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
                    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
                    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
                    "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
                    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
                    "1 John", "2 John", "3 John", "Jude", "Revelation"
                ];
                // Note: "Song Of Solomon" capitalization in aruljohn's Books.json was "Song Of Solomon"

                let bookName = bookId;
                if (!isNaN(parseInt(bookId))) {
                    bookName = englishBookNames[parseInt(bookId) - 1];
                }

                // Robustness: ensure translationId matches Aruljohn's repo naming (Bible-xxx)
                let repoName = translationId;
                if (repoName === 'niv') repoName = 'Bible-niv';
                if (!repoName.startsWith('Bible-')) {
                    // console.warn(`Aruljohn source ID ${translationId} may need 'Bible-' prefix.`);
                }

                // Construct URL: https://raw.githubusercontent.com/aruljohn/Bible-niv/master/Genesis.json
                url = `https://raw.githubusercontent.com/aruljohn/${repoName}/master/${encodeURIComponent(bookName)}.json`;
                console.log(`[DEBUG_NIV] api.getChapter constructed URL: ${url}`);
            } else if (sourceType === 'HELLOAO') {
                // HELLOAO Structure: https://bible.helloao.org/api/{translationId}/{bookId}.json
                // Header defaults to .json but fetch handles it.
                // Note: HelloAo uses 'GEN', 'EXO' etc. derived from bookId if passed correctly.
                // If bookId is just a number (1), we might need mapping?
                // Usually getChapter is called with the bookId stored in books object, which for HelloAO 
                // we mapped to b.id (e.g. 'GEN') in getBooks. So it should be correct.
                url = `https://bible.helloao.org/api/${translationId}/${bookId}/${chapterId}.json`;

            } else if (sourceType === 'LOCAL_BIBLE') {
                // Local Bible Structure: {translationId}/{bookId}/{chapterId}.json
                // e.g. dogri_bible_json/MAT/1.json
                const localUrl = `${translationId}/${bookId}/${chapterId}.json`;
                console.log(`[API] LOCAL_BIBLE fetching: ${localUrl}`);

                // Use XHR for Android file:// protocol compatibility (fetch throws TypeError)
                const data = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', localUrl, true);
                    xhr.responseType = 'json';
                    xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 0) {
                            resolve(xhr.response);
                        } else {
                            reject(new Error(`XHR failed: ${xhr.status}`));
                        }
                    };
                    xhr.onerror = () => reject(new Error('XHR Network Error'));
                    xhr.send();
                });

                // Transform LOCAL_BIBLE chapter structure (same as HELLOAO)
                if (!data || !data.chapter || !data.chapter.content) {
                    console.error("LOCAL_BIBLE structure invalid:", data);
                    return null;
                }

                const verses = data.chapter.content.filter(item => item.type === 'verse');
                return verses.map(v => {
                    let text = '';
                    if (Array.isArray(v.content)) {
                        text = v.content.map(c => {
                            if (typeof c === 'string') return c;
                            if (c.text) return c.text;
                            return '';
                        }).join(' ');
                    }
                    return {
                        chapter: chapterId,
                        verse: v.number,
                        text: text.trim()
                    };
                });

            } else {
                // Default to BOLLS
                url = `${API_BASE}/get-chapter/${translationId}/${bookId}/${chapterId}/`;
            }

            const response = await fetch(url, {
                headers: currentApiConfig.headers
            });
            if (!response.ok) throw new Error(`Network response was not ok (status: ${response.status})`);

            let data;
            data = await response.json();

            if (sourceType === 'HELLOAO' || sourceType === 'LOCAL_BIBLE') {
                // console.log("Parsing HELLOAO/LOCAL data:", data); // DEBUG
                // Transform HELLOAO chapter structure
                // LOCAL_BIBLE also uses this structure
                if (!data.chapter || !data.chapter.content) {
                    console.error("HELLOAO/LOCAL structure invalid:", data);
                    return null;
                }

                // Filter for verses and extract text
                const verses = data.chapter.content.filter(item => item.type === 'verse');

                return verses.map(v => {
                    let text = '';
                    if (Array.isArray(v.content)) {
                        text = v.content.map(c => {
                            if (typeof c === 'string') return c;
                            if (c.text) return c.text;
                            return '';
                        }).join(' ');
                    }
                    return {
                        chapter: chapterId, // script.js expects this for ID generation
                        verse: v.number,
                        text: text.trim()
                    };
                });
            } else if (sourceType === 'GITHUB_V2') {
                // Transform GetBible v2 structure
                return data.verses || null;
            } else if (sourceType === 'GITHUB_ARULJOHN') {
                // Structure: { book: "Genesis", chapters: [ { chapter: "1", verses: [ { verse: "1", text: "..." } ] } ] }
                if (!data.chapters) return null;
                const chapterData = data.chapters.find(c => c.chapter == chapterId);
                if (!chapterData || !chapterData.verses) return null;

                return chapterData.verses.map(v => ({
                    verse: v.verse,
                    text: v.text
                }));
            }

            // Default BOLLS - Cleanup Strong's numbers if present (e.g. <S>123</S>)
            if (Array.isArray(data)) {
                return data.map(item => {
                    if (item.text && typeof item.text === 'string') {
                        // Remove <S>...</S> tags (non-greedy)
                        item.text = item.text.replace(/<S>.*?<\/S>/g, '');
                    }
                    return item;
                });
            }

            return data;
            // Returns array of objects: [{ verse: 1, text: "..." }, ...]
        } catch (error) {
            console.error(`Failed to fetch chapter ${translationId} ${bookId}:${chapterId} (${sourceType})`, error);
            return null;
        }
    }
};

// Expose API globally
window.api = api;
console.log("API module loaded and attached to window.api");
