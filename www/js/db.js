const DB_NAME = 'EternalLifeBibleDB';
const DB_VERSION = 2;
const STORE_CHAPTERS = 'chapters'; // key: version_book_chapter (e.g., 'KJV_1_1')
const STORE_META = 'meta'; // For storing version info, download status, etc.

const db = {
    db: null,

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject("Could not open database");
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
                    db.createObjectStore(STORE_CHAPTERS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_META)) {
                    db.createObjectStore(STORE_META, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB Initialized");
                resolve(this.db);
            };
        });
    },

    async saveChapter(versionId, bookId, chapterNum, content) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");

            const transaction = this.db.transaction([STORE_CHAPTERS], 'readwrite');
            const store = transaction.objectStore(STORE_CHAPTERS);

            const id = `${versionId}_${bookId}_${chapterNum}`;
            const item = {
                id: id,
                version: versionId,
                book: bookId,
                chapter: chapterNum,
                content: content,
                timestamp: Date.now()
            };

            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async getChapter(versionId, bookId, chapterNum) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");

            const transaction = this.db.transaction([STORE_CHAPTERS], 'readonly');
            const store = transaction.objectStore(STORE_CHAPTERS);
            const id = `${versionId}_${bookId}_${chapterNum}`;
            const request = store.get(id);

            request.onsuccess = (e) => {
                resolve(e.target.result ? e.target.result.content : null);
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async saveMeta(key, value) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([STORE_META], 'readwrite');
            const store = transaction.objectStore(STORE_META);
            store.put({ id: key, value: value });
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });
    },

    async getMeta(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([STORE_META], 'readonly');
            const store = transaction.objectStore(STORE_META);
            const request = store.get(key);
            request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
            request.onerror = (e) => reject(e);
        });
    }
};
