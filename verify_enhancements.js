const fs = require('fs');
const path = require('path');

// --- MOCKS ---
class MockElement {
    constructor(idOrTag) {
        this.id = idOrTag;
        this.tagName = idOrTag ? idOrTag.toUpperCase() : 'DIV';
        this.style = {};
        this.classes = [];
        this.innerText = "";
        this.innerHTML = "";
        this.value = "";
        this.disabled = false;
        this.children = [];
        this.parentNode = {
            insertBefore: (newNode, refNode) => { }
        };
        this.dataset = { originalIndex: "0" };
    }

    get classList() {
        return {
            add: (c) => this.classes.push(c),
            remove: (c) => this.classes = this.classes.filter(x => x !== c),
            contains: (c) => this.classes.includes(c),
            toString: () => this.classes.join(' ')
        };
    }

    appendChild(child) { this.children.push(child); }
    querySelector(sel) { return new MockElement(sel); }
    querySelectorAll(sel) { return [new MockElement(sel), new MockElement(sel)]; } // Return dummy list
    setAttribute(k, v) { this[k] = v; }
}

const localStorageStore = {};
global.localStorage = {
    getItem: (k) => localStorageStore[k] || null,
    setItem: (k, v) => localStorageStore[k] = v.toString(),
    removeItem: (k) => delete localStorageStore[k]
};

global.document = {
    getElementById: (id) => new MockElement(id),
    querySelector: (sel) => new MockElement(sel),
    querySelectorAll: (sel) => [new MockElement(sel)],
    createElement: (tag) => new MockElement(tag)
};

global.window = global;
global.navigator = { userAgent: 'node' };
let alertMsg = "";
global.alert = (msg) => { alertMsg = msg; console.log('[ALERT]', msg); };
global.confirm = () => true;
global.console = console;
global.XMLHttpRequest = class { open() { }; send() { }; };

// --- READ SCRIPT ---
const scriptPath = path.join(__dirname, 'www', 'script_v2.js');
let code = fs.readFileSync(scriptPath, 'utf8');

// --- APPEND TESTS ---
const testCode = `
console.log("\\n--- TESTS START ---");

// 1. Test Best Score
console.log("\\n[Test 1] Best Score Persistence");
state.currentLang = 'text';
localStorage.removeItem('quiz_bestScore_text');

saveBestScore(100, 'text');
if (getBestScore('text') === 100) console.log("PASS: Saved 100");
else console.error("FAIL: Expected 100, got " + getBestScore('text'));

saveBestScore(50, 'text'); 
if (getBestScore('text') === 100) console.log("PASS: Kept 100 on lower score");
else console.error("FAIL: Expected 100, got " + getBestScore('text'));

saveBestScore(200, 'text'); 
if (getBestScore('text') === 200) console.log("PASS: Updated to 200");
else console.error("FAIL: Expected 200, got " + getBestScore('text'));


// 2. Test Progress Bar & End Game Logic
console.log("\\n[Test 2] Progress Bar & Win Logic");
state.quizIndex = 0;
window.currentQuizQuestions = Array(30).fill({question:"Q", options:["A","B","C","D"], correctAnswer:0});

// Mock getElementById to return specific mock for fill
const realGetEl = document.getElementById;
// We need to capture the fill element
let mockFill = new MockElement('quizProgressFill');
// We need to capture hint button
let mockHint = new MockElement('hintBtn');

document.getElementById = (id) => {
    if (id === 'quizProgressFill') return mockFill;
    if (id === 'hintBtn') return mockHint;
    return new MockElement(id);
};

renderQuestion();
console.log("Q1/30 Width:", mockFill.style.width, "Color:", mockFill.style.background);
if (mockFill.style.width && mockFill.style.background) console.log("PASS: Progress bar styled for Q1");

// Test End Game Win
console.log("\\n[Test 3] Win Condition");
state.quizIndex = 30; // completed all
state.quizScore = 3000;
endGame(true);
console.log("PASS: endGame executed without error");
// Check if best score was saved
if (getBestScore('text') === 3000) console.log("PASS: Win Saved Best Score 3000");
else console.error("FAIL: Best score not 3000");


// 3. Test Hint Cost
console.log("\\n[Test 4] Hint Cost");
state.quizScore = 200;
state.hintUsed = false;
alertMsg = "";

useHint();
if (alertMsg.includes("Not enough")) console.log("PASS: Blocked hint (200 coins)");
else console.error("FAIL: Did not block hint. Alert: " + alertMsg);

state.quizScore = 300;
state.hintUsed = false;
useHint();
if (state.quizScore === 0) console.log("PASS: Deducted 300 coins -> 0");
else console.error("FAIL: Score not 0. Score: " + state.quizScore);
`;

// --- EXECUTE ---
try {
    eval(code + "\\n" + testCode);
} catch (e) {
    console.error("RUNTIME ERROR:", e);
}
