// The Scroll Restorer - Crossword Puzzle Game
console.log('🎮 Scroll Restorer v8.9.3 loaded - Daily Refill - 2026-01-28 14:10');
console.log('✨ NEW FEATURES:');
console.log('  ✅ Pre-filled letters (1-2 per word) for easier start');
console.log('  ✅ Smart Cursor: Skips already correct letters');
console.log('  ✅ Smart Cursor: Skips already correct letters');
console.log('  ✅ Ink Policy: Hints cost 33% (Max 3), Words give +15% Ink');
console.log('  ✅ Global Ink: Persists across sessions');
console.log('  ✅ Daily Refill: Restores to 100% each day');
console.log('  ✅ Score System: Based on remaining Ink');
console.log('  ✅ Help Button with instructions');
console.log('  ✅ White close button (X) for better visibility');
console.log('  ✅ Next Level button on win screen');
console.log('  ✅ Word numbers in cells for better understanding');
console.log('  ✅ Native mobile keyboard support');
console.log('  ✅ Auto-advance to next cell');
console.log('  🐛 Fixed: Win popup dimensions & dismissal');

let scrollGameState = {
    levels: [],
    unlockedLevelIndex: 0,
    grid: [],
    selectedWord: null,
    selectedCell: null,
    ink: 100,
    completedWords: []
};

// Initialize the game
async function initScrollRestorer() {
    try {
        // Load progress
        const savedProgress = localStorage.getItem('scroll_unlocked_level');
        if (savedProgress) {
            scrollGameState.unlockedLevelIndex = parseInt(savedProgress, 10);
        }

        // Safety check: Ensure at least level 0 is unlocked
        if (isNaN(scrollGameState.unlockedLevelIndex) || scrollGameState.unlockedLevelIndex < 0) {
            scrollGameState.unlockedLevelIndex = 0;
        }

        // Use XMLHttpRequest instead of fetch for better local file support on Android
        const data = await loadJSON('scroll_restorer_assets/scroll_levels.json');

        if (!data || !data.levels) throw new Error('Invalid JSON format');

        scrollGameState.levels = data.levels;
        renderLevelSelection();
    } catch (error) {
        console.error('Failed to load scroll levels:', error);
        alert('Error loading levels: ' + error.message);
    }
}

// Helper to load JSON via XHR (works better with file:// protocol)
function loadJSON(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status === 0) { // 0 is success for file:// protocol
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(new Error("Failed to parse JSON: " + e.message));
                    }
                } else {
                    reject(new Error("XHR Failed: " + xhr.status));
                }
            }
        };
        xhr.onerror = function () {
            reject(new Error("XHR Network Error"));
        };
        xhr.send(null);
    });
}

// Toggle game visibility
function toggleScrollRestorer(show) {
    const container = document.getElementById('scrollRestorerContainer');
    if (show) {
        container.style.display = 'flex';
        initScrollRestorer(); // Reload to refresh locked states
    } else {
        container.style.display = 'none';
        // Show level select again
        document.getElementById('scrollLevelSelect').style.display = 'flex';

        // Return to main menu logic if needed, or just hide container
        // If "Back" button on level select is clicked, this hides the entire game container.
    }
}

// Render level selection screen
function renderLevelSelection() {
    const levelGrid = document.getElementById('levelGrid');
    levelGrid.innerHTML = '';

    scrollGameState.levels.forEach((level, index) => {
        const card = document.createElement('div');
        const isLocked = index > scrollGameState.unlockedLevelIndex;

        card.className = `level-card ${isLocked ? 'locked' : ''}`;

        let lockIcon = '';
        if (isLocked) {
            lockIcon = '<div style="font-size: 2rem; margin-bottom: 5px;">🔒</div>';
        }

        card.innerHTML = `${lockIcon}<h3>${level.title}</h3>`;

        if (!isLocked) {
            card.onclick = () => startLevel(index);
        }

        levelGrid.appendChild(card);
    });

    document.getElementById('scrollLevelSelect').style.display = 'flex';
}

// Start a level
function startLevel(levelIndex) {
    scrollGameState.currentLevelIndex = levelIndex;
    scrollGameState.currentLevel = scrollGameState.levels[levelIndex];
    // NOTE: Ink is NOT reset here anymore. It's global.
    scrollGameState.completedWords = [];
    scrollGameState.selectedWord = null;
    scrollGameState.selectedCell = null;
    scrollGameState.selectedOrientation = null;

    // Hide level select
    document.getElementById('scrollLevelSelect').style.display = 'none';

    // Update title
    document.getElementById('levelTitle').textContent = scrollGameState.currentLevel.title;

    // Build grid state
    buildGridState();

    // Reveal random letters for help
    revealRandomLetters();

    // Render grid
    renderCrosswordGrid();

    // Update ink bar
    updateInkBar();
}

