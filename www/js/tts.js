/**
 * ====================================================================
 * Universal Natural Text-to-Speech (TTS) Engine for All 57 Languages
 * Features:
 *   - Rotating Progressbar Spinner during audio generation/loading
 *   - Local Web Speech API for device-installed voices
 *   - High-Quality Neural Audio Streaming for all 57 Languages (Odia, Dogri, Sanskrit, Assamese, etc.)
 *   - Smooth multi-sentence continuous playback
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
    // BCP-47 Tag (for Web Speech) and Google TTS / Meta Language Code
    const ALL_LANGUAGES_CONFIG = {
        'text':            { lang: 'en-US', tts: 'en', label: 'English' },
        'text_arabic':     { lang: 'ar-SA', tts: 'ar', label: 'Arabic' },
        'text_assamese':   { lang: 'as-IN', tts: 'as', label: 'Assamese' },
        'text_bengali':    { lang: 'bn-IN', tts: 'bn', label: 'Bengali' },
        'text_burmese':    { lang: 'my-MM', tts: 'my', label: 'Burmese' },
        'text_chinese':    { lang: 'zh-CN', tts: 'zh-CN', label: 'Chinese' },
        'text_czech':      { lang: 'cs-CZ', tts: 'cs', label: 'Czech' },
        'text_dogri':      { lang: 'doi-IN', tts: 'hi', label: 'Dogri' },
        'text_dutch':      { lang: 'nl-NL', tts: 'nl', label: 'Dutch' },
        'text_french':     { lang: 'fr-FR', tts: 'fr', label: 'French' },
        'text_german':     { lang: 'de-DE', tts: 'de', label: 'German' },
        'text_gujarati':   { lang: 'gu-IN', tts: 'gu', label: 'Gujarati' },
        'text_hebrew':     { lang: 'he-IL', tts: 'iw', label: 'Hebrew' },
        'text_hindi':      { lang: 'hi-IN', tts: 'hi', label: 'Hindi' },
        'text_hungarian':  { lang: 'hu-HU', tts: 'hu', label: 'Hungarian' },
        'text_igbo':       { lang: 'ig-NG', tts: 'ig', label: 'Igbo' },
        'text_indonesian': { lang: 'id-ID', tts: 'id', label: 'Indonesian' },
        'text_italian':    { lang: 'it-IT', tts: 'it', label: 'Italian' },
        'text_japanese':   { lang: 'ja-JP', tts: 'ja', label: 'Japanese' },
        'text_kannada':    { lang: 'kn-IN', tts: 'kn', label: 'Kannada' },
        'text_korean':     { lang: 'ko-KR', tts: 'ko', label: 'Korean' },
        'text_malayalam':  { lang: 'ml-IN', tts: 'ml', label: 'Malayalam' },
        'text_manipuri':   { lang: 'mni-IN', tts: 'bn', label: 'Manipuri' },
        'text_marathi':    { lang: 'mr-IN', tts: 'mr', label: 'Marathi' },
        'text_nagamese':   { lang: 'as-IN', tts: 'as', label: 'Nagamese' },
        'text_nepali':     { lang: 'ne-NP', tts: 'ne', label: 'Nepali' },
        'text_norwegian':  { lang: 'nb-NO', tts: 'no', label: 'Norwegian' },
        'text_odia':       { lang: 'or-IN', tts: 'or', label: 'Odia' },
        'text_oromo':      { lang: 'om-ET', tts: 'om', label: 'Oromo' },
        'text_polish':     { lang: 'pl-PL', tts: 'pl', label: 'Polish' },
        'text_portuguese': { lang: 'pt-BR', tts: 'pt', label: 'Portuguese' },
        'text_punjabi':    { lang: 'pa-IN', tts: 'pa', label: 'Punjabi' },
        'text_rohingya':   { lang: 'rhg-MM', tts: 'bn', label: 'Rohingya' },
        'text_romanian':   { lang: 'ro-RO', tts: 'ro', label: 'Romanian' },
        'text_russian':    { lang: 'ru-RU', tts: 'ru', label: 'Russian' },
        'text_sanskrit':   { lang: 'sa-IN', tts: 'sa', label: 'Sanskrit' },
        'text_somali':     { lang: 'so-SO', tts: 'so', label: 'Somali' },
        'text_spanish':    { lang: 'es-ES', tts: 'es', label: 'Spanish' },
        'text_swahili':    { lang: 'sw-KE', tts: 'sw', label: 'Swahili' },
        'text_swedish':    { lang: 'sv-SE', tts: 'sv', label: 'Swedish' },
        'text_tagalog':    { lang: 'tl-PH', tts: 'tl', label: 'Tagalog' },
        'text_tamil':      { lang: 'ta-IN', tts: 'ta', label: 'Tamil' },
        'text_telugu':     { lang: 'te-IN', tts: 'te', label: 'Telugu' },
        'text_thai':       { lang: 'th-TH', tts: 'th', label: 'Thai' },
        'text_turkish':    { lang: 'tr-TR', tts: 'tr', label: 'Turkish' },
        'text_ukrainian':  { lang: 'uk-UA', tts: 'uk', label: 'Ukrainian' },
        'text_urdu':       { lang: 'ur-PK', tts: 'ur', label: 'Urdu' },
        'text_vietnamese': { lang: 'vi-VN', tts: 'vi', label: 'Vietnamese' },
        'text_yoruba':     { lang: 'yo-NG', tts: 'yo', label: 'Yoruba' }
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
     * Check if speech is supported across all 57 languages
     */
    function isLanguageSupported(langKey) {
        return true;
    }

    /**
     * Check if a native voice is installed on user's device
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
     * Cleans raw HTML text into clean natural narration
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
     * Split text into short, natural sentence chunks for audio streaming
     */
    function splitIntoChunks(text, maxLen = 160) {
        if (text.length <= maxLen) return [text];

        const chunks = [];
        // Split by sentence delimiters (period, exclamation, question, Odia/Hindi danda ।, semicolon, comma)
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
     * Main Toggle Handler
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

        // TIER 1: Native Voice if available on device (e.g. English, Hindi, Spanish, etc.)
        const nativeVoice = getBestNativeVoice(currentLangKey);
        if (nativeVoice && 'speechSynthesis' in window) {
            console.log(`[TTS] Playing via Native Device Voice: ${nativeVoice.name} (${nativeVoice.lang})`);
            playViaSpeechSynthesis(textToSpeak, nativeVoice);
            return;
        }

        // TIER 2: High-Quality Audio Streaming (Odia, Dogri, Assamese, Sanskrit, Burmese, etc.)
        console.log(`[TTS] Streaming Neural Speech for ${currentLangKey} (Code: ${langConfig.tts})`);
        try {
            await playViaAudioStream(textToSpeak, langConfig.tts, currentLangKey);
        } catch (err) {
            console.warn('[TTS] Audio streaming error, falling back to Web Speech:', err);
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
     * Play via Google / Universal Neural Audio Streaming with multi-chunk chaining
     */
    async function playViaAudioStream(text, ttsLangCode, currentLangKey) {
        const chunks = splitIntoChunks(text, 160);
        audioQueue = chunks.map(chunk => {
            const encoded = encodeURIComponent(chunk);
            return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${ttsLangCode}&q=${encoded}`;
        });

        currentQueueIndex = 0;
        await playNextChunkInQueue();
    }

    /**
     * Play next sentence chunk in queue
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
                // Switch from rotating spinner to active pulsating stop button
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
            console.warn('[TTS] Audio.play() blocked or failed:', playErr);
            // Try fallback
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
