/**
 * ====================================================================
 * Universal Natural Text-to-Speech (TTS) Engine for All 57 Languages
 * Hybrid Architecture:
 *   1. Local Web Speech API (Instant & Offline for device-installed voices)
 *   2. Vercel Serverless Meta MMS Neural Audio Proxy (/api/tts) for All 57 Languages (Odia, Dogri, Sanskrit, Assamese, etc.)
 * ====================================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentAudio = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;
    let audioQueue = [];
    let currentQueueIndex = 0;
    let isStopped = false;

    // Mapping for All 57 Languages in Eternal Life App
    const ALL_LANGUAGES_CONFIG = {
        'text':            { lang: 'en-US', mms: 'eng', label: 'English' },
        'text_arabic':     { lang: 'ar-SA', mms: 'ara', label: 'Arabic' },
        'text_assamese':   { lang: 'as-IN', mms: 'asm', label: 'Assamese' },
        'text_bengali':    { lang: 'bn-IN', mms: 'ben', label: 'Bengali' },
        'text_burmese':    { lang: 'my-MM', mms: 'mya', label: 'Burmese' },
        'text_chinese':    { lang: 'zh-CN', mms: 'cmn', label: 'Chinese' },
        'text_czech':      { lang: 'cs-CZ', mms: 'ces', label: 'Czech' },
        'text_dogri':      { lang: 'doi-IN', mms: 'dgo', label: 'Dogri' },
        'text_dutch':      { lang: 'nl-NL', mms: 'nld', label: 'Dutch' },
        'text_french':     { lang: 'fr-FR', mms: 'fra', label: 'French' },
        'text_german':     { lang: 'de-DE', mms: 'deu', label: 'German' },
        'text_gujarati':   { lang: 'gu-IN', mms: 'guj', label: 'Gujarati' },
        'text_hebrew':     { lang: 'he-IL', mms: 'heb', label: 'Hebrew' },
        'text_hindi':      { lang: 'hi-IN', mms: 'hin', label: 'Hindi' },
        'text_hungarian':  { lang: 'hu-HU', mms: 'hun', label: 'Hungarian' },
        'text_igbo':       { lang: 'ig-NG', mms: 'ibo', label: 'Igbo' },
        'text_indonesian': { lang: 'id-ID', mms: 'ind', label: 'Indonesian' },
        'text_italian':    { lang: 'it-IT', mms: 'ita', label: 'Italian' },
        'text_japanese':   { lang: 'ja-JP', mms: 'jpn', label: 'Japanese' },
        'text_kannada':    { lang: 'kn-IN', mms: 'kan', label: 'Kannada' },
        'text_korean':     { lang: 'ko-KR', mms: 'kor', label: 'Korean' },
        'text_malayalam':  { lang: 'ml-IN', mms: 'mal', label: 'Malayalam' },
        'text_manipuri':   { lang: 'mni-IN', mms: 'mni', label: 'Manipuri' },
        'text_marathi':    { lang: 'mr-IN', mms: 'mar', label: 'Marathi' },
        'text_nagamese':   { lang: 'as-IN', mms: 'asm', label: 'Nagamese' },
        'text_nepali':     { lang: 'ne-NP', mms: 'nep', label: 'Nepali' },
        'text_norwegian':  { lang: 'nb-NO', mms: 'nob', label: 'Norwegian' },
        'text_odia':       { lang: 'or-IN', mms: 'ory', label: 'Odia' },
        'text_oromo':      { lang: 'om-ET', mms: 'orm', label: 'Oromo' },
        'text_polish':     { lang: 'pl-PL', mms: 'pol', label: 'Polish' },
        'text_portuguese': { lang: 'pt-BR', mms: 'por', label: 'Portuguese' },
        'text_punjabi':    { lang: 'pa-IN', mms: 'pan', label: 'Punjabi' },
        'text_rohingya':   { lang: 'rhg-MM', mms: 'rhg', label: 'Rohingya' },
        'text_romanian':   { lang: 'ro-RO', mms: 'ron', label: 'Romanian' },
        'text_russian':    { lang: 'ru-RU', mms: 'rus', label: 'Russian' },
        'text_sanskrit':   { lang: 'sa-IN', mms: 'san', label: 'Sanskrit' },
        'text_somali':     { lang: 'so-SO', mms: 'som', label: 'Somali' },
        'text_spanish':    { lang: 'es-ES', mms: 'spa', label: 'Spanish' },
        'text_swahili':    { lang: 'sw-KE', mms: 'swh', label: 'Swahili' },
        'text_swedish':    { lang: 'sv-SE', mms: 'swe', label: 'Swedish' },
        'text_tagalog':    { lang: 'tl-PH', mms: 'tgl', label: 'Tagalog' },
        'text_tamil':      { lang: 'ta-IN', mms: 'tam', label: 'Tamil' },
        'text_telugu':     { lang: 'te-IN', mms: 'tel', label: 'Telugu' },
        'text_thai':       { lang: 'th-TH', mms: 'tha', label: 'Thai' },
        'text_turkish':    { lang: 'tr-TR', mms: 'tur', label: 'Turkish' },
        'text_ukrainian':  { lang: 'uk-UA', mms: 'ukr', label: 'Ukrainian' },
        'text_urdu':       { lang: 'ur-PK', mms: 'urd', label: 'Urdu' },
        'text_vietnamese': { lang: 'vi-VN', mms: 'vie', label: 'Vietnamese' },
        'text_yoruba':     { lang: 'yo-NG', mms: 'yor', label: 'Yoruba' }
    };

    /**
     * Refresh browser voices
     */
    function refreshVoices() {
        if ('speechSynthesis' in window) {
            try {
                availableVoices = window.speechSynthesis.getVoices() || [];
            } catch (e) { }
        }
    }

    if ('speechSynthesis' in window) {
        refreshVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                refreshVoices();
            };
        }
    }

    /**
     * Speech is supported across all 57 languages thanks to Vercel Serverless Proxy
     */
    function isLanguageSupported(langKey) {
        return true;
    }

    /**
     * Find best native device voice
     */
    function getBestNativeVoice(langKey) {
        refreshVoices();
        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        const targetLang = (config.lang || 'en-US').toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) return null;

        const matches = availableVoices.filter(v => {
            const vLang = (v.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang.startsWith(primaryLang);
        });

        if (matches.length === 0) return null;

        const naturalKeywords = ['natural', 'neural', 'google', 'premium', 'enhanced', 'samantha', 'daniel', 'karen', 'microsoft'];
        let best = matches[0];
        let bestScore = -1;

        matches.forEach(v => {
            let score = 0;
            const name = (v.name || '').toLowerCase();
            const lang = (v.lang || '').toLowerCase();
            if (lang === targetLang) score += 20;
            naturalKeywords.forEach(k => { if (name.includes(k)) score += 15; });
            if (v.default) score += 3;
            if (score > bestScore) {
                bestScore = score;
                best = v;
            }
        });

        return best;
    }

    /**
     * Clean raw HTML for speech
     */
    function cleanTextForSpeech(rawHtml) {
        if (!rawHtml) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        tempDiv.querySelectorAll('.verse-number, .verse-speaker-btn, .game-badge, script, style').forEach(el => el.remove());

        let text = tempDiv.textContent || tempDiv.innerText || '';

        text = text
            .replace(/[\r\n]+/g, ' ')               // Replace newlines with space
            .replace(/^\s*\d+[\s:.]*/, '')          // Strip leading reference number
            .replace(/\[.*?\]/g, '')                // Remove bracketed footnotes
            .replace(/\(.*?\)/g, '')                // Remove parenthetical notes
            .replace(/“|”|"/g, '"')                 // Normalize quotes
            .replace(/‘|’|'/g, "'")                 // Normalize apostrophes
            .replace(/\s+/g, ' ')                   // Normalize spaces
            .trim();

        return text;
    }

    /**
     * Split text into short, natural sentence chunks
     */
    function splitIntoChunks(text, maxLen = 180) {
        if (text.length <= maxLen) return [text];

        const chunks = [];
        const sentences = text.match(/[^.!?।;,\n]+[.!?।;,\n]*/g) || [text];

        let current = '';
        for (const sentence of sentences) {
            if ((current + sentence).length > maxLen && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current += ' ' + sentence;
            }
        }
        if (current.trim().length > 0) {
            chunks.push(current.trim());
        }

        return chunks;
    }

    /**
     * Stop all active speech & audio
     */
    function stop() {
        isStopped = true;

        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }

        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) { }
        }

        if (currentAudio) {
            try {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                currentAudio.src = '';
            } catch (e) { }
            currentAudio = null;
        }

        audioQueue = [];
        currentQueueIndex = 0;

        if (currentlySpeakingElement) {
            currentlySpeakingElement.classList.remove('verse-speaking');
            currentlySpeakingElement = null;
        }

        if (currentlySpeakingBtn) {
            currentlySpeakingBtn.classList.remove('is-speaking', 'is-loading');
            currentlySpeakingBtn = null;
        }

        currentUtterance = null;
    }

    /**
     * Toggle speech for a clicked verse/paragraph
     */
    async function toggleVerseSpeech(event, button) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        const verseElement = button.closest('.verse');
        if (!verseElement) return;

        // If clicking the button while currently speaking or loading this verse, STOP it
        if (currentlySpeakingElement === verseElement) {
            stop();
            return;
        }

        // Stop any active speech first
        stop();
        isStopped = false;

        const textToSpeak = cleanTextForSpeech(verseElement.innerHTML);
        if (!textToSpeak) return;

        const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : 'text';
        const langConfig = ALL_LANGUAGES_CONFIG[currentLangKey] || ALL_LANGUAGES_CONFIG['text'];

        // Mark UI as loading (shows rotating progressbar spinner)
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-loading');

        // TIER 1: Native Voice if available on device (English, Hindi, Spanish, etc.)
        const nativeVoice = getBestNativeVoice(currentLangKey);
        if (nativeVoice && 'speechSynthesis' in window) {
            console.log(`[TTS] Playing via Native Device Voice: ${nativeVoice.name} (${nativeVoice.lang})`);
            playViaSpeechSynthesis(textToSpeak, nativeVoice);
            return;
        }

        // TIER 2: Vercel Serverless Meta MMS Proxy (Odia, Dogri, Sanskrit, Assamese, etc.)
        console.log(`[TTS] Streaming Meta MMS Neural Speech for ${currentLangKey} via /api/tts`);
        try {
            await playViaServerlessProxy(textToSpeak, currentLangKey);
        } catch (err) {
            console.warn('[TTS] Serverless proxy error:', err);
            // Fallback to default synthesizer
            if ('speechSynthesis' in window && !isStopped) {
                const fallbackVoice = availableVoices.find(v => v.default) || availableVoices[0] || null;
                playViaSpeechSynthesis(textToSpeak, fallbackVoice);
            } else {
                stop();
            }
        }
    }

    /**
     * Play via Web Speech API
     */
    function playViaSpeechSynthesis(text, voice) {
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();

            const utterance = new SpeechSynthesisUtterance(text);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            }

            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            currentUtterance = utterance;

            utterance.onstart = () => {
                if (currentlySpeakingBtn) {
                    currentlySpeakingBtn.classList.remove('is-loading');
                    currentlySpeakingBtn.classList.add('is-speaking');
                }
            };

            utterance.onend = () => stop();
            utterance.onerror = (e) => {
                console.warn('[TTS] Utterance error:', e);
                stop();
            };

            // Heartbeat
            heartbeatTimer = setInterval(() => {
                if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000);

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('[TTS] Error in playViaSpeechSynthesis:', e);
            stop();
        }
    }

    /**
     * Play via Vercel Serverless Meta MMS Proxy
     */
    async function playViaServerlessProxy(text, langKey) {
        const isCordovaOrLocal = (typeof cordova !== 'undefined') || window.location.protocol === 'file:' || window.location.hostname === 'localhost';
        const apiBase = isCordovaOrLocal
            ? 'https://eternal-life-alpha.vercel.app/api/tts'
            : '/api/tts';

        const chunks = splitIntoChunks(text, 180);
        audioQueue = chunks.map(chunk => {
            return `${apiBase}?lang=${encodeURIComponent(langKey)}&text=${encodeURIComponent(chunk)}`;
        });

        currentQueueIndex = 0;
        await playNextChunkInQueue();
    }

    /**
     * Chain audio queue chunks
     */
    async function playNextChunkInQueue() {
        if (isStopped || currentQueueIndex >= audioQueue.length) {
            stop();
            return;
        }

        const audioUrl = audioQueue[currentQueueIndex];
        currentAudio = new Audio(audioUrl);
        currentAudio.playbackRate = 0.98;

        currentAudio.onplay = () => {
            if (currentlySpeakingBtn) {
                currentlySpeakingBtn.classList.remove('is-loading');
                currentlySpeakingBtn.classList.add('is-speaking');
            }
        };

        currentAudio.onended = () => {
            currentQueueIndex++;
            playNextChunkInQueue();
        };

        currentAudio.onerror = (e) => {
            console.warn(`[TTS] Audio chunk error at index ${currentQueueIndex}:`, e);
            currentQueueIndex++;
            if (currentQueueIndex < audioQueue.length) {
                playNextChunkInQueue();
            } else {
                stop();
            }
        };

        try {
            await currentAudio.play();
        } catch (playErr) {
            console.warn('[TTS] Audio playback error:', playErr);
            stop();
        }
    }

    return {
        toggleVerseSpeech: toggleVerseSpeech,
        stop: stop,
        isLanguageSupported: isLanguageSupported,
        ALL_LANGUAGES_CONFIG: ALL_LANGUAGES_CONFIG
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
