/**
 * ====================================================================
 * Natural Human Text-to-Speech (TTS) Engine for Eternal Life (Option 1)
 * Features:
 *   - Only shows speaker button when an authentic voice is installed for that language
 *   - Rotating progressbar spinner while initializing voice
 *   - Smooth pulsating active stop button during narration
 *   - Paragraph highlight synchronization
 *   - Auto-resume and keep-alive for Chromium/Android speech engine
 * ====================================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Mapping for All 57 Languages in Eternal Life App (BCP-47 Language Codes)
    const ALL_LANGUAGES_CONFIG = {
        'text':            { lang: 'en-US', label: 'English' },
        'text_arabic':     { lang: 'ar-SA', label: 'Arabic' },
        'text_assamese':   { lang: 'as-IN', label: 'Assamese' },
        'text_bengali':    { lang: 'bn-IN', label: 'Bengali' },
        'text_burmese':    { lang: 'my-MM', label: 'Burmese' },
        'text_chinese':    { lang: 'zh-CN', label: 'Chinese' },
        'text_czech':      { lang: 'cs-CZ', label: 'Czech' },
        'text_dogri':      { lang: 'doi-IN', label: 'Dogri' },
        'text_dutch':      { lang: 'nl-NL', label: 'Dutch' },
        'text_french':     { lang: 'fr-FR', label: 'French' },
        'text_german':     { lang: 'de-DE', label: 'German' },
        'text_gujarati':   { lang: 'gu-IN', label: 'Gujarati' },
        'text_hebrew':     { lang: 'he-IL', label: 'Hebrew' },
        'text_hindi':      { lang: 'hi-IN', label: 'Hindi' },
        'text_hungarian':  { lang: 'hu-HU', label: 'Hungarian' },
        'text_igbo':       { lang: 'ig-NG', label: 'Igbo' },
        'text_indonesian': { lang: 'id-ID', label: 'Indonesian' },
        'text_italian':    { lang: 'it-IT', label: 'Italian' },
        'text_japanese':   { lang: 'ja-JP', label: 'Japanese' },
        'text_kannada':    { lang: 'kn-IN', label: 'Kannada' },
        'text_korean':     { lang: 'ko-KR', label: 'Korean' },
        'text_malayalam':  { lang: 'ml-IN', label: 'Malayalam' },
        'text_manipuri':   { lang: 'mni-IN', label: 'Manipuri' },
        'text_marathi':    { lang: 'mr-IN', label: 'Marathi' },
        'text_nagamese':   { lang: 'as-IN', label: 'Nagamese' },
        'text_nepali':     { lang: 'ne-NP', label: 'Nepali' },
        'text_norwegian':  { lang: 'nb-NO', label: 'Norwegian' },
        'text_odia':       { lang: 'or-IN', label: 'Odia' },
        'text_oromo':      { lang: 'om-ET', label: 'Oromo' },
        'text_polish':     { lang: 'pl-PL', label: 'Polish' },
        'text_portuguese': { lang: 'pt-BR', label: 'Portuguese' },
        'text_punjabi':    { lang: 'pa-IN', label: 'Punjabi' },
        'text_rohingya':   { lang: 'rhg-MM', label: 'Rohingya' },
        'text_romanian':   { lang: 'ro-RO', label: 'Romanian' },
        'text_russian':    { lang: 'ru-RU', label: 'Russian' },
        'text_sanskrit':   { lang: 'sa-IN', label: 'Sanskrit' },
        'text_somali':     { lang: 'so-SO', label: 'Somali' },
        'text_spanish':    { lang: 'es-ES', label: 'Spanish' },
        'text_swahili':    { lang: 'sw-KE', label: 'Swahili' },
        'text_swedish':    { lang: 'sv-SE', label: 'Swedish' },
        'text_tagalog':    { lang: 'tl-PH', label: 'Tagalog' },
        'text_tamil':      { lang: 'ta-IN', label: 'Tamil' },
        'text_telugu':     { lang: 'te-IN', label: 'Telugu' },
        'text_thai':       { lang: 'th-TH', label: 'Thai' },
        'text_turkish':    { lang: 'tr-TR', label: 'Turkish' },
        'text_ukrainian':  { lang: 'uk-UA', label: 'Ukrainian' },
        'text_urdu':       { lang: 'ur-PK', label: 'Urdu' },
        'text_vietnamese': { lang: 'vi-VN', label: 'Vietnamese' },
        'text_yoruba':     { lang: 'yo-NG', label: 'Yoruba' }
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
                // Update speaker buttons dynamically when voices finish loading
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
     * Option 1: Only return true if an authentic voice matching this language exists on device
     */
    function isLanguageSupported(langKey) {
        if (!('speechSynthesis' in window)) return false;
        refreshVoices();

        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        if (!config || !config.lang) return false;

        const targetLang = config.lang.toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) {
            const commonStandardLangs = ['text', 'text_spanish', 'text_french', 'text_german', 'text_hindi', 'text_russian', 'text_japanese', 'text_chinese', 'text_italian', 'text_portuguese'];
            return commonStandardLangs.includes(langKey);
        }

        return availableVoices.some(voice => {
            const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang.startsWith(primaryLang);
        });
    }

    /**
     * Resolves the best available native voice for the given language
     */
    function resolveVoiceAndLang(langKey) {
        refreshVoices();

        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        const targetLang = (config.lang || 'en-US').toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) {
            return { voice: null, lang: targetLang };
        }

        const matches = availableVoices.filter(v => {
            const vLang = (v.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang.startsWith(primaryLang);
        });

        if (matches.length > 0) {
            const naturalKeywords = [
                'natural', 'neural', 'google', 'premium', 'enhanced',
                'samantha', 'daniel', 'karen', 'serena', 'microsoft', 'zira', 'david'
            ];

            let bestMatch = matches[0];
            let bestScore = -1;

            matches.forEach(v => {
                let score = 0;
                const vName = (v.name || '').toLowerCase();
                const vLang = (v.lang || '').toLowerCase().replace('_', '-');

                if (vLang === targetLang) score += 20;
                naturalKeywords.forEach(kw => {
                    if (vName.includes(kw)) score += 15;
                });
                if (v.localService) score += 5;
                if (v.default) score += 3;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = v;
                }
            });

            return {
                voice: bestMatch,
                lang: bestMatch.lang || targetLang
            };
        }

        return { voice: null, lang: targetLang };
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
        const { voice, lang } = resolveVoiceAndLang(currentLangKey);

        if (!voice && !isLanguageSupported(currentLangKey)) {
            alert(`No voice engine installed on your device for ${langConfig.label}. Please install the voice pack in your device settings.`);
            stop();
            return;
        }

        // Mark UI as loading (shows rotating progressbar spinner)
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-loading');

        console.log(`[TTS] Speaking in ${langConfig.label} (${lang}) - Voice: ${voice ? voice.name : 'Default'}`);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang;
        if (voice) {
            utterance.voice = voice;
        }

        // Natural conversational speed & pitch
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        currentUtterance = utterance;

        // When audio actually starts playing, switch from spinner to pulsating stop button
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
        resolveVoiceAndLang: resolveVoiceAndLang,
        ALL_LANGUAGES_CONFIG: ALL_LANGUAGES_CONFIG
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
