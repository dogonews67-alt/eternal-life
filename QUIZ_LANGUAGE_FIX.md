# Quiz Language Loading Fix

## Problem
The quiz was not loading according to the selected language. When users changed the language in the settings, the quiz would continue to show questions in the previous language.

## Root Cause
1. The `setPreferredLanguage` function was calling a non-existent `changeLanguage` function
2. When the language was changed while the quiz was active, the quiz content was not being reloaded

## Solution Implemented

### 1. Created `changeLanguage` Function (line 2942)
This function handles language changes for different book types:
- **Bible**: Reloads Bible data with `loadBibleForCurrentLanguage()`
- **Eternal Life**: Reloads the book content with `loadLanguageData()`
- Shows loading indicators during the transition

### 2. Enhanced `setPreferredLanguage` Function (line 2979)
Added logic to detect if the quiz is currently active and reload it:
```javascript
// Check if quiz is currently active BEFORE calling changeLanguage
const isQuizActive = state.quizModeActive || dom.quizContainer.style.display === 'block';

// ... after changeLanguage completes ...

// If quiz is active, reload it with the new language
if (isQuizActive) {
    console.log('♻️ Quiz is active - reloading with new language:', langValue);
    showLoading("Loading quiz in new language...");
    try {
        await initializeQuiz();
    } catch (error) {
        console.error('Error reloading quiz after language change:', error);
    } finally {
        hideLoading();
    }
}
```

### 3. Updated Cache Busting
Changed `script.js` timestamp to `20260122173900` to ensure browsers load the updated JavaScript

## How It Works Now

1. User opens the quiz in English
2. User changes language to (e.g.) Hindi in settings
3. `setPreferredLanguage('text_hindi')` is called
4. Function detects quiz is active
5. `changeLanguage()` updates state and loads Hindi content for other books
6. Quiz is reinitialized with `initializeQuiz()`
7. `loadQuizData()` reads the updated `state.currentLang` ('text_hindi')
8. Quiz loads `quiz/quiz_hindi.json`
9. Questions now display in Hindi

## Testing
To verify the fix:
1. Open the app in browser (http://localhost:8000)
2. Open the quiz (shows English questions by default)
3. Click Settings → Change "Preferred Language" to any language
4. Quiz should automatically reload with questions in the new language
5. Verify the loading indicator appears briefly
6. Check browser console for: `♻️ Quiz is active - reloading with new language: text_<language>`

## Files Modified
- `script.js`: Added `changeLanguage()` function and enhanced `setPreferredLanguage()`
- `index.html`: Updated cache-busting timestamp
