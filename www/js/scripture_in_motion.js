/**
 * Scripture in Motion — UI Logic
 * ================================
 * Handles the verse picker, video list, and inline player screens.
 * Depends on ScriptureInMotion from verse_videos_loader.js
 */

(function () {
    'use strict';

    // ── State ───────────────────────────────────────────────────────────────────
    let _simReady = false;
    let _currentBook = { id: '', name: '' };
    let _currentChapter = '';
    let _currentVerse = '';

    // Bible book list with max chapters (standard Protestant canon)
    const BIBLE_BOOKS = [
        { id: 'GEN', name: 'Genesis', chapters: 50 }, { id: 'EXO', name: 'Exodus', chapters: 40 },
        { id: 'LEV', name: 'Leviticus', chapters: 27 }, { id: 'NUM', name: 'Numbers', chapters: 36 },
        { id: 'DEU', name: 'Deuteronomy', chapters: 34 }, { id: 'JOS', name: 'Joshua', chapters: 24 },
        { id: 'JDG', name: 'Judges', chapters: 21 }, { id: 'RUT', name: 'Ruth', chapters: 4 },
        { id: '1SA', name: '1 Samuel', chapters: 31 }, { id: '2SA', name: '2 Samuel', chapters: 24 },
        { id: '1KI', name: '1 Kings', chapters: 22 }, { id: '2KI', name: '2 Kings', chapters: 25 },
        { id: '1CH', name: '1 Chronicles', chapters: 29 }, { id: '2CH', name: '2 Chronicles', chapters: 36 },
        { id: 'EZR', name: 'Ezra', chapters: 10 }, { id: 'NEH', name: 'Nehemiah', chapters: 13 },
        { id: 'EST', name: 'Esther', chapters: 10 }, { id: 'JOB', name: 'Job', chapters: 42 },
        { id: 'PSA', name: 'Psalms', chapters: 150 }, { id: 'PRO', name: 'Proverbs', chapters: 31 },
        { id: 'ECC', name: 'Ecclesiastes', chapters: 12 }, { id: 'SNG', name: 'Song of Solomon', chapters: 8 },
        { id: 'ISA', name: 'Isaiah', chapters: 66 }, { id: 'JER', name: 'Jeremiah', chapters: 52 },
        { id: 'LAM', name: 'Lamentations', chapters: 5 }, { id: 'EZK', name: 'Ezekiel', chapters: 48 },
        { id: 'DAN', name: 'Daniel', chapters: 12 }, { id: 'HOS', name: 'Hosea', chapters: 14 },
        { id: 'JOL', name: 'Joel', chapters: 3 }, { id: 'AMO', name: 'Amos', chapters: 9 },
        { id: 'OBA', name: 'Obadiah', chapters: 1 }, { id: 'JON', name: 'Jonah', chapters: 4 },
        { id: 'MIC', name: 'Micah', chapters: 7 }, { id: 'NAM', name: 'Nahum', chapters: 3 },
        { id: 'HAB', name: 'Habakkuk', chapters: 3 }, { id: 'ZEP', name: 'Zephaniah', chapters: 3 },
        { id: 'HAG', name: 'Haggai', chapters: 2 }, { id: 'ZEC', name: 'Zechariah', chapters: 14 },
        { id: 'MAL', name: 'Malachi', chapters: 4 },
        { id: 'MAT', name: 'Matthew', chapters: 28 }, { id: 'MRK', name: 'Mark', chapters: 16 },
        { id: 'LUK', name: 'Luke', chapters: 24 }, { id: 'JHN', name: 'John', chapters: 21 },
        { id: 'ACT', name: 'Acts', chapters: 28 }, { id: 'ROM', name: 'Romans', chapters: 16 },
        { id: '1CO', name: '1 Corinthians', chapters: 16 }, { id: '2CO', name: '2 Corinthians', chapters: 13 },
        { id: 'GAL', name: 'Galatians', chapters: 6 }, { id: 'EPH', name: 'Ephesians', chapters: 6 },
        { id: 'PHP', name: 'Philippians', chapters: 4 }, { id: 'COL', name: 'Colossians', chapters: 4 },
        { id: '1TH', name: '1 Thessalonians', chapters: 5 }, { id: '2TH', name: '2 Thessalonians', chapters: 3 },
        { id: '1TI', name: '1 Timothy', chapters: 6 }, { id: '2TI', name: '2 Timothy', chapters: 4 },
        { id: 'TIT', name: 'Titus', chapters: 3 }, { id: 'PHM', name: 'Philemon', chapters: 1 },
        { id: 'HEB', name: 'Hebrews', chapters: 13 }, { id: 'JAM', name: 'James', chapters: 5 },
        { id: '1PE', name: '1 Peter', chapters: 5 }, { id: '2PE', name: '2 Peter', chapters: 3 },
        { id: '1JN', name: '1 John', chapters: 5 }, { id: '2JN', name: '2 John', chapters: 1 },
        { id: '3JN', name: '3 John', chapters: 1 }, { id: 'JUD', name: 'Jude', chapters: 1 },
        { id: 'REV', name: 'Revelation', chapters: 22 },
    ];

    const VERSE_COUNTS = {
        'GEN': [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26],
        'EXO': [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38],
        'PSA': [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 13, 25, 11, 22, 23, 28, 13, 40, 23, 14, 18, 14, 12, 5, 27, 18, 12, 10, 15, 21, 23, 21, 11, 7, 9, 24, 13, 12, 8, 8, 9, 7, 5, 1, 10, 8, 9, 12, 6, 11, 6, 10, 24, 11, 9, 14, 25, 4, 8, 7, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50],
        'PRO': [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 62, 44],
        'JHN': [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
        'MAT': [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20],
        'REV': [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21],
    };

    function getVerseCount(bookId, chapter) {
        const counts = VERSE_COUNTS[bookId];
        if (counts && counts[chapter - 1] && counts[chapter - 1] > 0) return counts[chapter - 1];
        return 30;
    }

    // ── DOM helpers ─────────────────────────────────────────────────────────────
    function el(id) { return document.getElementById(id); }

    function showScreen(screenId) {
        ['simScreenPicker', 'simScreenList'].forEach(id => {
            el(id).style.display = id === screenId ? 'flex' : 'none';
        });
    }

    // ── Open / Close ────────────────────────────────────────────────────────────
    window.openScriptureInMotion = function () {
        el('simPanel').style.display = 'flex';
        showScreen('simScreenPicker');

        if (!_simReady && typeof ScriptureInMotion !== 'undefined') {
            ScriptureInMotion.init().then(() => { _simReady = true; });
        }

        const bookSel = el('simBookSelect');
        if (bookSel.options.length <= 1) {
            BIBLE_BOOKS.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = b.name;
                bookSel.appendChild(opt);
            });
        }

        bookSel.value = '';
        el('simChapterSelect').innerHTML = '<option value="">— Choose a Chapter —</option>';
        el('simChapterSelect').disabled = true;
        el('simVerseSelect').innerHTML = '<option value="">— Choose a Verse —</option>';
        el('simVerseSelect').disabled = true;
        el('simFindBtn').disabled = true;
        _currentBook = { id: '', name: '' };
        _currentChapter = '';
        _currentVerse = '';
    };

    window.closeScriptureInMotion = function () {
        el('simPanel').style.display = 'none';
        el('simYoutubeFrame').src = '';
    };

    window.simGoBack = function (to) {
        if (to === 'picker') { showScreen('simScreenPicker'); }
        if (to === 'list') {
            el('simYoutubeFrame').src = '';
            showScreen('simScreenList');
        }
    };

    // ── Picker cascade ──────────────────────────────────────────────────────────
    window.simOnBookChange = function (bookId, bookName) {
        _currentBook = { id: bookId, name: bookName };
        _currentChapter = '';
        _currentVerse = '';

        const chapSel = el('simChapterSelect');
        const verseSel = el('simVerseSelect');

        chapSel.innerHTML = '<option value="">— Choose a Chapter —</option>';
        verseSel.innerHTML = '<option value="">— Choose a Verse —</option>';
        verseSel.disabled = true;
        el('simFindBtn').disabled = true;

        if (!bookId) { chapSel.disabled = true; return; }

        const book = BIBLE_BOOKS.find(b => b.id === bookId);
        if (!book) { chapSel.disabled = true; return; }

        for (let c = 1; c <= book.chapters; c++) {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = 'Chapter ' + c;
            chapSel.appendChild(opt);
        }
        chapSel.disabled = false;
        chapSel.value = '';
    };

    window.simOnChapterChange = function (chapter) {
        _currentChapter = chapter;
        _currentVerse = '';

        const verseSel = el('simVerseSelect');
        verseSel.innerHTML = '<option value="">— Choose a Verse —</option>';
        el('simFindBtn').disabled = true;

        if (!chapter) { verseSel.disabled = true; return; }

        const count = getVerseCount(_currentBook.id, parseInt(chapter));
        for (let v = 1; v <= count; v++) {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = 'Verse ' + v;
            verseSel.appendChild(opt);
        }
        verseSel.disabled = false;
        verseSel.value = '';

        verseSel.onchange = function () {
            _currentVerse = this.value;
            el('simFindBtn').disabled = !this.value;
        };
    };

    // ── Find Videos ─────────────────────────────────────────────────────────────
    window.simFindVideos = async function () {
        if (!_currentBook.id || !_currentChapter || !_currentVerse) return;

        el('simListTitle').textContent = _currentBook.name + ' ' + _currentChapter + ':' + _currentVerse;
        el('simFallbackBanner').style.display = 'none';
        el('simLoadingState').style.display = 'flex';
        el('simVideoList').innerHTML = '';
        el('simVideoList').style.display = 'none';
        el('simEmptyState').style.display = 'none';
        showScreen('simScreenList');

        let result;
        if (typeof ScriptureInMotion !== 'undefined') {
            result = await ScriptureInMotion.getVideosForVerse(
                _currentBook.id,
                _currentBook.name,
                parseInt(_currentChapter),
                parseInt(_currentVerse)
            );
        } else {
            result = { videos: [], isEmpty: true };
        }

        el('simLoadingState').style.display = 'none';

        if (result.isEmpty || result.videos.length === 0) {
            el('simEmptyState').style.display = 'flex';
            return;
        }

        if (result.fallback && result.scope === 'chapter') {
            el('simFallbackBanner').style.display = 'block';
        }

        el('simVideoList').style.display = 'flex';
        result.videos.forEach((vid, idx) => {
            const card = document.createElement('div');
            card.className = 'sim-video-card';
            card.style.animationDelay = (idx * 0.06) + 's';

            const thumbHtml = vid.thumbnail_url
                ? `<img class="sim-card-thumb" src="${vid.thumbnail_url}" alt="thumb" onerror="this.style.display='none'">`
                : `<div class="sim-card-thumb-placeholder">🎬</div>`;

            card.innerHTML = `
                ${thumbHtml}
                <div class="sim-card-info">
                    <div class="sim-card-title">${_escHtml(vid.title)}</div>
                    <div class="sim-card-meta">
                        <span class="sim-yt-badge">YT</span>
                        ${_escHtml(vid.source_channel || 'YouTube')}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => {
                const videoId = vid.id || (vid.video_url || '')
                    .replace('https://www.youtube.com/embed/', '').split('?')[0];
                const watchUrl = videoId
                    ? 'https://www.youtube.com/watch?v=' + videoId
                    : (vid.video_url || '');
                simOpenOnYouTube(watchUrl);
            });
            el('simVideoList').appendChild(card);
        });
    };

    // Opens the video natively in the YouTube app
    window.simOpenOnYouTube = function (url) {
        if (window.cordova && cordova.InAppBrowser) {
            cordova.InAppBrowser.open(url, '_system');
        } else {
            window.open(url, '_system');
        }
    };
    // ── Utility ──────────────────────────────────────────────────────────────────
    function _escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();
