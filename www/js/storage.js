/**
 * Storage Module for Bible Downloads
 * Handles both browser (IndexedDB) and Cordova (File API) storage
 */

const BibleStorage = {
    DB_NAME: 'BibleStorage',
    STORE_NAME: 'downloadedBibles',
    FOLDER_NAME: 'bibles',

    /**
     * Initialize storage (opens IndexedDB for browser)
     */
    async init() {
        if (this.isCordova()) {
            // Cordova: Wait for device ready
            return new Promise(resolve => {
                if (window.cordova && typeof cordova !== 'undefined') {
                    document.addEventListener('deviceready', resolve, false);
                } else {
                    resolve();
                }
            });
        } else {
            // Browser: Open IndexedDB
            return this.openDB();
        }
    },

    /**
     * Check if running in Cordova environment
     */
    isCordova() {
        return typeof cordova !== 'undefined' && cordova.file;
    },

    /**
     * Open IndexedDB (browser only)
     */
    async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME, { keyPath: 'language' });
                }
            };
        });
    },

    /**
     * Save Bible data to storage
     * @param {string} langKey - Language key (e.g., 'text_hindi')
     * @param {object} bibleData - Complete Bible data object
     */
    async saveBible(langKey, bibleData) {
        if (this.isCordova()) {
            return this.saveBibleToCordova(langKey, bibleData);
        } else {
            return this.saveBibleToIndexedDB(langKey, bibleData);
        }
    },

    /**
     * Save to IndexedDB (browser)
     */
    async saveBibleToIndexedDB(langKey, bibleData) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);

            const record = {
                language: langKey,
                data: bibleData,
                downloadDate: new Date().toISOString(),
                version: 1
            };

            const request = store.put(record);
            request.onsuccess = () => {
                // console.log(`Bible saved to IndexedDB: ${langKey}`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Save to device file system (Cordova)
     */
    async saveBibleToCordova(langKey, bibleData) {
        return new Promise(async (resolve, reject) => {
            try {
                const dataDirectory = cordova.file.dataDirectory;

                // Get/create bibles directory
                const dirEntry = await new Promise((res, rej) => {
                    window.resolveLocalFileSystemURL(dataDirectory, (entry) => {
                        entry.getDirectory(this.FOLDER_NAME, { create: true }, res, rej);
                    }, rej);
                });

                // Create file
                const fileName = `${langKey}.json`;
                const fileEntry = await new Promise((res, rej) => {
                    dirEntry.getFile(fileName, { create: true }, res, rej);
                });

                // Write data
                await new Promise((res, rej) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onwriteend = () => {
                            // console.log(`Bible saved to device: ${fileName}`);
                            res();
                        };
                        fileWriter.onerror = rej;

                        const blob = new Blob([JSON.stringify(bibleData)],
                            { type: 'application/json' });
                        fileWriter.write(blob);
                    });
                });

                resolve();
            } catch (error) {
                console.error('Error saving Bible to Cordova:', error);
                reject(error);
            }
        });
    },

    /**
     * Load Bible data from storage
     * @param {string} langKey - Language key
     * @returns {object|null} Bible data or null if not found
     */
    async loadBible(langKey) {
        if (this.isCordova()) {
            return this.loadBibleFromCordova(langKey);
        } else {
            return this.loadBibleFromIndexedDB(langKey);
        }
    },

    /**
     * Load from IndexedDB (browser)
     */
    async loadBibleFromIndexedDB(langKey) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(langKey);

            request.onsuccess = () => {
                if (request.result) {
                    // console.log(`Bible loaded from IndexedDB: ${langKey}`);
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Load from device file system (Cordova)
     */
    async loadBibleFromCordova(langKey) {
        return new Promise((resolve, reject) => {
            const fileName = `${langKey}.json`;
            const filePath = cordova.file.dataDirectory + this.FOLDER_NAME + '/' + fileName;

            window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
                fileEntry.file((file) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        try {
                            const bibleData = JSON.parse(reader.result);
                            // console.log(`Bible loaded from device: ${fileName}`);
                            resolve(bibleData);
                        } catch (e) {
                            console.error('Error parsing Bible file:', e);
                            resolve(null);
                        }
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsText(file);
                });
            }, () => resolve(null)); // File not found
        });
    },

    /**
     * Check if Bible is downloaded
     * @param {string} langKey - Language key
     * @returns {boolean} True if downloaded
     */
    async isDownloaded(langKey) {
        if (this.isCordova()) {
            return this.isDownloadedCordova(langKey);
        } else {
            return this.isDownloadedIndexedDB(langKey);
        }
    },

    /**
     * Check IndexedDB
     */
    async isDownloadedIndexedDB(langKey) {
        const bible = await this.loadBibleFromIndexedDB(langKey);
        return bible !== null;
    },

    /**
     * Check Cordova file
     */
    async isDownloadedCordova(langKey) {
        return new Promise((resolve) => {
            const fileName = `${langKey}.json`;
            const filePath = cordova.file.dataDirectory + this.FOLDER_NAME + '/' + fileName;

            window.resolveLocalFileSystemURL(filePath,
                () => resolve(true),  // File exists
                () => resolve(false)  // File doesn't exist
            );
        });
    },

    /**
     * Delete downloaded Bible
     * @param {string} langKey - Language key
     */
    async deleteBible(langKey) {
        if (this.isCordova()) {
            return this.deleteBibleCordova(langKey);
        } else {
            return this.deleteBibleIndexedDB(langKey);
        }
    },

    /**
     * Delete from IndexedDB
     */
    async deleteBibleIndexedDB(langKey) {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(langKey);

            request.onsuccess = () => {
                // console.log(`Bible deleted from IndexedDB: ${langKey}`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Delete from Cordova
     */
    async deleteBibleCordova(langKey) {
        return new Promise((resolve, reject) => {
            const fileName = `${langKey}.json`;
            const filePath = cordova.file.dataDirectory + this.FOLDER_NAME + '/' + fileName;

            window.resolveLocalFileSystemURL(filePath, (fileEntry) => {
                fileEntry.remove(() => {
                    // console.log(`Bible deleted from device: ${fileName}`);
                    resolve();
                }, reject);
            }, () => resolve()); // File not found, consider it deleted
        });
    },

    /**
     * Get list of all downloaded Bibles
     * @returns {Array<string>} Array of language keys
     */
    async getDownloadedBibles() {
        if (this.isCordova()) {
            return this.getDownloadedBiblesCordova();
        } else {
            return this.getDownloadedBiblesIndexedDB();
        }
    },

    /**
     * Get from IndexedDB
     */
    async getDownloadedBiblesIndexedDB() {
        const db = await this.openDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Get from Cordova
     */
    async getDownloadedBiblesCordova() {
        return new Promise((resolve) => {
            const dirPath = cordova.file.dataDirectory + this.FOLDER_NAME;

            window.resolveLocalFileSystemURL(dirPath, (dirEntry) => {
                const reader = dirEntry.createReader();
                reader.readEntries((entries) => {
                    const files = entries
                        .filter(entry => entry.isFile && entry.name.endsWith('.json'))
                        .map(entry => entry.name.replace('.json', ''));
                    resolve(files);
                }, () => resolve([]));
            }, () => resolve([]));
        });
    }
};

// Initialize storage on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BibleStorage.init());
} else {
    BibleStorage.init();
}
