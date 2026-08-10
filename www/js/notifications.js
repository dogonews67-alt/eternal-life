/**
 * Notifications Module
 * Handles scheduling of daily verse notifications.
 * Uses cordova-plugin-local-notification
 */

// === EARLY CLICK LISTENER ===
// Register the notification click handler as early as possible (before initApp/setup),
// so cold-start launches from notification taps are captured immediately.
(function () {
    document.addEventListener('deviceready', function () {
        if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
            cordova.plugins.notification.local.on('click', function (notification) {
                console.log("[Notifications] EARLY click event fired:", notification);
                let clickData = notification.data;
                if (typeof clickData === 'string') {
                    try { clickData = JSON.parse(clickData); } catch (e) { }
                }
                if (clickData && clickData.target === 'verse') {
                    // Set flag IMMEDIATELY so restoreBibleNavigation knows to abort
                    window.isNotificationLaunch = true;
                    window._pendingNotificationData = clickData;
                    console.log("[Notifications] Cold-start flag set. Pending data stored.");
                    // Try to handle immediately if app is ready, otherwise it will be picked up later
                    if (typeof Notifications !== 'undefined' && Notifications.handleNotificationClick) {
                        Notifications.handleNotificationClick(clickData);
                    }
                }
            });
            console.log("[Notifications] EARLY click listener registered.");
        }
    }, false);
})();

