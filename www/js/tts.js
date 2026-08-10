/**
 * =========================================================
 * Natural Human Text-to-Speech (TTS) Engine for Eternal Life
 * Multi-language support with automatic voice matching & Option 1 verification
 * =========================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Language code map (App language key -> Primary BCP-47 Language Tag)
    const LANG_CONFIG = {
        'text':            { lang: 'en-US' },
        'text_arabic':     { lang: 'ar-SA' },
        'text_assamese':   { lang: 'as-IN' },
        'text_bengali':    { lang: 'bn-IN' },
        'text_burmese':    { lang: 'my-MM' },
        'text_chinese':    { lang: 'zh-CN' },
        'text_czech':      { lang: 'cs-CZ' },
        'text_dogri':      { lang: 'doi-IN' },
        'text_dutch':      { lang: 'nl-NL' },
        'text_french':     { lang: 'fr-FR' },
        'text_german':     { lang: 'de-DE' },
        'text_gujarati':   { lang: 'gu-IN' },
        'text_hebrew':     { lang: 'he-IL' },
        'text_hindi':      { lang: 'hi-IN' },
        'text_hungarian':  { lang: 'hu-HU' },
        'text_igbo':       { lang: 'ig-NG' },
        'text_indonesian': { lang: 'id-ID' },
        'text_italian':    { lang: 'it-IT' },
        'text_japanese':   { lang: 'ja-JP' },
        'text_kannada':    { lang: 'kn-IN' },
        'text_korean':     { lang: 'ko-KR' },
        'text_malayalam':  { lang: 'ml-IN' },
        'text_manipuri':   { lang: 'mni-IN' },
        'text_marathi':    { lang: 'mr-IN' },
        'text_nagamese':   { lang: 'as-IN' },
        'text_nepali':     { lang: 'ne-NP' },
        'text_norwegian':  { lang: 'nb-NO' },
        'text_odia':       { lang: 'or-IN' },
        'text_oromo':      { lang: 'om-ET' },
        'text_polish':     { lang: 'pl-PL' },
        'text_portuguese': { lang: 'pt-BR' },
        'text_punjabi':    { lang: 'pa-IN' },
        'text_romanian':   { lang: 'ro-RO' },
        'text_russian':    { lang: 'ru-RU' },
        'text_sanskrit':   { lang: 'sa-IN' },
        'text_somali':     { lang: 'so-SO' },
        'text_spanish':    { lang: 'es-ES' },
        'text_swahili':    { lang: 'sw-KE' },
        'text_swedish':    { lang: 'sv-SE' },
        'text_tagalog':    { lang: 'tl-PH' },
        'text_tamil':      { lang: 'ta-IN' },
        'text_telugu':     { lang: 'te-IN' },
        'text_thai':       { lang: 'th-TH' },
        'text_turkish':    { lang: 'tr-TR' },
        'text_ukrainian':  { lang: 'uk-UA' },
        'text_urdu':       { lang: 'ur-PK' },
        'text_vietnamese': { lang: 'vi-VN' },
        'text_yoruba':     { lang: 'yo-NG' }
    };

    /**
     * Refresh voices from the browser
     */
    function refreshVoices() {
        if ('speechSynthesis' in window) {
            try {
                availableVoices = window.speechSynthesis.getVoices() || [];
            } catch (e) {
                console.warn('[TTS] Failed to get voices:', e);
            }
        }
    }

    if ('speechSynthesis' in window) {
        refreshVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                refreshVoices();
                // If chapter is already displayed, refresh button presence if language is supported
                if (typeof renderChapter === 'function' && typeof state !== 'undefined' && state.currentBookKey) {
                    const isSupported = isLanguageSupported(state.currentLang || 'text');
                    const hasButtons = !!document.querySelector('.verse-speaker-btn');
                    if (isSupported !== hasButtons) {
                        // Re-render to reflect available voices
                        renderChapter(dom.scrollContainer ? dom.scrollContainer.scrollTop : 0);
                    }
                }
            };
        }
    }

    /**
     * Option 1: Checks if the user's device has a real native voice installed for this language.
     */
    function isLanguageSupported(langKey) {
        if (!('speechSynthesis' in window)) return false;
        refreshVoices();

        const config = LANG_CONFIG[langKey] || LANG_CONFIG['text'];
        if (!config || !config.lang) return false;

        const targetLang = config.lang.toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        if (!availableVoices || availableVoices.length === 0) {
            // Before voices asynchronously load, allow common standard languages
            const commonStandardLangs = ['text', 'text_spanish', 'text_french', 'text_german', 'text_hindi', 'text_russian', 'text_japanese', 'text_chinese', 'text_italian', 'text_portuguese'];
            return commonStandardLangs.includes(langKey);
        }

        // Return true ONLY if an authentic matching voice exists for this language
        return availableVoices.some(voice => {
            const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang.startsWith(primaryLang);
        });
    }

    /**
     * Resolves the best available voice and matching language code
     */
    function resolveVoiceAndLang(langKey) {
        refreshVoices();

        const config = LANG_CONFIG[langKey] || LANG_CONFIG['text'];
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
                'online', 'samantha', 'daniel', 'karen', 'serena',
                'microsoft', 'zira', 'david'
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

        // Fallback to default
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        return {
            voice: defaultVoice,
            lang: defaultVoice ? defaultVoice.lang : targetLang
        };
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
            } catch (e) {
                console.warn('[TTS] Error cancelling speech:', e);
            }
        }

        if (currentlySpeakingElement) {
            currentlySpeakingElement.classList.remove('verse-speaking');
            currentlySpeakingElement = null;
        }

        if (currentlySpeakingBtn) {
            currentlySpeakingBtn.classList.remove('is-speaking');
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

        // If currently speaking this verse, stop it
        if (currentlySpeakingElement === verseElement) {
            stop();
            return;
        }

        // Stop any active speech first
        stop();

        // Extract clean text
        const textToSpeak = cleanTextForSpeech(verseElement.innerHTML);
        if (!textToSpeak) {
            console.warn('[TTS] No text found to speak.');
            return;
        }

        // Get active language from app state
        const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : 'text';
        const { voice, lang } = resolveVoiceAndLang(currentLangKey);

        console.log(`[TTS] Speaking in ${currentLangKey} (Locale: ${lang}, Voice: ${voice ? voice.name : 'Default'}): "${textToSpeak.substring(0, 40)}..."`);

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang;
        if (voice) {
            utterance.voice = voice;
        }

        // Natural Human Cadence parameters
        utterance.rate = 0.95;  // Relaxed, conversational speed
        utterance.pitch = 1.0; // Natural conversational pitch
        utterance.volume = 1.0;

        // Set visual states
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-speaking');
        currentUtterance = utterance;

        // Event Listeners
        utterance.onend = function () {
            console.log('[TTS] Speech finished.');
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

        // Resume engine if paused (fixes Chrome/Android background suspension)
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
        resolveVoiceAndLang: resolveVoiceAndLang
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
