/**
 * =========================================================
 * Natural Human Text-to-Speech (TTS) Module for Eternal Life
 * Supports multi-language natural voice selection & sentence cadence
 * =========================================================
 */

const TextToSpeech = (function () {
    let currentUtterance = null;
    let currentlySpeakingElement = null;
    let currentlySpeakingBtn = null;
    let availableVoices = [];
    let heartbeatTimer = null;

    // Language code map (App language key -> BCP-47 Language Tag)
    const LANG_CODE_MAP = {
        'text': 'en-US',
        'text_arabic': 'ar-SA',
        'text_assamese': 'as-IN',
        'text_bengali': 'bn-IN',
        'text_burmese': 'my-MM',
        'text_chinese': 'zh-CN',
        'text_czech': 'cs-CZ',
        'text_dogri': 'hi-IN',
        'text_dutch': 'nl-NL',
        'text_french': 'fr-FR',
        'text_german': 'de-DE',
        'text_gujarati': 'gu-IN',
        'text_hebrew': 'he-IL',
        'text_hindi': 'hi-IN',
        'text_hungarian': 'hu-HU',
        'text_igbo': 'ig-NG',
        'text_indonesian': 'id-ID',
        'text_italian': 'it-IT',
        'text_japanese': 'ja-JP',
        'text_kannada': 'kn-IN',
        'text_korean': 'ko-KR',
        'text_malayalam': 'ml-IN',
        'text_manipuri': 'mni-IN',
        'text_marathi': 'mr-IN',
        'text_nagamese': 'as-IN',
        'text_nepali': 'ne-NP',
        'text_norwegian': 'nb-NO',
        'text_odia': 'or-IN',
        'text_oromo': 'om-ET',
        'text_polish': 'pl-PL',
        'text_portuguese': 'pt-BR',
        'text_punjabi': 'pa-IN',
        'text_romanian': 'ro-RO',
        'text_russian': 'ru-RU',
        'text_sanskrit': 'sa-IN',
        'text_somali': 'so-SO',
        'text_spanish': 'es-ES',
        'text_swahili': 'sw-KE',
        'text_swedish': 'sv-SE',
        'text_tagalog': 'tl-PH',
        'text_tamil': 'ta-IN',
        'text_telugu': 'te-IN',
        'text_thai': 'th-TH',
        'text_turkish': 'tr-TR',
        'text_ukrainian': 'uk-UA',
        'text_urdu': 'ur-PK',
        'text_vietnamese': 'vi-VN',
        'text_yoruba': 'yo-NG'
    };

    // Initialize voices
    function initVoices() {
        if ('speechSynthesis' in window) {
            availableVoices = window.speechSynthesis.getVoices() || [];
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                    availableVoices = window.speechSynthesis.getVoices() || [];
                };
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVoices);
    } else {
        initVoices();
    }

    /**
     * Finds the best, most natural-sounding voice for a given BCP-47 language tag
     */
    function getBestNaturalVoice(langCode) {
        if (!availableVoices || availableVoices.length === 0) {
            if ('speechSynthesis' in window) {
                availableVoices = window.speechSynthesis.getVoices() || [];
            }
        }

        if (!availableVoices || availableVoices.length === 0) return null;

        const primaryLang = langCode.split('-')[0].toLowerCase();
        const fullLang = langCode.toLowerCase().replace('_', '-');

        // Filter voices matching the language
        const matchingVoices = availableVoices.filter(voice => {
            const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
            return vLang === fullLang || vLang.startsWith(primaryLang);
        });

        if (matchingVoices.length === 0) {
            // Fallback to default or English natural voice if not found
            return availableVoices.find(v => v.default) || availableVoices[0] || null;
        }

        // Keywords indicating high-quality / natural neural voices
        const naturalKeywords = [
            'natural', 'neural', 'google', 'premium', 'enhanced',
            'online', 'samantha', 'daniel', 'karen', 'serena',
            'microsoft', 'zira', 'david'
        ];

        // Score voices to find the most human sounding one
        let bestVoice = matchingVoices[0];
        let bestScore = -1;

        matchingVoices.forEach(voice => {
            let score = 0;
            const nameLower = (voice.name || '').toLowerCase();
            const langLower = (voice.lang || '').toLowerCase().replace('_', '-');

            // Exact language match bonus
            if (langLower === fullLang) score += 20;

            // Natural keyword bonus
            naturalKeywords.forEach(kw => {
                if (nameLower.includes(kw)) score += 15;
            });

            // Local service / non-synthetic bonus
            if (voice.localService) score += 5;
            if (voice.default) score += 3;

            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        });

        return bestVoice;
    }

    /**
     * Cleans verse text for natural human reading (removes HTML, numbers, brackets)
     */
    function cleanTextForSpeech(rawText) {
        if (!rawText) return '';

        // Create a temporary element to strip HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawText;

        // Remove verse numbers and speaker buttons
        const verseNums = tempDiv.querySelectorAll('.verse-number, .verse-speaker-btn');
        verseNums.forEach(el => el.remove());

        let text = tempDiv.textContent || tempDiv.innerText || '';

        // Clean up formatting for natural cadence
        text = text
            .replace(/[\r\n]+/g, ' ')               // Replace newlines with space
            .replace(/^\s*\d+[\s:.]*/, '')          // Strip leading verse number like "16." or "16:"
            .replace(/\[.*?\]/g, '')                // Remove bracketed footnotes
            .replace(/\(.*?\)/g, '')                // Remove parenthetical cross-references if any
            .replace(/“|”|"/g, '"')                 // Normalize quotes
            .replace(/‘|’|'/g, "'")                 // Normalize apostrophes
            .replace(/\s+/g, ' ')                   // Normalize spaces
            .trim();

        return text;
    }

    /**
     * Stop active speech and clear all visual indicators
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
                console.warn('Error cancelling speech synthesis:', e);
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
     * Toggle speech for a specific verse element
     */
    function toggleVerseSpeech(event, button) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        if (!('speechSynthesis' in window)) {
            alert('Text-to-Speech is not supported on this device/browser.');
            return;
        }

        const verseElement = button.closest('.verse');
        if (!verseElement) return;

        // If this verse is already speaking, stop it
        if (currentlySpeakingElement === verseElement) {
            stop();
            return;
        }

        // Stop any currently running speech
        stop();

        // Extract clean text to speak
        const textToSpeak = cleanTextForSpeech(verseElement.innerHTML);
        if (!textToSpeak) return;

        // Determine language code
        const currentLangKey = (typeof state !== 'undefined' && state.currentLang) ? state.currentLang : 'text';
        const langCode = LANG_CODE_MAP[currentLangKey] || 'en-US';

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = langCode;

        // Natural Human Cadence parameters
        utterance.rate = 0.95;  // Comfortable, human conversational speed
        utterance.pitch = 1.0; // Natural balanced pitch
        utterance.volume = 1.0;

        // Select best natural voice
        const bestVoice = getBestNaturalVoice(langCode);
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        // Set visual states
        currentlySpeakingElement = verseElement;
        currentlySpeakingBtn = button;
        verseElement.classList.add('verse-speaking');
        button.classList.add('is-speaking');
        currentUtterance = utterance;

        // Handle speech events
        utterance.onend = function () {
            stop();
        };

        utterance.onerror = function (e) {
            console.warn('Speech synthesis utterance error:', e);
            stop();
        };

        utterance.onpause = function () {
            // keep state
        };

        // Chromium/Android WebView heartbeat to prevent 15-second cutoff bug
        heartbeatTimer = setInterval(() => {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
            }
        }, 10000);

        try {
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('Error starting speech:', err);
            stop();
        }
    }

    return {
        toggleVerseSpeech: toggleVerseSpeech,
        stop: stop,
        getBestNaturalVoice: getBestNaturalVoice
    };
})();

// Export globally
window.TextToSpeech = TextToSpeech;
window.toggleVerseSpeech = TextToSpeech.toggleVerseSpeech;
window.stopSpeech = TextToSpeech.stop;
