/**
 * ====================================================================
 * Natural Human Text-to-Speech (TTS) Engine for Eternal Life (Option 1)
 * Features:
 *   - Strict verification: only shows speaker button when an authentic voice is installed for that language
 *   - Identical, consistent behavior across Mobile and PC
 *   - Rotating progressbar spinner while initializing voice
 *   - Smooth pulsating active stop button during narration
 *   - Paragraph highlight synchronization (.verse-speaking)
 *   - Auto-resume and keep-alive for Chromium/Android speech engine
 * ====================================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Mapping for All 57 Languages with verified TTS voice availability
    const ALL_LANGUAGES_CONFIG = {
        'text':            { lang: 'en-US', label: 'English', hasTtsVoice: true },
        'text_arabic':     { lang: 'ar-SA', label: 'Arabic', hasTtsVoice: true },
        'text_assamese':   { lang: 'as-IN', label: 'Assamese', hasTtsVoice: false },
        'text_bengali':    { lang: 'bn-IN', label: 'Bengali', hasTtsVoice: true },
        'text_burmese':    { lang: 'my-MM', label: 'Burmese', hasTtsVoice: false },
        'text_chinese':    { lang: 'zh-CN', label: 'Chinese', hasTtsVoice: true },
        'text_czech':      { lang: 'cs-CZ', label: 'Czech', hasTtsVoice: true },
        'text_dogri':      { lang: 'doi-IN', label: 'Dogri', hasTtsVoice: false },
        'text_dutch':      { lang: 'nl-NL', label: 'Dutch', hasTtsVoice: true },
        'text_french':     { lang: 'fr-FR', label: 'French', hasTtsVoice: true },
        'text_german':     { lang: 'de-DE', label: 'German', hasTtsVoice: true },
        'text_gujarati':   { lang: 'gu-IN', label: 'Gujarati', hasTtsVoice: true },
        'text_hebrew':     { lang: 'he-IL', label: 'Hebrew', hasTtsVoice: true },
        'text_hindi':      { lang: 'hi-IN', label: 'Hindi', hasTtsVoice: true },
        'text_hungarian':  { lang: 'hu-HU', label: 'Hungarian', hasTtsVoice: true },
        'text_igbo':       { lang: 'ig-NG', label: 'Igbo', hasTtsVoice: false },
        'text_indonesian': { lang: 'id-ID', label: 'Indonesian', hasTtsVoice: true },
        'text_italian':    { lang: 'it-IT', label: 'Italian', hasTtsVoice: true },
        'text_japanese':   { lang: 'ja-JP', label: 'Japanese', hasTtsVoice: true },
        'text_kannada':    { lang: 'kn-IN', label: 'Kannada', hasTtsVoice: true },
        'text_korean':     { lang: 'ko-KR', label: 'Korean', hasTtsVoice: true },
        'text_malayalam':  { lang: 'ml-IN', label: 'Malayalam', hasTtsVoice: true },
        'text_manipuri':   { lang: 'mni-IN', label: 'Manipuri', hasTtsVoice: false },
        'text_marathi':    { lang: 'mr-IN', label: 'Marathi', hasTtsVoice: true },
        'text_nagamese':   { lang: 'as-IN', label: 'Nagamese', hasTtsVoice: false },
        'text_nepali':     { lang: 'ne-NP', label: 'Nepali', hasTtsVoice: true },
        'text_norwegian':  { lang: 'nb-NO', label: 'Norwegian', hasTtsVoice: true },
        'text_odia':       { lang: 'or-IN', label: 'Odia', hasTtsVoice: false },
        'text_oromo':      { lang: 'om-ET', label: 'Oromo', hasTtsVoice: false },
        'text_polish':     { lang: 'pl-PL', label: 'Polish', hasTtsVoice: true },
        'text_portuguese': { lang: 'pt-BR', label: 'Portuguese', hasTtsVoice: true },
        'text_punjabi':    { lang: 'pa-IN', label: 'Punjabi', hasTtsVoice: true },
        'text_rohingya':   { lang: 'rhg-MM', label: 'Rohingya', hasTtsVoice: false },
        'text_romanian':   { lang: 'ro-RO', label: 'Romanian', hasTtsVoice: true },
        'text_russian':    { lang: 'ru-RU', label: 'Russian', hasTtsVoice: true },
        'text_sanskrit':   { lang: 'sa-IN', label: 'Sanskrit', hasTtsVoice: false },
        'text_somali':     { lang: 'so-SO', label: 'Somali', hasTtsVoice: false },
        'text_spanish':    { lang: 'es-ES', label: 'Spanish', hasTtsVoice: true },
        'text_swahili':    { lang: 'sw-KE', label: 'Swahili', hasTtsVoice: true },
        'text_swedish':    { lang: 'sv-SE', label: 'Swedish', hasTtsVoice: true },
        'text_tagalog':    { lang: 'tl-PH', label: 'Tagalog', hasTtsVoice: true },
        'text_tamil':      { lang: 'ta-IN', label: 'Tamil', hasTtsVoice: true },
        'text_telugu':     { lang: 'te-IN', label: 'Telugu', hasTtsVoice: true },
        'text_thai':       { lang: 'th-TH', label: 'Thai', hasTtsVoice: true },
        'text_turkish':    { lang: 'tr-TR', label: 'Turkish', hasTtsVoice: true },
        'text_ukrainian':  { lang: 'uk-UA', label: 'Ukrainian', hasTtsVoice: true },
        'text_urdu':       { lang: 'ur-PK', label: 'Urdu', hasTtsVoice: true },
        'text_vietnamese': { lang: 'vi-VN', label: 'Vietnamese', hasTtsVoice: true },
        'text_yoruba':     { lang: 'yo-NG', label: 'Yoruba', hasTtsVoice: false }
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
                if (typeof renderChapter === 'function' && typeof state !== 'undefined' && state.currentBookKey) {
                    const isSupported = isLanguageSupported(state.currentLang || 'text');
                    const hasButtons = !!document.querySelector('.verse-speaker-btn');
                    if (isSupported !== hasButtons) {
                        renderChapter(dom.scrollContainer ? dom.scrollContainer.scrollTop : 0);
                    }
                }
            };
        }
    }

    /**
     * Option 1: Strictly check if an authentic voice for this language is available
     * Returns false for unsupported dialects (Odia, Dogri, Sanskrit, etc.) on BOTH PC and Mobile
     */
    function isLanguageSupported(langKey) {
        if (!('speechSynthesis' in window)) return false;

        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        if (!config || config.hasTtsVoice === false) {
            return false;
        }

        refreshVoices();

        const targetLang = config.lang.toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) {
            return config.hasTtsVoice === true;
        }

        // Strict BCP-47 tag matching (avoids false-positive prefix matching like 'or' matching 'orm')
        return availableVoices.some(voice => {
            const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang === primaryLang || vLang.startsWith(primaryLang + '-');
        });
    }

    /**
     * Resolves the best available native voice for the given language
     */
    function getBestNativeVoice(langKey) {
        refreshVoices();

        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        if (!config || config.hasTtsVoice === false) return null;

        const targetLang = (config.lang || 'en-US').toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) {
            return null;
        }

        const matches = availableVoices.filter(v => {
            const vLang = (v.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang === primaryLang || vLang.startsWith(primaryLang + '-');
        });

        if (matches.length > 0) {
            const premiumKeywords = ['natural', 'neural', 'online'];
            const femaleKeywords = [
                'jenny', 'aria', 'samantha', 'zira', 'ava', 'karen',
                'serena', 'allison', 'victoria', 'susan', 'cathy',
                'stephanie', 'clara', 'emma', 'olivia', 'sophia',
                'google uk english female', 'google us english', 'female'
            ];
            const roboticKeywords = ['david', 'desktop', 'mark', 'espeak', 'robot', 'george', 'richard', 'sample'];

            let bestMatch = matches[0];
            let bestScore = -999;

            matches.forEach(v => {
                let score = 0;
                const vName = (v.name || '').toLowerCase();
                const vLang = (v.lang || '').toLowerCase().replace('_', '-');

                // Language Match Accuracy
                if (vLang === targetLang) score += 30;

                // Priority 1: Modern Neural / Natural Online Engines
                premiumKeywords.forEach(kw => {
                    if (vName.includes(kw)) score += 50;
                });

                // Priority 2: Pleasant Natural Human Female Voices
                femaleKeywords.forEach(kw => {
                    if (vName.includes(kw)) score += 40;
                });

                // Penalty: Robotic Legacy SAPI Desktop Voices
                roboticKeywords.forEach(kw => {
                    if (vName.includes(kw)) score -= 60;
                });

                if (v.default && score >= 0) score += 5;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = v;
                }
            });

            return bestMatch;
        }

        return null;
    }

    /**
     * Cleans raw HTML text into clean, natural human narration
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
     * Stop active speech and reset UI
     */
    function stop() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }

        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) { }
        }

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
    function toggleVerseSpeech(event, button) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        if (!('speechSynthesis' in window)) {
            alert('Text-to-Speech is not supported on this browser/device.');
            return;
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

        const textToSpeak = cleanTextForSpeech(verseElement.innerHTML);
        if (!textToSpeak) return;

        const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : 'text';
        const langConfig = ALL_LANGUAGES_CONFIG[currentLangKey] || ALL_LANGUAGES_CONFIG['text'];
        const nativeVoice = getBestNativeVoice(currentLangKey);

        if (!nativeVoice && !isLanguageSupported(currentLangKey)) {
            alert(`No voice engine installed on your device for ${langConfig.label}. Please install the voice pack in your device settings.`);
            stop();
            return;
        }

        // Mark UI as loading (shows rotating progressbar spinner)
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-loading');

        console.log(`[TTS] Speaking in ${langConfig.label} - Voice: ${nativeVoice ? nativeVoice.name : 'Default'}`);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        if (nativeVoice) {
            utterance.voice = nativeVoice;
            utterance.lang = nativeVoice.lang;
        } else {
            utterance.lang = langConfig.lang;
        }

        // Natural human female conversational cadence & pitch
        utterance.rate = 0.96;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        currentUtterance = utterance;

        // When audio starts, switch from spinner to pulsating stop button
        utterance.onstart = function () {
            if (currentlySpeakingBtn) {
                currentlySpeakingBtn.classList.remove('is-loading');
                currentlySpeakingBtn.classList.add('is-speaking');
            }
        };

        utterance.onend = function () {
            stop();
        };

        utterance.onerror = function (e) {
            console.warn('[TTS] Speech utterance error:', e);
            stop();
        };

        // Chromium Keep-Alive Heartbeat
        heartbeatTimer = setInterval(() => {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);

        // Resume engine and speak
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('[TTS] Error invoking speech:', err);
            stop();
        }
    }

    return {
        toggleVerseSpeech: toggleVerseSpeech,
        stop: stop,
        isLanguageSupported: isLanguageSupported,
        getBestNativeVoice: getBestNativeVoice,
        ALL_LANGUAGES_CONFIG: ALL_LANGUAGES_CONFIG
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
