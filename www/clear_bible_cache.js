// TEMPORARY: Clear Bible Cache Script
// Run this in browser console to clear all cached Bible data

async function clearAllBibleCache() {
    console.log("🗑️ Starting Bible cache clearing...");

    // 1. Clear IndexedDB
    try {
        const dbName = 'BibleReaderDB';
        console.log(`Deleting IndexedDB: ${dbName}`);
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => {
                console.log("✅ IndexedDB deleted");
                resolve();
            };
            deleteRequest.onerror = () => {
                console.log("❌ Error deleting IndexedDB");
                reject();
            };
        });
    } catch (e) {
        console.error("Error clearing IndexedDB:", e);
    }

    // 2. Clear localStorage Bible data
    try {
        console.log("Clearing localStorage Bible data...");
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('bible_') || key.startsWith('text_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`  Removed: ${key}`);
        });
        console.log(`✅ Cleared ${keysToRemove.length} localStorage items`);
    } catch (e) {
        console.error("Error clearing localStorage:", e);
    }

    // 3. Clear any Cordova file storage (if applicable)
    if (window.cordova && window.cordova.file) {
        console.log("📱 Cordova detected - clearing file storage...");
        // This would need proper implementation based on your storage structure
        console.log("⚠️ Manual file deletion may be needed for Cordova");
    }

    console.log("✅ Cache clearing complete!");
    console.log("🔄 Please reload the page now");
}

// Run the function
clearAllBibleCache().then(() => {
    console.log("====================================");
    console.log("CACHE CLEARED SUCCESSFULLY");
    console.log("Please reload the page (Ctrl+Shift+R)");
    console.log("====================================");
});