const Notifications = {
    _isScheduling: false, // Guard against duplicate concurrent scheduling
    /**
     * Initialize/Setup notifications
     * Should be called on deviceready
     * @param {Object} books - The books data object (from script_v2.js)
     * @param {Object} state - The app state object (from script_v2.js)
     */
    /**
     * Initialize/Setup notifications
     * Should be called on deviceready
     * @param {Object} books - The books data object (from script_v2.js)
     * @param {Object} state - The app state object (from script_v2.js)
     * @param {Object} bibleConfig - The BIBLE_CONFIG object (from script_v2.js)
     */
    async setup(books, state, bibleConfig) {
        // Store config for later use
        this.config = bibleConfig;

        // MOCK FOR BROWSER: Allow testing notifications in browser
        if (typeof cordova !== 'undefined' && cordova.platformId === 'browser') {
            this._setupBrowserMock();
        }

        // Also check standard Web Notification permission if in browser context without Cordova
        if (typeof cordova === 'undefined' && 'Notification' in window) {
            this._setupBrowserMock();
        }

        if (!this.hasPlugin()) {
            console.log("Notification plugin not found. Skipping setup.");
            return;
        }

        console.log("[Notifications] Setup initiated.");

        // --- NEW: Ensure correct Bible is loaded before scheduling ---
        const currentLang = state.currentLang || 'text';
        if (typeof window.loadBibleForCurrentLanguage === 'function') {
            if (!books['bible'] || !books['bible'].chapters || books['bible'].chapters.length === 0) {
                const silent = true;
                console.log(`[Notifications] Pre-loading Bible for language (silent): ${currentLang}`);
                await window.loadBibleForCurrentLanguage(currentLang, false, null, silent);
            }
        }

        // Android 13+ Permission Logic
        // IMPORTANT: await so that Bible preload (above) completes before scheduling starts
        const granted = await this.requestPermission();
        if (granted) {
            console.log("[Notifications] Permission granted. Scheduling...");
            await this.scheduleDailyVerses(books, state);
        } else {
            console.log("[Notifications] Permission denied or not yet granted.");
        }

        // Click listener is now registered EARLY (above Notifications object) to catch cold-start clicks.
        // If there's pending notification data from early click, handle it now that setup is complete.
        if (window._pendingNotificationData) {
            console.log("[Notifications] Found pending notification data from early click. Handling now.");
            const pendingData = window._pendingNotificationData;
            window._pendingNotificationData = null;
            // handleNotificationClick has its own wait-for-app-ready logic
            this.handleNotificationClick(pendingData);
        }
    },

    /**
     * Handle the click action: Navigate to the verse
     * Robust for offline, half-downloaded Bible, and cold-start scenarios.
     */
    async handleNotificationClick(data) {
        console.log("[Notifications] Handling deep link:", data);
        if (!data.chapter || !data.verse) return;

        // Guard against concurrent handling
        if (this._handlingClick) {
            console.warn("[Notifications] Already handling a click, ignoring.");
            return;
        }
        this._handlingClick = true;
        window.isNotificationLaunch = true; // Set flag just in case click fires early

        try {
            // Wait for app to be ready if launched from cold start
            // `window.appStarted` implies the `initApp` function has completely finished loading state overrides
            if (!window.appStarted || typeof window.state === 'undefined' || typeof window.renderChapter !== 'function') {
                console.log("[Notifications] App not ready, waiting...");
                await new Promise(resolve => {
                    let checks = 0;
                    const interval = setInterval(() => {
                        checks++;
                        // Also wait for the bible object to exist so we don't try to navigate a loading structure null
                        if ((window.appStarted && typeof window.state !== 'undefined' && typeof window.renderChapter === 'function') || checks > 40) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 250);
                });
            }

            if (!window.appStarted || typeof window.state === 'undefined' || typeof window.renderChapter !== 'function') {
                console.error("[Notifications] App failed to initialize. Cannot navigate.");
                return;
            }

            // 1. Ensure Bible mode
            window.state.currentBookKey = 'bible';

            // 2. Load Bible for the correct language (with offline safety)
            const lang = data.lang || (window.state && window.state.currentLang) || 'text';
            console.log(`[Notifications] Ensuring Bible is loaded for language: ${lang}`);

            if (window.state.currentLang !== lang) {
                console.log(`[Notifications] Switching language from ${window.state.currentLang} to ${lang}`);
                window.state.currentLang = lang;
                window.state.currentTranslationId = null;

                if (document.getElementById('preferredLangSelector')) {
                    document.getElementById('preferredLangSelector').value = lang;
                }

                const config = (window.BIBLE_CONFIG && window.BIBLE_CONFIG[lang]) || (window.BIBLE_CONFIG && window.BIBLE_CONFIG['text']);
                if (config && config.font) {
                    document.documentElement.style.setProperty('--font-family', config.font);
                } else {
                    document.documentElement.style.setProperty('--font-family', "Georgia, 'Times New Roman', serif");
                }

                if (typeof window.updateRTL === 'function') {
                    window.updateRTL();
                }
            }

            // Try loading Bible data — wrap in try/catch for offline/network errors
            if (typeof window.loadBibleForCurrentLanguage === 'function') {
                try {
                    await window.loadBibleForCurrentLanguage(lang, false);
                } catch (loadErr) {
                    console.warn("[Notifications] Bible load failed (possibly offline):", loadErr);
                    // Continue — we'll use whatever cached data is available
                }
            }

            // 3. Ensure Bible reader UI is always visible (regardless of whether verse is found)
            const bookPageEl = document.getElementById('bookPage');
            const quizEl = document.getElementById('quizContainer');
            const chatEl = document.getElementById('chatContainer');
            const gamesModal = document.getElementById('gamesModal');
            const simPanel = document.getElementById('simPanel');
            const mannaCatch = document.getElementById('mannaCatchContainer');
            const scrollRestorer = document.getElementById('scrollRestorerContainer');
            const settingsPanel = document.getElementById('settingsPanel');
            const sidebar = document.getElementById('sidebar');
            const bookSelector = document.getElementById('bookSelectorSidebar');

            if (bookPageEl) bookPageEl.style.display = 'block';
            if (quizEl) quizEl.style.display = 'none';
            if (chatEl) chatEl.style.display = 'none';
            if (gamesModal) gamesModal.style.display = 'none';
            if (simPanel) simPanel.style.display = 'none';
            if (mannaCatch) mannaCatch.style.display = 'none';
            if (scrollRestorer) scrollRestorer.style.display = 'none';

            if (settingsPanel) settingsPanel.classList.remove('active');
            if (sidebar) sidebar.classList.remove('active');
            if (bookSelector) bookSelector.classList.remove('active');

            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('active');

            const toolbar = document.querySelector('.toolbar');
            if (toolbar) toolbar.style.display = '';
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) progressContainer.style.display = '';

            // 4. Try to find and navigate to the specific verse
            const bookData = window.books && window.books['bible'];
            if (!bookData || !bookData.chapters || bookData.chapters.length === 0) {
                console.warn("[Notifications] No Bible chapters available (offline/not downloaded). Opening Bible home.");
                // Still open Bible view — loadBook handles showing whatever is available
                if (typeof window.loadBook === 'function') {
                    try { await window.loadBook('bible'); } catch (e) { /* ignore */ }
                }
                return;
            }

            const targetChapterNum = parseInt(data.chapter);
            const targetVerseNum = parseInt(data.verse);
            const targetBookId = data.bookId;

            // Primary Matching: Use bookId and chapterNumber
            let chapIndex = -1;
            if (targetBookId) {
                chapIndex = bookData.chapters.findIndex(c =>
                    parseInt(c.chapterNumber) === targetChapterNum &&
                    (c.bookId === targetBookId || c.book_id === targetBookId || c.bookid === targetBookId)
                );
            }

            // Fallback: Try matching by book name
            if (chapIndex === -1 && data.bookName) {
                const targetBookName = data.bookName.toLowerCase();
                chapIndex = bookData.chapters.findIndex(c =>
                    parseInt(c.chapterNumber) === targetChapterNum &&
                    (c.bookName?.toLowerCase() === targetBookName || c.title?.toLowerCase().includes(targetBookName))
                );
            }

            // Last Fallback: Just match by chapter number
            if (chapIndex === -1) {
                chapIndex = bookData.chapters.findIndex(c => parseInt(c.chapterNumber) === targetChapterNum);
            }

            // If chapter still not found (half-downloaded), fallback to first chapter
            if (chapIndex === -1) {
                console.warn(`[Notifications] Chapter ${data.bookName} ${data.chapter} not found (partial download?). Falling back to first chapter.`);
                chapIndex = 0;
            }

            window.state.currentChapterIndex = chapIndex;
            window.state.currentVerseNumber = targetVerseNum;
            console.log(`[Notifications] Navigating to ${data.bookName} ${data.chapter}:${data.verse} (Idx: ${chapIndex})`);
            console.log(`[Notifications] Target Verse Num: ${targetVerseNum}, Type: ${typeof targetVerseNum}`);

            // 5. Render
            try {
                if (typeof window.createBibleNavigationToolbar === 'function') {
                    window.createBibleNavigationToolbar();
                }
                await window.renderChapter();

                // Scroll and highlight with retry logic because DOM rendering can be async
                let attempts = 0;
                const highlightInterval = setInterval(() => {
                    attempts++;
                    // Try to find the verse by standard class/attribute combinations
                    const verseStr = String(data.verse).replace(/^0+/, '');
                    let verseEl = document.querySelector(`.verse[data-verse="${verseStr}"]`);

                    // Fallback to searching data-verseid if data-verse isn't present
                    if (!verseEl) {
                        const numSpan = document.querySelector(`.verse-number[data-verseid="${verseStr}"]`);
                        if (numSpan) verseEl = numSpan.closest('.verse');
                    }

                    if (verseEl) {
                        clearInterval(highlightInterval);
                        console.log(`[Notifications] Found verse element, delegating to highlightVerse for verse: ${data.verse}`);
                        if (typeof window.highlightVerse === 'function') {
                            window.highlightVerse(data.verse);
                        } else {
                            // Manual fallback if highlightVerse is completely missing
                            verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            verseEl.classList.add('highlighted-verse');
                            setTimeout(() => verseEl.classList.remove('highlighted-verse'), 3000);
                        }
                    } else if (attempts > 10) {
                        clearInterval(highlightInterval);
                        console.warn(`[Notifications] Verse ${data.verse} element not found in DOM after 2.5 seconds.`);
                    }
                }, 250);

            } catch (err) {
                console.error("[Notifications] Error during render:", err);
                // Last resort — try loadBook which has its own error handling
                if (typeof window.loadBook === 'function') {
                    try { await window.loadBook('bible'); } catch (e) { /* ignore */ }
                }
            }
        } finally {
            this._handlingClick = false;
            if (typeof window.hideLoading === 'function') {
                window.hideLoading();
            }
        }
    },

    _waitForElement(identifiers, timeout) {
        return new Promise(resolve => {
            // CORRECTED CHECK LOGIC to handle ID vs Selector distinction clearer
            const smartCheck = () => {
                const queries = Array.isArray(identifiers) ? identifiers : [identifiers];
                for (let q of queries) {
                    // 1. Try getElementById (fastest, supports spaces)
                    let el = document.getElementById(q);
                    if (el) return el;

                    // 2. Try querySelector (for data attributes)
                    // Only try if it looks like a CSS selector (starts with . or # or [)
                    if (q.startsWith('.') || q.startsWith('#') || q.startsWith('[')) {
                        el = document.querySelector(q);
                        if (el) return el;
                    }
                }
                return null;
            };

            const found = smartCheck();
            if (found) return resolve(found);

            const interval = 100;
            let elapsed = 0;
            const timer = setInterval(() => {
                const el = smartCheck();
                if (el) {
                    clearInterval(timer);
                    resolve(el);
                }
                elapsed += interval;
                if (elapsed >= timeout) {
                    clearInterval(timer);
                    resolve(null);
                }
            }, interval);
        });
    },

    /**
     * Mock the Cordova plugin using Web Notifications API for browser testing
     */
    _setupBrowserMock() {
        console.log("[Notifications] Setting up Browser Mock...");
        if (typeof cordova === 'undefined') window.cordova = { plugins: {} };
        if (!cordova.plugins) cordova.plugins = {};
        if (!cordova.plugins.notification) cordova.plugins.notification = {};

        cordova.plugins.notification.local = {
            hasPermission: (cb) => {
                cb(Notification.permission === 'granted');
            },
            requestPermission: (cb) => {
                Notification.requestPermission().then(p => cb(p === 'granted'));
            },
            schedule: (notifs) => {
                console.log("[Mock] Scheduling notifications:", notifs);
                const list = Array.isArray(notifs) ? notifs : [notifs];
                list.forEach(n => {
                    const delay = (n.trigger && n.trigger.at) ? n.trigger.at.getTime() - new Date().getTime() : 0;
                    if (delay >= 0) {
                        console.log(`[Mock] Will show notification '${n.title}' in ${delay}ms`);
                        setTimeout(() => {
                            const webNotif = new Notification(n.title, { body: n.text, icon: 'the_eternal_life.png' });
                            webNotif.onclick = () => {
                                console.log("[Mock] Notification clicked!");
                                // Trigger our Click Handler
                                if (this.on && this.listeners['click']) {
                                    this.listeners['click'](n);
                                }
                            };
                        }, delay);
                    }
                });
            },
            cancel: (ids, cb) => {
                console.log("[Mock] Cancelled IDs:", ids);
                if (cb) cb();
            },
            on: (event, cb) => {
                this.listeners = this.listeners || {};
                this.listeners[event] = cb;
            },
            getAll: (cb) => { cb([]); },
            cancelAll: (cb) => { if (cb) cb(); }
        };
        // Mock platformId if needed
        if (!cordova.platformId) cordova.platformId = 'browser';
    },

    async requestPermission() {
        return new Promise((resolve) => {
            if (this.hasPlugin()) {
                cordova.plugins.notification.local.hasPermission((granted) => {
                    if (granted) {
                        resolve(true);
                    } else {
                        cordova.plugins.notification.local.requestPermission((granted) => {
                            resolve(granted);
                        });
                    }
                });
            } else {
                resolve(false);
            }
        });
    },

    /**
     * Check if the plugin is available
     */
    hasPlugin() {
        // Browser check removed, now supported via mock
        return (
            typeof cordova !== 'undefined' &&
            cordova.plugins &&
            cordova.plugins.notification &&
            cordova.plugins.notification.local
        );
    },

    /**
     * Cancel all notifications
     */
    async cancelAll() {
        return new Promise((resolve) => {
            if (!this.hasPlugin()) {
                resolve();
                return;
            }
            cordova.plugins.notification.local.cancelAll(() => {
                console.log("[Notifications] All notifications cancelled.");
                resolve();
            });
        });
    },

    /**
     * Enable notifications (Request permission if needed, then schedule)
     */
    async enable(books, state) {
        if (!this.hasPlugin()) return false;

        console.log("[Notifications] Enabling notifications...");
        const granted = await this.requestPermission();
        if (granted) {
            await this.scheduleDailyVerses(books, state);
            return true;
        } else {
            console.log("[Notifications] Permission denied during enable.");
            return false;
        }
    },

    /**
     * Disable notifications
     */
    async disable() {
        console.log("[Notifications] Disabling notifications...");
        await this.cancelAll();
    },

    async isScheduled() {
        return new Promise((resolve) => {
            if (!this.hasPlugin()) {
                resolve(false);
                return;
            }
            cordova.plugins.notification.local.getAll((notifs) => {
                resolve(notifs.length > 0);
            });
        });
    },

    // ... (previous code)

    /**
     * Generate a notification image with verse text overlay
     * @param {string} text - The verse text
     * @param {string} ref - The verse reference (e.g. John 3:16)
     * @returns {Promise<string>} - Base64 data URL of the image
     */
    async generateNotificationImage(text, ref) {
        return new Promise((resolve) => {
            // 1. Create Canvas
            const canvas = document.createElement('canvas');
            const width = 600; // Optimized width
            const height = 300; // Optimized height
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // 2. Select Background
            // Try to pick a local processed image from notification_images folder
            const pickBackground = async () => {
                // Random pick between 1 and 8 (Standardized names)
                const rand = Math.floor(Math.random() * 8) + 1;
                return `notification_images/bg_${rand}.jpg`;
            };

            pickBackground().then(imageUrl => {
                const img = new Image();
                // REMOVED crossOrigin = "Anonymous" because it fails for local files (file://) on Android
                // img.crossOrigin = "Anonymous"; 

                img.onload = () => {
                    console.log(`[Notifications] Background image loaded successfully: ${imageUrl}`);
                    // Draw Background
                    try {
                        ctx.drawImage(img, 0, 0, width, height);
                        this._drawTextOverlay(ctx, width, height, text, ref, resolve, canvas);
                    } catch (drawErr) {
                        console.error("[Notifications] Error drawing image to canvas:", drawErr);
                        // Fallback to Gradient
                        this._drawGradientFallback(ctx, width, height, text, ref, resolve, canvas);
                    }
                };

                img.onerror = (e) => {
                    console.warn(`[Notifications] Background image load failed for ${imageUrl}:`, e);
                    // Fallback to Gradient
                    this._drawGradientFallback(ctx, width, height, text, ref, resolve, canvas);
                };

                img.src = imageUrl;
            });

            // Timeout safety
            setTimeout(() => {
                // Only resolve null if we haven't already resolved (though Promises handle single resolve fine)
                // diagnosing hangs is easier if we log this timeout
                // console.log("[Notifications] Image generation timed out."); 
                resolve(null);
            }, 5000);
        });
    },

    _drawGradientFallback(ctx, width, height, text, ref, resolve, canvas) {
        console.log("[Notifications] Drawing gradient fallback.");
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#4ca1af');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        this._drawTextOverlay(ctx, width, height, text, ref, resolve, canvas);
    },

    _drawTextOverlay(ctx, width, height, text, ref, resolve, canvas) {
        // Add Dark Overlay for Readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, width, height);

        // Configure Text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";

        // --- Dynamic Font Sizing (Shrink to Fit) ---
        let fontSize = 32;
        const minFontSize = 16;
        const padding = 30;
        const maxTextHeight = height - (padding * 2) - 30; // -30 for reference text
        const maxWidth = width * 0.9;

        let lines = [];
        let lineHeight = 0;

        // Iteratively reduce font size until text fits
        do {
            ctx.font = `bold ${fontSize}px sans-serif`;
            lineHeight = fontSize * 1.3;

            // Calculate wrapping
            lines = this._wrapText(ctx, text, maxWidth);

            const totalTextHeight = lines.length * lineHeight;
            if (totalTextHeight <= maxTextHeight) {
                break; // It fits!
            }
            fontSize -= 2;
        } while (fontSize >= minFontSize);

        // Final Font Setting
        ctx.font = `bold ${fontSize}px sans-serif`;

        // Calculate Vertical Centering
        const totalTextHeight = lines.length * lineHeight;
        const x = width / 2;
        // Start Y is the top of the text block. Center vertically in the available space
        const startY = (height - 30 - totalTextHeight) / 2 + padding / 2;

        ctx.textBaseline = "top"; // Easier for multi-line drawing
        for (let k = 0; k < lines.length; k++) {
            ctx.fillText(lines[k], x, startY + (k * lineHeight));
        }

        // Draw Reference (Bottom Center)
        const refFontSize = Math.max(14, fontSize * 0.7);
        ctx.font = `italic ${refFontSize}px sans-serif`;
        ctx.fillStyle = "#dddddd";
        ctx.textBaseline = "alphabetic"; // Standard baseline for single line
        ctx.fillText(ref, x, height - 20);

        // Resolve
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Try attempting to save to file first (Better for Android)
            this._saveBase64ToFile(dataUrl, `verse_${Date.now()}.jpg`)
                .then(fileUri => {
                    console.log(`[Notifications] Image saved to file: ${fileUri}`);
                    resolve(fileUri);
                })
                .catch(err => {
                    console.warn("[Notifications] File save failed, falling back to base64:", err);
                    // Fallback to base64:// protocol
                    const base64Data = dataUrl.split(',')[1];
                    const base64Uri = `base64://${base64Data}`;
                    resolve(base64Uri);
                });
        } catch (e) {
            console.error("Canvas toDataURL failed:", e);
            resolve(null);
        }
    },

    /**
     * Helper to wrap text into lines based on max width
     */
    _wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        return lines;
    },

    /**
     * Helper: Save Base64 string to a file in the 'shared_files' directory for plugin compatibility
     * Returns a Promise that resolves to the 'shared://' URI
     */
    _saveBase64ToFile(base64Data, fileName) {
        return new Promise((resolve, reject) => {
            const contentType = base64Data.split(',')[0].split(':')[1].split(';')[0];
            const realData = base64Data.split(',')[1];
            const blob = this._b64toBlob(realData, contentType);

            // Use 'shared_files' directory which maps to 'shared://' in the plugin
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function (dirEntry) {
                dirEntry.getDirectory('shared_files', { create: true }, function (sharedDirEntry) {
                    sharedDirEntry.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function () {
                                console.log("[Notifications] Image saved to shared folder: " + fileName);
                                // Return the special URI format supported by the plugin
                                resolve(`shared://${fileName}`);
                            };
                            fileWriter.onerror = function (e) {
                                console.error("[Notifications] Failed to write to file:", e);
                                reject(e);
                            };
                            fileWriter.write(blob);
                        });
                    }, (err) => {
                        console.error("[Notifications] Error getting file:", err);
                        reject(err);
                    });
                }, (err) => {
                    console.error("[Notifications] Error getting shared_files directory:", err);
                    reject(err);
                });
            }, (err) => {
                console.error("[Notifications] Error resolving dataDirectory:", err);
                reject(err);
            });
        });
    },
    /**
     * Helper to convert Base64 to Blob
     */
    _b64toBlob(b64Data, contentType, sliceSize = 512) {
        contentType = contentType || '';
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    },

    async scheduleDailyVerses(books, state) {
        if (!this.hasPlugin()) return;

        // Guard against duplicate concurrent scheduling
        if (this._isScheduling) {
            console.log('[Notifications] Scheduling already in progress, queuing duplicate call.');
            this._pendingScheduleRequest = { books, state };
            return;
        }
        this._isScheduling = true;

        const timeSetting = state.notificationTime || '08:00';
        console.log(`[Notifications] ScheduleDailyVerses called. Time: ${timeSetting}`);

        // CANCEL PREVIOUS NOTIFICATIONS to prevent duplicates/collisions
        // We use IDs 999 (generic repeating) and 1000-1035 (daily verses)
        const idsToCancel = [999];
        // Cancel a generous range to be safe
        for (let i = 0; i < 40; i++) idsToCancel.push(1000 + i);

        try {
            await new Promise((resolve) => {
                cordova.plugins.notification.local.cancel(idsToCancel, async () => {
                    console.log("[Notifications] Previous notifications cancelled. Proceeding to schedule.");
                    // Continue after cancellation
                    await this._doSchedule(books, state);
                    resolve();
                });
            });
        } catch (err) {
            console.error('[Notifications] Error during scheduling:', err);
        } finally {
            this._isScheduling = false;
            if (this._pendingScheduleRequest) {
                const req = this._pendingScheduleRequest;
                this._pendingScheduleRequest = null;
                console.log('[Notifications] Executing queued schedule request.');
                this.scheduleDailyVerses(req.books, req.state);
            }
        }
    },

    async _doSchedule(books, state) {
        console.log("[Notifications] Starting scheduling process...");
        // Schedule for 7 days to ensure coverage without overwhelming storage/queue
        const SCHEDULE_DAYS = 7;
        let verses = [];

        try {
            // 1. Try to get verses from currently loaded book object (Local/Offline)
            if (books['bible'] && books['bible'].chapters && books['bible'].chapters.length > 0) {
                console.log("[Notifications] Getting verses from loaded book...");
                verses = this.getRandomVersesFromLoadedBook(books['bible'], SCHEDULE_DAYS);
                console.log(`[Notifications] Got ${verses.length} verses from loaded book.`);
            } else {
                console.log("[Notifications] Bible not loaded locally, will try API...");
            }

            // 2. If locally loaded book didn't give enough verses, try API with timeout
            if (verses.length < SCHEDULE_DAYS && navigator.onLine && typeof api !== 'undefined') {
                console.log("[Notifications] Fetching verses for notifications from API...");
                try {
                    // Add 30s timeout to prevent hanging forever
                    const apiPromise = this.fetchRandomVersesFromApi(books['bible'], SCHEDULE_DAYS - verses.length, state);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('API verse fetch timed out after 30s')), 30000)
                    );
                    const apiVerses = await Promise.race([apiPromise, timeoutPromise]);
                    verses = [...verses, ...apiVerses];
                    console.log(`[Notifications] Got ${apiVerses.length} verses from API. Total: ${verses.length}`);
                } catch (e) {
                    console.warn("[Notifications] Failed to fetch API verses:", e.message || e);
                }
            }

            const baseTime = new Date();
            const timeStr = (state && state.notificationTime) ? state.notificationTime : '08:00';
            console.log(`[Notifications] Scheduling time preference: ${timeStr}`);

            const [hours, minutes] = timeStr.split(':').map(Number);
            baseTime.setHours(hours, minutes, 0, 0);

            // If it's already past the time today, start tomorrow
            if (new Date() > baseTime) {
                console.log("[Notifications] Time passed for today, starting tomorrow.");
                baseTime.setDate(baseTime.getDate() + 1);
            }

            console.log(`[Notifications] First trigger time: ${baseTime.toLocaleString()}`);

            if (verses.length > 0) {
                // IMMEDIATELY schedule fallback overlapping notifications
                // This guarantees the user has notifications even if they swipe away the app during image generation
                const genericDate = new Date();
                genericDate.setDate(genericDate.getDate() + 1);
                genericDate.setHours(hours, minutes, 0, 0);

                const fallbackDate = new Date(baseTime);
                fallbackDate.setDate(fallbackDate.getDate() + verses.length);

                cordova.plugins.notification.local.schedule([
                    {
                        id: 999,
                        title: state.currentLang === 'text_odia' ? 'ପ୍ରଭୁଙ୍କ ବାକ୍ୟ ପଢନ୍ତୁ' : 'Daily Bible Verse',
                        text: state.currentLang === 'text_odia' ? 'ଆଜି ବାଇବଲ ପଢିବାକୁ ସମୟ ନିଅନ୍ତୁ।' : 'Take a moment to read God\'s Word today.',
                        trigger: { firstAt: fallbackDate, every: 'day' },
                        androidWakeUpScreen: true,
                        androidChannelImportance: 2,
                        androidAllowWhileIdle: true,
                        androidSmallIcon: 'res://icon'
                    },
                    {
                        id: 998,
                        title: state.currentLang === 'text_odia' ? 'ପ୍ରଭୁଙ୍କ ବାକ୍ୟ ପଢନ୍ତୁ' : 'Daily Bible Verse',
                        text: state.currentLang === 'text_odia' ? 'ଆଜି ବାଇବଲ ପଢିବାକୁ ସମୟ ନିଅନ୍ତୁ।' : 'Take a moment to read God\'s Word today.',
                        trigger: { firstAt: genericDate, every: 'day' },
                        androidWakeUpScreen: true,
                        androidChannelImportance: 3,
                        androidAllowWhileIdle: true,
                        androidSmallIcon: 'res://icon'
                    }
                ]);

                // Schedule specific verses with Generated Images progressively
                let scheduledCount = 2; // Starts at 2 because of fallbacks

                for (let index = 0; index < verses.length; index++) {
                    const v = verses[index];
                    const triggerDate = new Date(baseTime);
                    triggerDate.setDate(triggerDate.getDate() + index);

                    // Generate Image for this verse
                    console.log(`[Notifications] Generating image for verse ${index + 1}...`);
                    const pictureData = await this.generateNotificationImage(v.text, v.ref);

                    const refToUse = v.localizedRef || v.ref;
                    const noteTitle = state.currentLang === 'text_odia' ? `ଦୈନିକ ପଦ: ${refToUse}` : `Daily Verse: ${refToUse}`;

                    const note = {
                        id: 1000 + index,
                        title: noteTitle,
                        text: v.text,
                        trigger: { at: triggerDate },
                        androidWakeUpScreen: true,
                        androidChannelImportance: 4,
                        androidAllowWhileIdle: true,
                        androidSmallIcon: 'res://icon',
                        androidSummary: state.currentLang === 'text_odia' ? `ଆପଣଙ୍କର ଦୈନିକ ବାଇବଲ ପଦ` : `Your Daily Bible Verse`,
                        data: {
                            date: triggerDate.toISOString(),
                            target: 'verse',
                            bookName: v.bookName,
                            bookId: v.bookId,
                            chapter: v.chapter,
                            verse: v.verse,
                            lang: state.currentLang
                        }
                    };

                    if (typeof cordova !== 'undefined' && cordova.platformId === 'ios') {
                        note.iOSForeground = true;
                    }

                    if (pictureData) {
                        note.attachments = [pictureData];
                        note.androidLargeIcon = pictureData;
                    }

                    // Schedule immediately in loop so it survives rapid app closure
                    cordova.plugins.notification.local.schedule(note);
                    scheduledCount++;
                }

                console.log(`[Notifications] Scheduled ${scheduledCount} notifications (including fallbacks).`);
            } else {
                // Schedule generic repeating notification if NO verses could be found at all
                console.log("No verses available, scheduling generic notification.");

                cordova.plugins.notification.local.schedule({
                    id: 999,
                    title: 'Daily Verse',
                    text: 'Take a moment to read God\'s Word today.',
                    trigger: { every: 'day', firstAt: baseTime },
                    androidWakeUpScreen: true,
                    androidAllowWhileIdle: true,
                    androidChannelImportance: 2
                });
            }
        } catch (scheduleError) {
            console.error('[Notifications] Error in _doSchedule:', scheduleError);
        }
        console.log('[Notifications] _doSchedule completed.');
    },

    /**
     * Pick random verses from the FULLY LOADED bible object
     */
    getRandomVersesFromLoadedBook(bible, count) {
        const results = [];
        const chapters = bible.chapters;
        if (!chapters || chapters.length === 0) return [];

        // Check if chapters actually have verses
        // If the first few chapters don't have verses, we assume it's just a book list (Online Mode)
        const hasContent = chapters.some(c => c.verses && c.verses.length > 0);
        if (!hasContent) return [];

        for (let i = 0; i < count; i++) {
            // Pick random chapter
            const randomChapIndex = Math.floor(Math.random() * chapters.length);
            const chapter = chapters[randomChapIndex];

            if (chapter.verses && chapter.verses.length > 0) {
                // Pick random verse
                const randomVerseIndex = Math.floor(Math.random() * chapter.verses.length);
                const verse = chapter.verses[randomVerseIndex];

                // Clean text
                let text = verse.text.replace(/<[^>]*>/g, '').trim();

                // Extract verse number from ID or verseId property
                let verseNum = verse.verseId || (randomVerseIndex + 1);
                // Also parsing ID "Genesis 1:1" -> 1 if needed fallback
                if (!verseNum) {
                    const parts = verse.id.split(':');
                    if (parts.length > 1) verseNum = parseInt(parts[1]);
                }

                const localizedBookName = chapter.displayBookName || chapter.bookName || chapter.title.split(' - ')[0];

                results.push({
                    text: text,
                    ref: `${chapter.bookName} ${chapter.chapterNumber}:${verseNum}`,
                    localizedRef: `${localizedBookName} ${chapter.chapterNumber}:${verseNum}`,
                    bookName: chapter.bookName,
                    bookId: chapter.bookId || chapter.book_id,
                    chapter: chapter.chapterNumber,
                    verse: verseNum
                });
            }
        }
        return results;
    },

    async fetchRandomVersesFromApi(bible, count, state) {
        if (!bible || !bible.chapters) return [];
        const results = [];
        let translationId = state.currentTranslationId || 'YLT'; // Default fallback
        const langKey = state.currentLang || 'text';
        let sourceType = 'BOLLS'; // Default

        // Determine correct source from config if available
        if (this.config && this.config[langKey]) {
            const conf = this.config[langKey];
            if (conf.sources) {
                // Find source matching current ID or default to first
                const sourceDef = conf.sources.find(s => (s.id || s.lang) === translationId) || conf.sources[0];
                if (sourceDef) {
                    sourceType = sourceDef.type;
                    // FIX: For LOCAL_BIBLE, use 'path' as the ID. For others use id/lang.
                    translationId = sourceDef.id || sourceDef.lang || sourceDef.path || translationId;
                }
            }
        }

        // Limit attempts to prevent infinite loop
        let attempts = 0;
        const maxAttempts = count * 2;


        // If no chapters loaded (Lazy loading / Online mode), fetch book list first
        if (!bible.chapters || bible.chapters.length === 0) {
            // console.log("[Notifications] No chapters loaded. Fetching book list...");
            try {
                const booksList = await api.getBooks(translationId, sourceType);
                if (booksList && booksList.length > 0) {
                    // Determine number of attempts based on count
                    while (results.length < count && attempts < maxAttempts) {
                        attempts++;
                        const randBookIdx = Math.floor(Math.random() * booksList.length);
                        const book = booksList[randBookIdx];

                        // book structure from api.getBooks: { bookid, name, chapters(count) }
                        // OR { id, name, numberOfChapters } depending on source normalization in api.js
                        // api.getBooks normalizes to { bookid, name, chapters }

                        const chapterCount = book.chapters || 1;
                        const randChapter = Math.floor(Math.random() * chapterCount) + 1;

                        try {
                            // Add a small delay to prevent hammering BOLLS API and causing network block
                            if (attempts > 1) {
                                await new Promise(r => setTimeout(r, 400));
                            }
                            // Pass generic book ID - api.getChapter handles int/string conversion if needed
                            const verses = await api.getChapter(translationId, book.bookid, randChapter, sourceType);

                            if (verses && verses.length > 0) {
                                const needed = count - results.length;
                                const toTake = Math.min(needed, Math.min(10, verses.length));
                                const shuffled = [...verses].sort(() => 0.5 - Math.random());

                                for (let i = 0; i < toTake; i++) {
                                    const rV = shuffled[i];
                                    if (rV && rV.text) {
                                        const txt = rV.text.replace(/<[^>]*>/g, '').trim();
                                        if (txt) {
                                            results.push({
                                                text: txt,
                                                ref: `${book.name} ${randChapter}:${rV.verse}`,
                                                localizedRef: `${book.name} ${randChapter}:${rV.verse}`,
                                                bookName: book.name,
                                                bookId: book.bookid,
                                                chapter: randChapter,
                                                verse: rV.verse
                                            });
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn("[Notifications] Failed to fetch specific chapter:", err);
                        }
                    }
                    return results;
                }
            } catch (e) {
                console.error("[Notifications] Failed to fetch book list:", e);
            }
        }

        while (results.length < count && attempts < maxAttempts) {
            attempts++;
            // Pick random book/chapter
            // structure: bible.chapters might be objects with { name, bookid, chapters(count) } 

            if (bible.chapters.length === 0) break;
            const randIdx = Math.floor(Math.random() * bible.chapters.length);
            const chapInfo = bible.chapters[randIdx];

            if (chapInfo && (chapInfo.bookId || chapInfo.book_id)) {
                const bId = chapInfo.bookId || chapInfo.book_id;
                const cId = chapInfo.chapter || chapInfo.chapterNumber || 1;

                try {
                    const verses = await api.getChapter(translationId, bId, cId, sourceType);
                    if (verses && verses.length > 0) {
                        const needed = count - results.length;
                        const toTake = Math.min(needed, Math.min(10, verses.length));
                        const shuffled = [...verses].sort(() => 0.5 - Math.random());

                        for (let i = 0; i < toTake; i++) {
                            const rV = shuffled[i];
                            if (rV && rV.text) {
                                // Remove tags
                                const txt = rV.text.replace(/<[^>]*>/g, '').trim();
                                if (txt) {
                                    results.push({
                                        text: txt,
                                        ref: `${chapInfo.title}:${rV.verse}`,
                                        localizedRef: `${chapInfo.title}:${rV.verse}`, // Ensure localizedRef exists
                                        bookName: chapInfo.bookName || chapInfo.title, // Fallback title
                                        bookId: bId,
                                        chapter: cId,
                                        verse: rV.verse
                                    });
                                }
                            }
                        }
                    }
                } catch (e) {
                    // ignore
                }
            } else {
                // Fallback to generic if structure unpredictable
                break;
            }
        }

        return results;
    },

    async testNotification() {
        console.log("[Notifications] Triggering TEST notification in 5 seconds...");
        if (!this.hasPlugin()) {
            alert("Notification plugin is NOT available/detected!");
            return;
        }

        const now = new Date();
        const triggerDate = new Date(now.getTime() + 5000); // 5 seconds from now

        // 1. Get a Real Verse (Localized)
        let testText = "For God so loved the world...";
        let testRef = "John 3:16";
        let bookName = "John";
        let chapter = 3;
        let verse = 16;
        let bookId = null;

        // Try to pull a random verse from the active bible to match language
        if (window.books && window.books['bible']) {
            const verseData = this.getRandomVersesFromLoadedBook(window.books['bible'], 1)[0];
            if (verseData) {
                testText = verseData.text;
                testRef = verseData.localizedRef || verseData.ref;
                bookName = verseData.bookName;
                chapter = verseData.chapter;
                verse = verseData.verse;
                bookId = verseData.bookId;
            }
        }

        // Generate a test image
        console.log("[TEST] Generating notification image...");
        const pictureData = await this.generateNotificationImage(testText, testRef);
        console.log("[TEST] Generated image data:", pictureData ? pictureData.substring(0, 100) + "..." : "NULL");

        const isOdia = window.state && window.state.currentLang === 'text_odia';
        const noteTitle = isOdia ? `ଦୈନିକ ପଦ: ${testRef}` : `Daily Verse: ${testRef}`;
        const noteSummary = isOdia ? `ଆପଣଙ୍କର ଦୈନିକ ବାଇବଲ ପଦ` : `Your Daily Bible Verse`;

        const note = {
            id: 12345,
            title: noteTitle,
            text: testText,
            trigger: { at: triggerDate },

            // Modern keys
            androidWakeUpScreen: true,
            androidChannelImportance: 4,
            androidSmallIcon: 'res://icon',
            androidSummary: noteSummary,

            data: {
                target: 'verse',
                bookName: bookName,
                bookId: bookId,
                chapter: chapter,
                verse: verse,
                lang: window.state && window.state.currentLang ? window.state.currentLang : 'text'
            }
        };

        if (pictureData) {
            console.log("[TEST] Attaching image to notification...");
            // Plugin 1.2.3: attachments array is all we need
            note.attachments = [pictureData];
        } else {
            console.warn("[TEST] No image data generated!");
        }

        console.log("[TEST] Scheduling notification:", note);
        cordova.plugins.notification.local.schedule(note);

        alert(`Test scheduled for 5s.\nImage: ${pictureData ? 'YES (' + pictureData.substring(0, 20) + '...)' : 'NO'}\nRef: ${testRef}`);
    },

    /**
     * Simple static image test using existing image file
     */
    async testStaticImage() {
        console.log("[STATIC TEST] Starting static image test...");
        if (!this.hasPlugin()) {
            alert("Notification plugin not available.");
            return;
        }

        const triggerDate = new Date(Date.now() + 5000);

        // Try different image path formats
        const imagePath = 'file:///android_asset/www/the_eternal_life.png';
        console.log("[STATIC TEST] Using image path:", imagePath);

        const note = {
            id: 12346,
            title: 'Static Image Test',
            text: 'Testing with pre-existing image',
            trigger: { at: triggerDate },
            androidWakeUpScreen: true,
            androidChannelImportance: 4,
            androidSmallIcon: 'res://icon',
            // Plugin 1.2.3: attachments automatically become BigPicture
            attachments: [imagePath]
        };

        console.log("[STATIC TEST] Scheduling:", note);
        cordova.plugins.notification.local.schedule(note);
        alert(`Static image test scheduled!\nPath: ${imagePath}`);
    },

    /**
     * Test with web URL to verify plugin can display ANY image
     */
    testWebImage() {
        console.log("[WEB TEST] Testing with online image...");
        if (!this.hasPlugin()) {
            alert("Notification plugin not available.");
            return;
        }

        const triggerDate = new Date(Date.now() + 5000);
        const webImageUrl = 'https://picsum.photos/600/300'; // Random image service

        const note = {
            id: 12347,
            title: 'Web Image Test',
            text: 'Testing with online image URL',
            trigger: { at: triggerDate },
            androidWakeUpScreen: true,
            androidChannelImportance: 4,
            androidSmallIcon: 'res://icon',
            attachments: [webImageUrl]
        };

        console.log("[WEB TEST] Scheduling:", note);
        cordova.plugins.notification.local.schedule(note);
        alert(`Web image test scheduled!\nURL: ${webImageUrl}`);
    },

    /**
     * Test saving image to external storage
     */
    async testExternalStorage() {
        console.log("[EXTERNAL TEST] Testing external storage...");
        if (!this.hasPlugin()) {
            alert("Notification plugin not available.");
            return;
        }

        // Generate test image
        const testText = "For God so loved the world...";
        const testRef = "John 3:16";

        console.log("[EXTERNAL TEST] Generating image...");
        const dataUrl = await this.generateNotificationImage(testText, testRef);

        if (!dataUrl) {
            alert("Failed to generate image!");
            return;
        }

        // Save to external storage
        const fileName = `test_external_${Date.now()}.jpg`;
        console.log("[EXTERNAL TEST] Saving to external storage...");

        return new Promise((resolve, reject) => {
            const externalDir = cordova.file.externalDataDirectory || cordova.file.externalCacheDirectory;
            console.log("[EXTERNAL TEST] Using directory:", externalDir);

            window.resolveLocalFileSystemURL(externalDir, (dirEntry) => {
                dirEntry.getFile(fileName, { create: true }, (fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            const fileUri = fileEntry.toURL();
                            console.log("[EXTERNAL TEST] Saved to:", fileUri);

                            // Schedule notification
                            const triggerDate = new Date(Date.now() + 5000);
                            const note = {
                                id: 12348,
                                title: 'External Storage Test',
                                text: testText,
                                trigger: { at: triggerDate },
                                androidWakeUpScreen: true,
                                androidChannelImportance: 4,
                                androidSmallIcon: 'res://icon',
                                attachments: [fileUri]
                            };

                            cordova.plugins.notification.local.schedule(note);
                            alert(`External storage test scheduled!\nPath: ${fileUri.substring(0, 50)}...`);
                            resolve();
                        };
                        fileWriter.onerror = (e) => {
                            console.error("[EXTERNAL TEST] Write failed:", e);
                            alert("Failed to write file!");
                            reject(e);
                        };

                        const block = dataUrl.split(";");
                        const contentType = block[0].split(":")[1];
                        const realData = block[1].split(",")[1];
                        const blob = this._b64toBlob(realData, contentType);
                        fileWriter.write(blob);
                    });
                }, reject);
            }, reject);
        });
    },

    /**
     * Alias for scheduleDailyVerses to support existing calls
     */
    reschedule(books, state) {
        return this.scheduleDailyVerses(books, state);
    }
};

// Make it available globally
window.Notifications = Notifications;
