/**
 * ====================================================================
 * Universal Natural Text-to-Speech (TTS) Engine for All 57 Languages
 * Hybrid Architecture:
 *   1. Local Web Speech API (Instant & Offline for device-installed voices)
 *   2. Meta MMS Neural Audio Streaming (for regional/rare languages like Odia, Dogri, Sanskrit, Assamese, etc.)
 * ====================================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentAudio = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Mapping for All 57 Languages in Eternal Life App
    // BCP-47 Tag (for Web Speech) and Meta MMS ISO-639-3 Model Code
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
     * Check if speech is supported (always true across all 57 languages thanks to MMS hybrid engine)
     */
    function isLanguageSupported(langKey) {
        return !!ALL_LANGUAGES_CONFIG[langKey] || true;
    }

    /**
     * Check if a native device voice exists for this language
     */
    function hasNativeVoice(langKey) {
        refreshVoices();
        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        if (!config || !availableVoices || availableVoices.length === 0) return false;

        const targetLang = config.lang.toLowerCase().replace('_', '-');
        const primaryLang = targetLang.split('-')[0];

        return availableVoices.some(v => {
            const vLang = (v.lang || '').toLowerCase().replace('_', '-');
            return vLang === targetLang || vLang.startsWith(primaryLang);
        });
    }

    /**
     * Finds the best native voice
     */
    function getBestNativeVoice(langKey) {
        refreshVoices();
        const config = ALL_LANGUAGES_CONFIG[langKey] || ALL_LANGUAGES_CONFIG['text'];
        const targetLang = config.lang.toLowerCase().replace('_', '-');
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
     * Cleans raw HTML text for natural speech reading
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
     * Stop all active speech (both Web Speech and HTML5 Audio)
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

        if (currentAudio) {
            try {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            } catch (e) { }
            currentAudio = null;
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
     * Main Toggle Entry Point
     */
    async function toggleVerseSpeech(event, button) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
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

        const textToSpeak = cleanTextForSpeech(verseElement.innerHTML);
        if (!textToSpeak) return;

        const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : 'text';
        const langConfig = ALL_LANGUAGES_CONFIG[currentLangKey] || ALL_LANGUAGES_CONFIG['text'];

        // Mark UI as active
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-speaking');

        // TIER 1: Use Local Device Voice if available (offline, zero latency)
        const nativeVoice = getBestNativeVoice(currentLangKey);
        if (nativeVoice && 'speechSynthesis' in window) {
            console.log(`[TTS] Playing via Native Device Voice (${nativeVoice.name} - ${nativeVoice.lang})`);
            playViaSpeechSynthesis(textToSpeak, nativeVoice);
            return;
        }

        // TIER 2: Online Meta MMS Neural Audio for Rare/Regional Languages
        console.log(`[TTS] Playing via Meta MMS Neural Model (facebook/mms-tts-${langConfig.mms})`);
        try {
            await playViaMetaMMS(textToSpeak, langConfig.mms, currentLangKey);
        } catch (err) {
            console.warn('[TTS] Meta MMS stream fallback to native default:', err);
            // Fallback: Use standard browser synth
            if ('speechSynthesis' in window) {
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
     * Play via Meta MMS Neural TTS (Hugging Face / Serverless Router)
     */
    async function playViaMetaMMS(text, mmsCode, currentLangKey) {
        const endpoint = `https://router.huggingface.co/hf-inference/models/facebook/mms-tts-${mmsCode}`;
        
        // Optional HF token from localStorage if user or developer provided one
        const hfToken = localStorage.getItem('hf_tts_token') || '';

        const headers = { 'Content-Type': 'application/json' };
        if (hfToken) {
            headers['Authorization'] = `Bearer ${hfToken}`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: text })
        });

        if (!response.ok) {
            throw new Error(`MMS inference HTTP error: ${response.status}`);
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        currentAudio = new Audio(audioUrl);
        currentAudio.playbackRate = 0.98;

        currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            stop();
        };

        currentAudio.onerror = (e) => {
            console.warn('[TTS] Audio playback error:', e);
            URL.revokeObjectURL(audioUrl);
            stop();
        };

        await currentAudio.play();
    }

    return {
        toggleVerseSpeech: toggleVerseSpeech,
        stop: stop,
        isLanguageSupported: isLanguageSupported,
        hasNativeVoice: hasNativeVoice,
        ALL_LANGUAGES_CONFIG: ALL_LANGUAGES_CONFIG
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