// Build internal grid state from level data
function buildGridState() {
    const level = scrollGameState.currentLevel;
    const gridHeight = level.grid.length;
    const gridWidth = level.grid[0].length;

    // Initialize empty grid
    scrollGameState.grid = Array(gridHeight).fill(null).map(() =>
        Array(gridWidth).fill(null).map(() => ({
            letter: '',
            isEmpty: true,
            words: [], // Changed: array to support multiple words at intersections
            userLetter: '',
            isCorrect: false,
            isStatic: false // New: for pre-filled letters
        }))
    );

    // Place words in grid
    level.words.forEach((wordData, wordIndex) => {
        const { word, startX, startY, orientation } = wordData;
        for (let i = 0; i < word.length; i++) {
            const x = orientation === 'across' ? startX + i : startX;
            const y = orientation === 'down' ? startY + i : startY;

            // Safety check to prevent out of bounds access
            if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
                const cell = scrollGameState.grid[y][x];

                // If cell is empty, initialize it
                if (cell.isEmpty) {
                    cell.letter = word[i];
                    cell.isEmpty = false;
                    cell.userLetter = '';
                    cell.isCorrect = false;
                }

                // Add this word to the cell's words array (supports intersections)
                cell.words.push({
                    wordIndex: wordIndex,
                    orientation: orientation
                });
            } else {
                console.error(`Word "${word}" at position (${x}, ${y}) is out of bounds. Grid size: ${gridWidth}x${gridHeight}`);
            }
        }
    });
}

// Reveal 1 or 2 random letters per word
function revealRandomLetters() {
    scrollGameState.currentLevel.words.forEach((wordData, wordIndex) => {
        const wordLen = wordData.word.length;
        // 1 letter for short words (<=4), 2 for long words (>4)
        const revealCount = wordLen <= 4 ? 1 : 2;

        let revealed = 0;
        let attempts = 0;

        while (revealed < revealCount && attempts < 20) {
            attempts++;
            const charIndex = Math.floor(Math.random() * wordLen);

            const x = wordData.orientation === 'across' ? wordData.startX + charIndex : wordData.startX;
            const y = wordData.orientation === 'down' ? wordData.startY + charIndex : wordData.startY;

            const cell = scrollGameState.grid[y][x];

            // Only reveal if not already revealed/correct
            if (!cell.isEmpty && !cell.isCorrect) {
                cell.userLetter = cell.letter;
                cell.isCorrect = true;
                cell.isStatic = true; // Mark as unchangeable
                revealed++;
            }
        }
    });
}

// Render crossword grid
function renderCrosswordGrid() {
    const gridContainer = document.getElementById('crosswordGrid');
    const grid = scrollGameState.grid;

    gridContainer.innerHTML = '';
    // Set column count for CSS dynamic sizing
    gridContainer.style.setProperty('--col-count', grid[0].length);

    gridContainer.style.gridTemplateColumns = `repeat(${grid[0].length}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${grid.length}, auto)`; // Use auto so CSS determines cell height

    grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'crossword-cell';
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;

            if (cell.isEmpty) {
                cellDiv.classList.add('empty');
            } else {
                // Add word number labels for first cells of any words this cell belongs to
                // Typically a cell is only the start of one word, but we check all.
                let wordNum = '';
                cell.words.forEach(wInfo => {
                    if (isFirstCellOfWord(x, y, wInfo.wordIndex)) {
                        wordNum = wInfo.wordIndex + 1;
                    }
                });

                cellDiv.innerHTML = `
                    ${wordNum ? `<span class="word-number">${wordNum}</span>` : ''}
                    <span class="cell-letter">${cell.userLetter}</span>
                `;
                cellDiv.onclick = () => selectCell(x, y);

                // Check if ALL words this cell belongs to are correct/complete
                // Or if it's at least correct for the user input
                if (cell.isCorrect) {
                    cellDiv.classList.add('correct');
                }
            }

            gridContainer.appendChild(cellDiv);
        });
    });
}

