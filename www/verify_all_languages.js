const https = require('https');
const http = require('http');

// Mock browser globals for api.js if needed (or just implement fetch logic here directly)
// implementing fetch logic directly to avoid dependency issues with api.js in node

// Extracted from script_v2.js
const BIBLE_CONFIG = {
    'text': { sources: [{ type: 'BOLLS', id: 'BSB' }] },
    'text_arabic': { sources: [{ type: 'HELLOAO', id: 'ARBNAV', lang: 'arb' }] },
    'text_assamese': { sources: [{ type: 'HELLOAO', id: 'asm_irv', lang: 'asm' }] },
    'text_bengali': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Bengali' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_bhutanese': { sources: [], unavailable: true },
    'text_burmese': { sources: [{ type: 'HELLOAO', id: 'mya_jvb' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_chinese': { sources: [{ type: 'HELLOAO', id: 'cmn_cu1' }] },
    'text_czech': { sources: [{ type: 'BOLLS', id: 'CSP09' }] },
    'text_dogri': { sources: [{ type: 'LOCAL_BIBLE', path: 'dogri_bible_json' }] },
    'text_dutch': { sources: [{ type: 'BOLLS', id: 'NLD' }] },
    'text_french': { sources: [{ type: 'HELLOAO', id: 'fra_lsg' }] },
    'text_german': { sources: [{ type: 'BOLLS', id: 'SCH' }] },
    'text_greek': { sources: [], unavailable: true },
    'text_gujarati': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Gujarati' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_hebrew': { sources: [], unavailable: true },
    'text_hindi': { sources: [{ type: 'BOLLS', id: 'HIOV' }] },
    'text_hungarian': { sources: [{ type: 'BOLLS', id: 'RUF' }] },
    'text_igbo': { sources: [{ type: 'HELLOAO', id: 'ibo_bib' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_indonesian': { sources: [{ type: 'BOLLS', id: 'TB' }] },
    'text_italian': { sources: [{ type: 'HELLOAO', id: 'ita_riv' }] },
    'text_japanese': { sources: [{ type: 'BOLLS', id: 'JPKJV' }] },
    'text_kannada': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Kannada' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_kashmiri': { sources: [], unavailable: true },
    'text_konkani': { sources: [], unavailable: true },
    'text_korean': { sources: [{ type: 'HELLOAO', id: 'kor_old' }] },
    'text_malay': { sources: [], unavailable: true },
    'text_malayalam': { sources: [{ type: 'BOLLS', id: 'MOV' }] },
    'text_manipuri': { sources: [{ type: 'HELLOAO', id: 'mni_twf', lang: 'mni' }] },
    'text_marathi': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Marathi' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_mongolian': { sources: [], unavailable: true },
    'text_nagamese': { sources: [{ type: 'HELLOAO', id: 'nag_isv', lang: 'nag' }] },
    'text_nepali': { sources: [{ type: 'BOLLS', id: 'NNRV' }] },
    'text_norwegian': { sources: [{ type: 'BOLLS', id: 'DNB' }] },
    'text_odia': { sources: [{ type: 'HELLOAO', id: 'ory_irv' }] },
    'text_oromo': { sources: [{ type: 'HELLOAO', id: 'gaz_bib' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_polish': { sources: [{ type: 'BOLLS', id: 'BG' }] },
    'text_portuguese': { sources: [{ type: 'HELLOAO', id: 'por_blj' }, { type: 'BOLLS', id: 'ARC09' }] },
    'text_punjabi': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Punjabi' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_romanian': { sources: [{ type: 'BOLLS', id: 'VDCL' }] },
    'text_rohingya': {
        sources: [{
            type: 'GITHUB_CUSTOM',
            url: 'https://raw.githubusercontent.com/dogonews67-alt/rohingya-bible/master/rohingya_bible.json',
        }]
    },
    'text_russian': { sources: [{ type: 'HELLOAO', id: 'rus_syn' }] },
    'text_sanskrit': { sources: [{ type: 'HELLOAO', id: 'san_dev' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_somali': { sources: [{ type: 'HELLOAO', id: 'som_sim' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_spanish': { sources: [{ type: 'HELLOAO', id: 'spa_r09' }] },
    'text_swahili': { sources: [{ type: 'HELLOAO', id: 'swh_ulb' }] },
    'text_swedish': { sources: [{ type: 'HELLOAO', id: 'swe_svk', lang: 'swe' }] },
    'text_tagalog': { sources: [{ type: 'HELLOAO', id: 'tgl_ulb' }] },
    'text_tamil': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Tamil' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_telugu': { sources: [{ type: 'GITHUB_GODLYTALIAS', lang: 'Telugu' }, { type: 'BOLLS', id: 'YLT' }] },
    'text_thai': { sources: [{ type: 'HELLOAO', id: 'tha_kjv' }] },
    'text_tibetan': { sources: [], unavailable: true },
    'text_turkish': { sources: [{ type: 'HELLOAO', id: 'tur_obt' }] },
    'text_urdu': { sources: [], unavailable: true },
    'text_vietnamese': { sources: [{ type: 'HELLOAO', id: 'vie_1934' }] },
    'text_yoruba': { sources: [{ type: 'HELLOAO', id: 'yor_bib' }, { type: 'BOLLS', id: 'YLT' }] }
};

const API_BASE = 'https://bolls.life';

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        // Attempt to parse JSON
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        // Some endpoints might return text or HTML on error
                        if (url.includes('GITHUB_CUSTOM')) resolve(data); // Special case for large JSON file
                        else reject(new Error(`Invalid JSON: ${e.message} (Content start: ${data.substring(0, 50)})`));
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 50)}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Map of standard book IDs to ensure test coverage (Matthew 1 is safer for NT-only Bibles)
const TEST_BOOK_ID = 'MAT';
const TEST_CHAPTER = 1;

async function checkTranslation(langKey, config) {
    if (config.unavailable) {
        console.log(`[SKIP] ${langKey}: Marked unavailable`);
        return true;
    }

    const source = config.sources[0]; // Check primary source
    if (!source) {
        console.log(`[FAIL] ${langKey}: No sources defined`);
        return false;
    }

    let url = '';
    const sourceType = source.type;
    const translationId = source.id;

    if (sourceType === 'BOLLS') {
        url = `${API_BASE}/get-chapter/${translationId}/${TEST_BOOK_ID}/${TEST_CHAPTER}/`;
    } else if (sourceType === 'HELLOAO') {
        // Updated logic with chapter ID!
        url = `https://bible.helloao.org/api/${translationId}/${TEST_BOOK_ID}/${TEST_CHAPTER}.json`;
    } else if (sourceType === 'GITHUB_GODLYTALIAS') {
        // Correct logic matching script_v2.js: 
        // https://raw.githubusercontent.com/godlytalias/Bible-Database/master/${lang}/bible.json
        const langName = source.lang;
        url = `https://raw.githubusercontent.com/godlytalias/Bible-Database/master/${encodeURIComponent(langName)}/bible.json`;
    } else if (sourceType === 'GITHUB_CUSTOM') {
        url = source.url;
    } else if (sourceType === 'LOCAL_BIBLE') {
        console.log(`[SKIP] ${langKey}: LOCAL_BIBLE (cannot test in Node without file access logic)`);
        return true;
    }

    // Perform the fetch
    try {
        // console.log(`Testing ${langKey} (${sourceType} ${translationId})...`);
        const result = await fetchUrl(url);

        // Simple validation
        if (sourceType === 'GITHUB_CUSTOM' || sourceType === 'GITHUB_GODLYTALIAS') {
            // Expecting a large JSON object/array
            if (result && (Array.isArray(result) || typeof result === 'object')) {
                console.log(`[PASS] ${langKey}: ${sourceType} loaded`);
                return true;
            }
        } else {
            // Expecting chapter array or object
            // BOLLS: [{verse...}, ...]
            // HELLOAO: { chapter: { content: [...] } }
            if (result && (Array.isArray(result) || result.chapter)) {
                console.log(`[PASS] ${langKey}: ${sourceType} ${translationId}`);
                return true;
            }
        }

        console.log(`[FAIL] ${langKey}: Invalid data structure`);
        return false;

    } catch (e) {
        console.log(`[FAIL] ${langKey}: ${e.message} (${url})`);
        return false;
    }
}

async function runVerification() {
    console.log("Starting verification of all languages...");
    const results = [];
    const keys = Object.keys(BIBLE_CONFIG);

    // Run sequentially to avoid rate limiting
    for (const key of keys) {
        const success = await checkTranslation(key, BIBLE_CONFIG[key]);
        results.push({ key, success });
        // Small delay
        await new Promise(r => setTimeout(r, 200));
    }

    console.log("\n--- SUMMARY ---");
    const diff = results.filter(r => !r.success);
    if (diff.length === 0) {
        console.log("All configured languages passed verification!");
    } else {
        console.log(`Failures (${diff.length}):`);
        diff.forEach(r => console.log(`- ${r.key}`));
    }
}

runVerification();
