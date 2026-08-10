/**
 * ====================================================================
 * Vercel Serverless Function: Text-to-Speech (TTS) Proxy for All 57 Languages
 * Endpoint: /api/tts?lang=[code]&text=[text]
 * Supports Meta MMS Neural Models (facebook/mms-tts-[code])
 * ====================================================================
 */

const https = require('https');

// Language Code to Meta MMS Model Map
const MMS_LANGUAGE_MAP = {
    'text':            'eng',
    'text_arabic':     'ara',
    'text_assamese':   'asm',
    'text_bengali':    'ben',
    'text_burmese':    'mya',
    'text_chinese':    'cmn',
    'text_czech':      'ces',
    'text_dogri':      'dgo',
    'text_dutch':      'nld',
    'text_french':     'fra',
    'text_german':     'deu',
    'text_gujarati':   'guj',
    'text_hebrew':     'heb',
    'text_hindi':      'hin',
    'text_hungarian':  'hun',
    'text_igbo':       'ibo',
    'text_indonesian': 'ind',
    'text_italian':    'ita',
    'text_japanese':   'jpn',
    'text_kannada':    'kan',
    'text_korean':     'kor',
    'text_malayalam':  'mal',
    'text_manipuri':   'mni',
    'text_marathi':    'mar',
    'text_nagamese':   'asm',
    'text_nepali':     'nep',
    'text_norwegian':  'nob',
    'text_odia':       'ory',
    'text_oromo':      'orm',
    'text_polish':     'pol',
    'text_portuguese': 'por',
    'text_punjabi':    'pan',
    'text_rohingya':   'rhg',
    'text_romanian':   'ron',
    'text_russian':    'rus',
    'text_sanskrit':   'san',
    'text_somali':     'som',
    'text_spanish':    'spa',
    'text_swahili':    'swh',
    'text_swedish':    'swe',
    'text_tagalog':    'tgl',
    'text_tamil':      'tam',
    'text_telugu':     'tel',
    'text_thai':       'tha',
    'text_turkish':    'tur',
    'text_ukrainian':  'ukr',
    'text_urdu':       'urd',
    'text_vietnamese': 'vie',
    'text_yoruba':     'yor'
};

function queryHuggingFaceMMS(modelCode, text, token) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ inputs: text });
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'EternalLifeApp/1.0'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: 'router.huggingface.co',
            path: `/hf-inference/models/facebook/mms-tts-${modelCode}`,
            method: 'POST',
            headers: headers
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        contentType: res.headers['content-type'] || 'audio/wav',
                        data: buffer
                    });
                } else {
                    reject(new Error(`HuggingFace returned status ${res.statusCode}: ${buffer.toString().substring(0, 150)}`));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(12000, () => {
            req.destroy(new Error('HuggingFace request timed out'));
        });

        req.write(payload);
        req.end();
    });
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const text = (req.query.text || req.query.q || (req.body && req.body.text) || '').trim();
        const langInput = (req.query.lang || req.query.tl || (req.body && req.body.lang) || 'text').trim();

        if (!text) {
            res.status(400).json({ error: 'Missing "text" parameter' });
            return;
        }

        // Resolve MMS model code
        const modelCode = MMS_LANGUAGE_MAP[langInput] || MMS_LANGUAGE_MAP[`text_${langInput}`] || langInput || 'eng';

        // Check for HF Token in environment variables or default
        const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '';

        console.log(`[TTS API] Synthesizing for language: ${langInput} (MMS Model: facebook/mms-tts-${modelCode}), Text length: ${text.length}`);

        const audioResult = await queryHuggingFaceMMS(modelCode, text, hfToken);

        // Cache audio responses for 1 day
        res.setHeader('Content-Type', audioResult.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
        res.status(200).send(audioResult.data);

    } catch (err) {
        console.error('[TTS API Error]:', err.message);
        res.status(500).json({
            error: 'Failed to synthesize speech',
            message: err.message
        });
    }
};