// Check if this is the first cell of a word
function isFirstCellOfWord(x, y, wordIndex) {
    if (wordIndex === null || wordIndex === undefined) return false;
    const word = scrollGameState.currentLevel.words[wordIndex];
    return word.startX === x && word.startY === y;
}

// Select a cell
function selectCell(x, y) {
    const cell = scrollGameState.grid[y][x];
    if (cell.isEmpty) return;

    // If clicking the SAME cell, toggle orientation if it's an intersection
    if (scrollGameState.selectedCell && scrollGameState.selectedCell.x === x && scrollGameState.selectedCell.y === y) {
        if (cell.words.length > 1) {
            const currentWordIndex = scrollGameState.selectedWord;
            const otherWord = cell.words.find(w => w.wordIndex !== currentWordIndex);
            if (otherWord) {
                scrollGameState.selectedWord = otherWord.wordIndex;
                scrollGameState.selectedOrientation = otherWord.orientation;
            }
        }
    } else {
        scrollGameState.selectedCell = { x, y };

        // Pick a word for this cell
        // If the cell belongs to multiple words, try to keep the current orientation if valid
        let targetWord = cell.words[0];
        if (scrollGameState.selectedOrientation) {
            const sameOrientWord = cell.words.find(w => w.orientation === scrollGameState.selectedOrientation);
            if (sameOrientWord) targetWord = sameOrientWord;
        }

        scrollGameState.selectedWord = targetWord.wordIndex;
        scrollGameState.selectedOrientation = targetWord.orientation;
    }

    // Highlight the word
    highlightWord(scrollGameState.selectedWord);

    // Show clue
    const wordData = scrollGameState.currentLevel.words[scrollGameState.selectedWord];
    document.getElementById('currentClue').textContent = wordData.clue;

    // Focus hidden input to trigger mobile keyboard
    const input = document.getElementById('scrollKeyboardInput');
    if (input) {
        input.value = '';
        input.focus();
    }
}

// Highlight word cells
function highlightWord(wordIndex) {
    // Clear previous highlights
    document.querySelectorAll('.crossword-cell').forEach(c => {
        c.classList.remove('highlighted', 'active');
    });

    // Highlight current word
    scrollGameState.grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            // Check if this cell belongs to the selected word
            const belongsToWord = cell.words.some(w => w.wordIndex === wordIndex);
            if (belongsToWord) {
                const cellDiv = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                if (cellDiv) cellDiv.classList.add('highlighted');
            }
        });
    });

    // Mark active cell
    if (scrollGameState.selectedCell) {
        const { x, y } = scrollGameState.selectedCell;
        const cellDiv = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (cellDiv) cellDiv.classList.add('active');
    }
}

// Handle key input from virtual keyboard or physical keyboard
function handleScrollInput(letter) {
    if (!scrollGameState.selectedCell) return;

    const { x, y } = scrollGameState.selectedCell;
    const cell = scrollGameState.grid[y][x];

    // Don't allow changing static (pre-filled) cells
    if (cell.isStatic) {
        moveToNextCell();
        return;
    }

    // Set letter
    cell.userLetter = letter.toUpperCase();

    // Check if correct
    cell.isCorrect = (cell.userLetter === cell.letter);

    // Re-render
    renderCrosswordGrid();

    // Re-apply highlights after rendering
    if (scrollGameState.selectedWord !== null) {
        highlightWord(scrollGameState.selectedWord);
    }

    // Move to next cell in word
    moveToNextCell();

    // Check completion for ALL words this cell belongs to
    cell.words.forEach(wInfo => {
        checkSpecificWordComplete(wInfo.wordIndex);
    });

    // Check if puzzle is complete
    checkPuzzleComplete();
}

// Check if a specific word is complete and correct
function checkSpecificWordComplete(wordIndex) {
    if (wordIndex === null || wordIndex === undefined) return;

    let isComplete = true;
    let isCorrect = true;

    scrollGameState.grid.forEach(row => {
        row.forEach(cell => {
            const belongsToWord = cell.words.some(w => w.wordIndex === wordIndex);
            if (belongsToWord && !cell.isEmpty) {
                if (!cell.userLetter) isComplete = false;
                if (cell.userLetter !== cell.letter) isCorrect = false;
            }
        });
    });

    if (isComplete && isCorrect && !scrollGameState.completedWords.includes(wordIndex)) {
        scrollGameState.completedWords.push(wordIndex);

        // REWARD: Add Ink for completing a word
        scrollGameState.ink = Math.min(100, scrollGameState.ink + 15);
        updateInkBar();

        renderCrosswordGrid();
    }
}

