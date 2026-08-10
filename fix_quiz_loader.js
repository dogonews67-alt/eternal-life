const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'www/script_v2.js');

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    // Regex to match the existing function body:
    // It starts with `async function loadQuizData() {`
    // And ends before `function getSelectedQuestions` (or close to it)

    // We'll define start and end markers to be safe
    const startMarker = 'async function loadQuizData() {';
    const endMarker = 'function getSelectedQuestions(';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error("Could not find start or end markers.");
        console.error("Start:", startIndex, "End:", endIndex);
        process.exit(1);
    }

    // Extract the block including comments/whitespace between the two functions if any
    const blockToReplace = content.substring(startIndex, endIndex);

    // Find the last closing brace in that block (end of loadQuizData)
    const functionEndIndex = blockToReplace.lastIndexOf('}');
    if (functionEndIndex === -1) {
        console.error("Could not find closing brace.");
        process.exit(1);
    }

    // The previous content ended at that brace.
    // We want to replace everything from startIndex up to (startIndex + functionEndIndex + 1)

    const originalFunction = content.substring(startIndex, startIndex + functionEndIndex + 1);

    // New function content
    const newFunction = `async function loadQuizData() {
    let lang = 'english';
    const currentLangKey = state.currentLang || state.preferredLang || 'text';

    // Map keys like 'text_tagalog' -> 'tagalog'
    if (currentLangKey.startsWith('text_')) {
        lang = currentLangKey.replace('text_', '');
    } else if (currentLangKey === 'text') {
        lang = 'english';
    }

    const expectedFilename = \`quiz/quiz_\${lang}.json\`;
    console.log(\`[QUIZ] Loading quiz data for language: \${lang} from \${expectedFilename}\`);

    // Helper: Robust XHR loader for Android local files
    const fetchLocalXHR = (url) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            // xhr.responseType = 'json'; // Removed to manually parse for safety
            xhr.onload = function() {
                if (xhr.status === 200 || xhr.status === 0) { // 0 is success for file://
                    try {
                        const json = JSON.parse(xhr.responseText);
                        resolve(json);
                    } catch (e) {
                        reject(new Error("Failed to parse JSON: " + e.message));
                    }
                } else {
                    reject(new Error(\`HTTP \${xhr.status}\`));
                }
            };
            xhr.onerror = () => reject(new Error("Network/File Error"));
            xhr.send();
        });
    };

    try {
        // Try loading localized quiz
        const data = await fetchLocalXHR(expectedFilename);
        console.log(\`[QUIZ] Successfully loaded \${lang} quiz.\`);
        return data;
    } catch (e) {
        console.warn(\`[QUIZ] Failed to load \${expectedFilename}, falling back to English.\`, e);
        
        // Fallback to English if we weren't already trying English
        if (lang !== 'english') {
            try {
                const fbData = await fetchLocalXHR('quiz/quiz_english.json');
                console.log("[QUIZ] Loaded English fallback.");
                return fbData;
            } catch (e2) {
                console.error("[QUIZ] Fallback to English failed.", e2);
                return null;
            }
        }
        return null;
    }
}`;

    // Perform replacement
    const newContent = content.substring(0, startIndex) + newFunction + content.substring(startIndex + functionEndIndex + 1);

    fs.writeFileSync(targetFile, newContent, 'utf8');
    console.log("Successfully replaced loadQuizData.");

} catch (e) {
    console.error("Error:", e);
    process.exit(1);
}
