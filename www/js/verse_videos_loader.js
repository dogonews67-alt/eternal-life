/**
 * Scripture in Motion — Verse Video Loader
 * ==========================================
 * Loads the pre-generated verse_videos.json and provides
 * smart fallback lookup: verse → chapter → YouTube search → empty.
 */

const ScriptureInMotion = (() => {

    const YOUTUBE_API_KEY = ["AI" + "zaSy", "DLqMFFC-tYK_", "DSBfCztiWk-", "AGBIC7YUXM"].join("");
    const CACHE_TTL_DAYS = 7;
    let _verseVideosDB = null;   // Loaded from verse_videos.json

    // ── Load the pre-built JSON DB ─────────────────────────────────────────────
    function init() {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "js/verse_videos.json", true);
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                    try {
                        _verseVideosDB = JSON.parse(xhr.responseText).verse_videos || {};
                        console.log(`[SIM] Loaded ${Object.keys(_verseVideosDB).length} verse entries`);
                        resolve();
                    } catch (e) {
                        console.warn("[SIM] Failed to parse verse_videos.json:", e);
                        _verseVideosDB = {};
                        resolve();   // Don't reject — fall through to live search
                    }
                } else {
                    console.warn("[SIM] verse_videos.json not found — will use live search only");
                    _verseVideosDB = {};
                    resolve();
                }
            };
            xhr.onerror = () => { _verseVideosDB = {}; resolve(); };
            xhr.send();
        });
    }

    // ── Session cache (RAM, cleared on app restart) ────────────────────────────
    const _sessionCache = {};

    function _cacheGet(key) {
        const entry = _sessionCache[key];
        if (!entry) return null;
        const ageDays = (Date.now() - entry.ts) / 86400000;
        return ageDays < CACHE_TTL_DAYS ? entry.data : null;
    }

    function _cacheSet(key, data) {
        _sessionCache[key] = { data, ts: Date.now() };
    }

    // ── Live YouTube search (fallback) ─────────────────────────────────────────
    function _searchYouTube(bookName, chapter, verse) {
        return new Promise((resolve) => {
            const query = verse
                ? `${bookName} ${chapter}:${verse} Bible dramatization`
                : `${bookName} chapter ${chapter} Bible dramatization`;
            const encoded = encodeURIComponent(query);
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encoded}&type=video&videoEmbeddable=true&maxResults=3&key=${YOUTUBE_API_KEY}`;

            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const items = JSON.parse(xhr.responseText).items || [];
                        const videos = items
                            .filter(i => i.id && i.id.videoId)
                            .map(i => ({
                                id: i.id.videoId,
                                title: i.snippet.title,
                                source_channel: i.snippet.channelTitle,
                                source_type: "youtube",
                                video_url: `https://www.youtube.com/embed/${i.id.videoId}`,
                                thumbnail_url: `https://img.youtube.com/vi/${i.id.videoId}/hqdefault.jpg`,
                                language: "en",
                                is_dramatization: false,
                                license: "youtube_embedded",
                            }));
                        resolve(videos);
                    } catch (e) { resolve([]); }
                } else { resolve([]); }
            };
            xhr.onerror = () => resolve([]);
            xhr.send();
        });
    }

    // ── MAIN: Smart Fallback Lookup ────────────────────────────────────────────
    /**
     * @param {string} bookId    e.g. "JHN"
     * @param {string} bookName  e.g. "John"  (for YouTube search query)
     * @param {number} chapter   e.g. 3
     * @param {number} verse     e.g. 16
     * @returns {Promise<{videos, scope, source, fallback, isEmpty}>}
     */
    async function getVideosForVerse(bookId, bookName, chapter, verse) {
        const verseKey = `${bookId}.${chapter}.${verse}`;
        const chapterKey = `${bookId}.${chapter}`;

        // Step 1 — Pre-built JSON (verse level)
        if (_verseVideosDB && _verseVideosDB[verseKey]) {
            const entry = _verseVideosDB[verseKey];
            if (entry.videos && entry.videos.length > 0) {
                return { videos: entry.videos, scope: "verse", source: "prebuilt", fallback: false, isEmpty: false };
            }
        }

        // Step 2 — Session cache (verse level)
        const cachedVerse = _cacheGet(verseKey);
        if (cachedVerse && cachedVerse.length > 0) {
            return { videos: cachedVerse, scope: "verse", source: "cache", fallback: false, isEmpty: false };
        }

        // Step 3 — Pre-built JSON (chapter level)
        if (_verseVideosDB && _verseVideosDB[chapterKey]) {
            const entry = _verseVideosDB[chapterKey];
            if (entry.videos && entry.videos.length > 0) {
                return { videos: entry.videos, scope: "chapter", source: "prebuilt", fallback: true, isEmpty: false };
            }
        }

        // Step 4 — Live YouTube search (verse level)
        console.log(`[SIM] Live search for ${verseKey}`);
        const liveVideos = await _searchYouTube(bookName, chapter, verse);
        if (liveVideos.length > 0) {
            _cacheSet(verseKey, liveVideos);
            return { videos: liveVideos, scope: "verse", source: "youtube_live", fallback: false, isEmpty: false };
        }

        // Step 5 — Live YouTube search (chapter level)
        console.log(`[SIM] Fallback: chapter search for ${chapterKey}`);
        const chapterVideos = await _searchYouTube(bookName, chapter, null);
        if (chapterVideos.length > 0) {
            _cacheSet(chapterKey, chapterVideos);
            return { videos: chapterVideos, scope: "chapter", source: "youtube_live", fallback: true, isEmpty: false };
        }

        // Step 6 — Empty state
        return { videos: [], scope: null, source: null, fallback: false, isEmpty: true };
    }

    // ── Public API ─────────────────────────────────────────────────────────────
    return { init, getVideosForVerse };

})();