// Move cursor to next cell (Smart Skip)
function moveToNextCell() {
    if (!scrollGameState.selectedCell || scrollGameState.selectedWord === null) return;

    let { x, y } = scrollGameState.selectedCell;
    const wordIndex = scrollGameState.selectedWord;
    const orientation = scrollGameState.selectedOrientation;

    // Safety check for infinite loop
    let steps = 0;
    const maxSteps = Math.max(scrollGameState.grid.length, scrollGameState.grid[0].length);

    while (steps < maxSteps) {
        steps++;

        // Calculate next position
        const nextX = orientation === 'across' ? x + 1 : x;
        const nextY = orientation === 'down' ? y + 1 : y;

        // Check bounds
        if (nextY >= scrollGameState.grid.length || nextX >= scrollGameState.grid[0].length) {
            break; // End of grid/word
        }

        const nextCell = scrollGameState.grid[nextY][nextX];

        // Check if cell has word data
        if (!nextCell || !nextCell.words) break;

        // Check if the next cell belongs to the current word
        const sameWord = nextCell.words.some(w => w.wordIndex === wordIndex);

        // If not checking same word or it's a black/empty cell, we reached end of word
        if (!sameWord || nextCell.isEmpty) {
            break;
        }

        // If cell is already correctly filled (user input or pre-filled), SKIP IT
        if (nextCell.isCorrect) {
            // Update current position and continue loop looking for next cell
            x = nextX;
            y = nextY;
            continue;
        }

        // If we get here, it's a cell that needs input (not correct)
        selectCell(nextX, nextY);
        return;
    }
}

// Check if current word is complete and correct
function checkWordComplete() {
    if (scrollGameState.selectedWord === null) return;

    const wordIndex = scrollGameState.selectedWord;
    let isComplete = true;
    let isCorrect = true;

    scrollGameState.grid.forEach(row => {
        row.forEach(cell => {
            // Check if this cell belongs to the word we're checking
            const belongsToWord = cell.words.some(w => w.wordIndex === wordIndex);
            if (belongsToWord && !cell.isEmpty) {
                if (!cell.userLetter) isComplete = false;
                if (cell.userLetter !== cell.letter) isCorrect = false;
            }
        });
    });

    if (isComplete && isCorrect && !scrollGameState.completedWords.includes(wordIndex)) {
        scrollGameState.completedWords.push(wordIndex);
        renderCrosswordGrid();
    }
}

// Check if puzzle is complete
function checkPuzzleComplete() {
    const allCorrect = scrollGameState.grid.every(row =>
        row.every(cell => cell.isEmpty || cell.isCorrect)
    );

    if (allCorrect) {
        showWinPopup();
    }
}

// Show win popup
function showWinPopup() {
    // Safety check: remove any existing popup first
    const existingPopup = document.querySelector('.scroll-win-popup');
    if (existingPopup) existingPopup.remove();

    const currentLevel = scrollGameState.currentLevel;
    const hasNextLevel = scrollGameState.currentLevelIndex < scrollGameState.levels.length - 1;

    // Save Progress
    const nextLevelIndex = scrollGameState.currentLevelIndex + 1;
    if (nextLevelIndex > scrollGameState.unlockedLevelIndex) {
        scrollGameState.unlockedLevelIndex = nextLevelIndex;
        localStorage.setItem('scroll_unlocked_level', scrollGameState.unlockedLevelIndex);
    }

    const nextLevelButton = hasNextLevel
        ? `<button class="primary-btn" onclick="nextLevel()">Next Level ➡️</button>`
        : '';

    // Calculate Score
    const levelBaseScore = 1000 * (scrollGameState.currentLevelIndex + 1);
    const inkBonus = Math.round(scrollGameState.ink * 10);
    const totalScore = levelBaseScore + inkBonus;

    const popup = document.createElement('div');
    popup.className = 'scroll-win-popup';
    popup.innerHTML = `
        <h3>✨ Scroll Restored! ✨</h3>
        <div class="restored-verse">
            <p><em>${currentLevel.verse}</em></p>
            <p><strong>${currentLevel.verseReference}</strong></p>
        </div>
        <div class="level-score" style="margin: 15px 0; font-size: 1.2rem; color: #5d4037;">
            <strong>Score: ${totalScore}</strong>
            <br><span style="font-size: 0.9rem;">(Ink Bonus: +${inkBonus})</span>
        </div>
        ${nextLevelButton}
        <button class="secondary-btn" onclick="closeWinPopup()">Back to Levels</button>
    `;

    document.getElementById('scrollRestorerContainer').appendChild(popup);
}

