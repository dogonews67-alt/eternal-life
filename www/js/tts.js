/**
 * =========================================================
 * Natural Human Text-to-Speech (TTS) Engine for Eternal Life
 * Multi-language support with automatic voice matching & fallback
 * =========================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Language code map (App language key -> Primary BCP-47 Language Tag & Indic/Regional Fallbacks)
    const LANG_CONFIG = {
        'text':            { lang: 'en-US', fallbacks: ['en-GB', 'en-AU', 'en'] },
        'text_arabic':     { lang: 'ar-SA', fallbacks: ['ar-EG', 'ar'] },
        'text_assamese':   { lang: 'as-IN', fallbacks: ['bn-IN', 'hi-IN', 'en-IN'] },
        'text_bengali':    { lang: 'bn-IN', fallbacks: ['bn-BD', 'hi-IN', 'en-IN'] },
        'text_burmese':    { lang: 'my-MM', fallbacks: ['th-TH', 'en-US'] },
        'text_chinese':    { lang: 'zh-CN', fallbacks: ['zh-TW', 'zh-HK', 'zh'] },
        'text_czech':      { lang: 'cs-CZ', fallbacks: ['sk-SK', 'pl-PL', 'cs'] },
        'text_dogri':      { lang: 'doi-IN', fallbacks: ['hi-IN', 'pa-IN', 'en-IN'] },
        'text_dutch':      { lang: 'nl-NL', fallbacks: ['nl-BE', 'nl'] },
        'text_french':     { lang: 'fr-FR', fallbacks: ['fr-CA', 'fr-BE', 'fr'] },
        'text_german':     { lang: 'de-DE', fallbacks: ['de-AT', 'de-CH', 'de'] },
        'text_gujarati':   { lang: 'gu-IN', fallbacks: ['hi-IN', 'mr-IN', 'en-IN'] },
        'text_hebrew':     { lang: 'he-IL', fallbacks: ['he'] },
        'text_hindi':      { lang: 'hi-IN', fallbacks: ['hi'] },
        'text_hungarian':  { lang: 'hu-HU', fallbacks: ['hu'] },
        'text_igbo':       { lang: 'ig-NG', fallbacks: ['en-NG', 'en-US'] },
        'text_indonesian': { lang: 'id-ID', fallbacks: ['ms-MY', 'id'] },
        'text_italian':    { lang: 'it-IT', fallbacks: ['it-CH', 'it'] },
        'text_japanese':   { lang: 'ja-JP', fallbacks: ['ja'] },
        'text_kannada':    { lang: 'kn-IN', fallbacks: ['te-IN', 'ta-IN', 'hi-IN', 'en-IN'] },
        'text_korean':     { lang: 'ko-KR', fallbacks: ['ko'] },
        'text_malayalam':  { lang: 'ml-IN', fallbacks: ['ta-IN', 'kn-IN', 'hi-IN', 'en-IN'] },
        'text_manipuri':   { lang: 'mni-IN', fallbacks: ['bn-IN', 'as-IN', 'hi-IN', 'en-IN'] },
        'text_marathi':    { lang: 'mr-IN', fallbacks: ['hi-IN', 'gu-IN', 'en-IN'] },
        'text_nagamese':   { lang: 'as-IN', fallbacks: ['bn-IN', 'hi-IN', 'en-IN'] },
        'text_nepali':     { lang: 'ne-NP', fallbacks: ['hi-IN', 'en-IN'] },
        'text_norwegian':  { lang: 'nb-NO', fallbacks: ['no-NO', 'nn-NO', 'sv-SE', 'no'] },
        'text_odia':       { lang: 'or-IN', fallbacks: ['bn-IN', 'hi-IN', 'en-IN'] },
        'text_oromo':      { lang: 'om-ET', fallbacks: ['am-ET', 'en-US'] },
        'text_polish':     { lang: 'pl-PL', fallbacks: ['pl'] },
        'text_portuguese': { lang: 'pt-BR', fallbacks: ['pt-PT', 'pt'] },
        'text_punjabi':    { lang: 'pa-IN', fallbacks: ['hi-IN', 'ur-PK', 'en-IN'] },
        'text_romanian':   { lang: 'ro-RO', fallbacks: ['ro'] },
        'text_russian':    { lang: 'ru-RU', fallbacks: ['uk-UA', 'ru'] },
        'text_sanskrit':   { lang: 'sa-IN', fallbacks: ['hi-IN', 'mr-IN', 'en-IN'] },
        'text_somali':     { lang: 'so-SO', fallbacks: ['ar-SA', 'en-US'] },
        'text_spanish':    { lang: 'es-ES', fallbacks: ['es-MX', 'es-US', 'es'] },
        'text_swahili':    { lang: 'sw-KE', fallbacks: ['sw-TZ', 'en-US'] },
        'text_swedish':    { lang: 'sv-SE', fallbacks: ['da-DK', 'nb-NO', 'sv'] },
        'text_tagalog':    { lang: 'tl-PH', fallbacks: ['fil-PH', 'en-US'] },
        'text_tamil':      { lang: 'ta-IN', fallbacks: ['ta-LK', 'te-IN', 'hi-IN', 'en-IN'] },
        'text_telugu':     { lang: 'te-IN', fallbacks: ['kn-IN', 'ta-IN', 'hi-IN', 'en-IN'] },
        'text_thai':       { lang: 'th-TH', fallbacks: ['th'] },
        'text_turkish':    { lang: 'tr-TR', fallbacks: ['tr'] },
        'text_ukrainian':  { lang: 'uk-UA', fallbacks: ['ru-RU', 'pl-PL', 'uk'] },
        'text_urdu':       { lang: 'ur-PK', fallbacks: ['ar-SA', 'hi-IN', 'ur'] },
        'text_vietnamese': { lang: 'vi-VN', fallbacks: ['vi'] },
        'text_yoruba':     { lang: 'yo-NG', fallbacks: ['en-NG', 'en-US'] }
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
            };
        }
    }

    /**
     * Resolves the best available voice and matching language code
     * Prevents Chrome "language-unavailable" error by ensuring voice.lang matches utterance.lang
     */
    function resolveVoiceAndLang(langKey) {
        refreshVoices();

        const config = LANG_CONFIG[langKey] || LANG_CONFIG['text'];
        const targetLang = config.lang;
        const fallbackLangs = config.fallbacks || [];
        const allCandidates = [targetLang, targetLang.split('-')[0], ...fallbackLangs];

        if (!availableVoices || availableVoices.length === 0) {
            return { voice: null, lang: targetLang };
        }

        const naturalKeywords = [
            'natural', 'neural', 'google', 'premium', 'enhanced',
            'online', 'samantha', 'daniel', 'karen', 'serena',
            'microsoft', 'zira', 'david'
        ];

        // Search for best matching voice across candidate languages in priority order
        for (const candidate of allCandidates) {
            const candLower = candidate.toLowerCase().replace('_', '-');
            const candPrimary = candLower.split('-')[0];

            const matches = availableVoices.filter(v => {
                const vLang = (v.lang || '').toLowerCase().replace('_', '-');
                return vLang === candLower || vLang.startsWith(candPrimary);
            });

            if (matches.length > 0) {
                // Score matching voices to pick the most natural one
                let bestMatch = matches[0];
                let bestScore = -1;

                matches.forEach(v => {
                    let score = 0;
                    const vName = (v.name || '').toLowerCase();
                    const vLang = (v.lang || '').toLowerCase().replace('_', '-');

                    if (vLang === candLower) score += 20;
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

                // IMPORTANT: Return the matched voice AND its actual supported lang code
                return {
                    voice: bestMatch,
                    lang: bestMatch.lang || targetLang
                };
            }
        }

        // Final Fallback: Use system default voice or first available voice
        const fallbackVoice = availableVoices.find(v => v.default) || availableVoices[0];
        return {
            voice: fallbackVoice,
            lang: fallbackVoice ? fallbackVoice.lang : targetLang
        };
    }

    /**
     * Cleans raw HTML text into clean, natural human narration
     */
    function cleanTextForSpeech(rawHtml) {
        if (!rawHtml) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        // Remove verse numbers, speaker buttons, and badges
        tempDiv.querySelectorAll('.verse-number, .verse-speaker-btn, .game-badge, script, style').forEach(el => el.remove());

        let text = tempDiv.textContent || tempDiv.innerText || '';

        // Natural cadence cleaning
        text = text
            .replace(/[\r\n]+/g, ' ')               // Replace newlines with single space
            .replace(/^\s*\d+[\s:.]*/, '')          // Strip leading reference number
            .replace(/\[.*?\]/g, '')                // Remove bracketed footnotes
            .replace(/\(.*?\)/g, '')                // Remove parenthetical notes
            .replace(/“|”|"/g, '"')                 // Normalize quotes
            .replace(/‘|’|'/g, "'")                 // Normalize apostrophes
            .replace(/\s+/g, ' ')                   // Single spaces
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
        resolveVoiceAndLang: resolveVoiceAndLang
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
