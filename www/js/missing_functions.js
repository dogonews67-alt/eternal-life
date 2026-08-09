/**
 * missing_functions.js
 * Restores missing utility functions that are called by other scripts but were not defined.
 */

/**
 * Loads the Bible data for the specified language and translation.
 * Critical for deep linking (notifications) and ensures data exists before rendering.
 * 
 * @param {string} langKey - The language key (e.g., 'text', 'text_odia').
 * @param {boolean} forceUpdate - Whether to force a fresh download/load (default false).
 * @param {string} targetTranslationId - Optional specific translation ID to load.
 */
window.loadBibleForCurrentLanguage = async function (langKey, forceUpdate = false, targetTranslationId = null) {
    console.log(`[BibleLoader] Request to load Bible for ${langKey} (Translation: ${targetTranslationId || 'Default'})`);

    // 1. Resolve Translation ID
    let versionId = targetTranslationId;
    if (!versionId) {
        // Try to get from state or config
        if (window.state && window.state.currentLang === langKey && window.state.currentTranslationId) {
            versionId = window.state.currentTranslationId;
        } else if (window.BIBLE_CONFIG && window.BIBLE_CONFIG[langKey]) {
            const config = window.BIBLE_CONFIG[langKey];
            if (config.sources && config.sources.length > 0) {
                versionId = config.sources[0].id || config.sources[0].lang;
            }
        }
    }
    // Fallback default
    if (!versionId) versionId = 'YLT';

    console.log(`[BibleLoader] Resolved Version ID: ${versionId}`);

    // 2. Check if ALREADY LOADED in memory
    if (!forceUpdate && window.books && window.books['bible']) {
        const loaded = window.books['bible'];
        // Check if it matches the language and version we want
        // Note: Some legacy data might not have translationId, so we check loosely if language matches
        const matchesLang = window.state.currentLang === langKey;
        const matchesVersion = loaded.translationId === versionId;

        if (matchesLang && (matchesVersion || !loaded.translationId)) {
            // Check if it has content
            if (loaded.chapters && loaded.chapters.length > 0) {
                console.log("[BibleLoader] Bible already loaded in memory. Skipping load.");
                return;
            }
        }
    }

    // 3. Try loading from OFFLINE STORAGE (IndexedDB/LocalStorage)
    if (typeof window.BibleStorage !== 'undefined') {
        try {
            // The storage key logic might vary, but typically it's the language key or versionId
            // script_v2.js often uses just the langKey for the "active" bible of that language
            // or specific keys for versions. Let's try the standard language key first.
            const data = await window.BibleStorage.loadBible(langKey);

            if (data && data.chapters && data.chapters.length > 0) {
                // Verify it matches the version we want if strict
                if (!targetTranslationId || data.translationId === targetTranslationId || !data.translationId) {
                    console.log("[BibleLoader] Loaded valid data from BibleStorage.");
                    if (!window.books) window.books = {};
                    window.books['bible'] = data;
                    return;
                }
            }
        } catch (e) {
            console.warn("[BibleLoader] Failed to load from storage:", e);
        }
    }

    // 4. If memory and storage failed, we might need to DOWNLOAD or FETCH it.
    // We can reuse `downloadCurrentBible` logic but adapt it for hidden loading?
    // Or simpler: Check if it's a "Local" source (in config) and fetch the JSON directly.

    if (window.BIBLE_CONFIG && window.BIBLE_CONFIG[langKey]) {
        const config = window.BIBLE_CONFIG[langKey];
        const source = config.sources ? config.sources[0] : null;

        if (source && (source.type === 'LOCAL' || source.type === 'GITHUB_CUSTOM' || source.type === 'GITHUB_WLDEH')) {
            console.log("[BibleLoader] Attempting direct fetch for local/custom source...");
            // We can try to use the logic inside downloadCurrentBible by calling it? 
            // But downloadCurrentBible is UI-bound (shows popups).
            // Let's try to find an existing non-UI loader or just fail gracefully 
            // so the UI prompts the user.

            // If we are in the "Notifications" flow, we really want this to work automatically.
            // Let's assume `downloadCurrentBible` handles "background" checks if we pass a callback?
            // Actually `downloadCurrentBible` in script_v2 has a lot of UI code.

            // Let's rely on `loadBook('bible')` which calls `loadBibleForCurrentLanguage`... wait, that's circular!
            // `loadBook` calls *THIS* function. So we must do the actual work here.

            // RE-IMPLEMENT BASIC FETCH LOGIC from `downloadCurrentBible` (simplified)
            try {
                if (source.type === 'LOCAL' && source.path) {
                    const response = await fetch(source.path);
                    const json = await response.json();

                    // Transform?
                    let transformed = json;
                    if (window.transformGodlyTaliasData) {
                        transformed = window.transformGodlyTaliasData(json, langKey);
                    } else if (langKey === 'text_rohingya' && window.transformRohingyaData) {
                        transformed = window.transformRohingyaData(json, langKey);
                    }

                    if (transformed) {
                        if (!window.books) window.books = {};
                        window.books['bible'] = transformed;
                        console.log("[BibleLoader] Successfully fetched and prepared local data.");
                        return;
                    }
                }
            } catch (err) {
                console.error("[BibleLoader] Direct fetch failed:", err);
            }
        }
    }

    console.warn("[BibleLoader] Could not auto-load Bible. User may need to download it.");
    // Initialize empty to prevent crashes
    if (!window.books) window.books = {};
    if (!window.books['bible']) {
        window.books['bible'] = { title: "Bible (Not Loaded)", chapters: [] };
    }
};

console.log("[System] missing_functions.js loaded.");