// Close win popup
function closeWinPopup() {
    const popup = document.querySelector('.scroll-win-popup');
    if (popup) popup.remove();
    renderLevelSelection();
}

// Toggle Help Modal
function toggleScrollHelp(show) {
    const modal = document.getElementById('scrollHelpModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    }
}

// Next level function
function nextLevel() {
    const popup = document.querySelector('.scroll-win-popup');
    if (popup) popup.remove();

    const nextLevelIndex = scrollGameState.currentLevelIndex + 1;
    if (nextLevelIndex < scrollGameState.levels.length) {
        startLevel(nextLevelIndex);
    }
}

// Use hint (reveal one letter, cost 33% ink)
function useScrollHint() {
    // Cost increased to ~33% to limit usage to 3 times initially
    const hintCost = 33;
    if (scrollGameState.ink < hintCost) {
        alert('Not enough ink! Solve words to get more ink.');
        return;
    }

    // Find an empty cell in the selected word
    if (scrollGameState.selectedWord === null) {
        alert('Please select a word first!');
        return;
    }

    const wordIndex = scrollGameState.selectedWord;
    let hintGiven = false;

    scrollGameState.grid.forEach(row => {
        row.forEach(cell => {
            if (!hintGiven && !cell.isEmpty && !cell.isCorrect) {
                // Check if this cell belongs to the selected word
                const belongsToWord = cell.words.some(w => w.wordIndex === wordIndex);
                if (belongsToWord) {
                    cell.userLetter = cell.letter;
                    cell.isCorrect = true;
                    hintGiven = true;
                }
            }
        });
    });

    if (hintGiven) {
        const hintCost = 33;
        scrollGameState.ink -= hintCost;
        if (scrollGameState.ink < 0) scrollGameState.ink = 0;

        updateInkBar();
        renderCrosswordGrid();
        checkWordComplete();
        checkPuzzleComplete();
    }
}

// Update ink bar
function updateInkBar() {
    // Save element state
    localStorage.setItem('scroll_ink', scrollGameState.ink);

    const inkBar = document.getElementById('inkBarFill');
    if (inkBar) {
        inkBar.style.width = `${scrollGameState.ink}%`;
    }
}

// Mobile keyboard support via hidden input
document.addEventListener('DOMContentLoaded', () => {
    // Load Global Ink and Check Daily Refill
    const savedInk = localStorage.getItem('scroll_ink');
    const lastRefillDate = localStorage.getItem('scroll_last_refill_date');
    const today = new Date().toDateString();

    if (lastRefillDate !== today) {
        // New Day! Refill Ink
        scrollGameState.ink = 100;
        localStorage.setItem('scroll_last_refill_date', today);
        localStorage.setItem('scroll_ink', 100);
        console.log('📅 Daily Refill: Ink restored to 100%');
        // Alert removed per user request
        // setTimeout(() => {
        //    alert('📅 New Day! Your Magic Ink has been refilled to 100%!');
        // }, 2000);
    } else {
        // Same day, load saved ink or default to 100 if missing
        scrollGameState.ink = savedInk !== null ? parseInt(savedInk) : 100;
        console.log(`🖌️ Loaded Ink: ${scrollGameState.ink}%`);
    }

    // Load unlocked level
    const savedLevel = localStorage.getItem('scroll_unlocked_level');
    scrollGameState.unlockedLevelIndex = savedLevel ? parseInt(savedLevel) : 0;

    renderLevelSelection();

    const keyboardInput = document.getElementById('scrollKeyboardInput');
    if (keyboardInput) {
        keyboardInput.addEventListener('input', (e) => {
            if (document.getElementById('scrollRestorerContainer').style.display === 'flex') {
                const letter = e.target.value.toUpperCase();
                if (letter && letter.match(/[A-Z]/)) {
                    handleScrollInput(letter);
                    e.target.value = ''; // Clear for next input
                }
            }
        });
    }
});

// Physical keyboard support (desktop/laptop)
document.addEventListener('keydown', (e) => {
    if (document.getElementById('scrollRestorerContainer').style.display === 'flex') {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            handleScrollInput(e.key);
            e.preventDefault();
        }
    }
});
