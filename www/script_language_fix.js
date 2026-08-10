// Add missing setPreferredLanguage function
async function setPreferredLanguage(langKey) {
    console.log('Setting preferred language to:', langKey);
    state.preferredLang = langKey;
    state.currentLang = langKey;

    // Load the Bible in the selected language
    if (state.currentBookKey === 'bible') {
        await loadBibleForCurrentLanguage(langKey);
    }

    // Save state
    saveReadingState();
}

// Add function to update dropdown to show current language
function updateLanguageDropdown() {
    const selector = document.getElementById('preferredLangSelector');
    if (selector && state.currentLang) {
        selector.value = state.currentLang;
    }
}
