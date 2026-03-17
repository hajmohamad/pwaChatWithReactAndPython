import { decryptText } from './encryption';

const CACHE_VERSION = '1.0';
const CACHE_KEY_PREFIX = 'chat_cache_';

export const MessageCache = {

    db: null,

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open("chatDB", 2);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains("images")) {
                    db.createObjectStore("images");
                }

                if (!db.objectStoreNames.contains("messages")) {
                    const store = db.createObjectStore("messages", { keyPath: "id" });
                    store.createIndex("username", "username", { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };

            request.onerror = reject;
        });
    },

    async saveImage(id, encryptedImage) {
        const base64 = await decryptText(encryptedImage);

        if (typeof base64 !== "string" || !base64.startsWith("data:image/")) {
            console.warn("invalid image:", base64);
            return;
        }

        const [header, data] = base64.split(",");
        const mime = header.match(/:(.*?);/)[1];
        const bstr = atob(data);

        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
        }

        const blob = new Blob([u8arr], { type: mime });

        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction("images", "readwrite");
            const store = tx.objectStore("images");

            store.put(blob, id);

            tx.oncomplete = () => resolve();
            tx.onerror = reject;
        });
    },

    async getImage(id) {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction("images", "readonly");
            const store = tx.objectStore("images");

            const req = store.get(id);

            req.onsuccess = () => resolve(req.result);
            req.onerror = reject;
        });
    },

    async getImageURL(id) {
        const blob = await this.getImage(id);
        if (!blob) return null;

        return URL.createObjectURL(blob);
    },

    async deleteImages(ids) {
        const db = await this.open();

        return new Promise((resolve, reject) => {
            const tx = db.transaction("images", "readwrite");
            const store = tx.objectStore("images");

            ids.forEach(id => store.delete(id));

            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
    },

    async saveMessages(username, messages) {

        const db = await this.open();

        const existing = await this.getMessages(username);

        const messageMap = new Map();

        for (const msg of existing) {
            messageMap.set(msg.id, msg);

            if (typeof msg.image === 'string' && msg.image.startsWith('ENC')) {
                await this.saveImage(msg.id, msg.image);
                msg.image = msg.id;
            }
        }

        for (const msg of messages) {

            if (typeof msg.image === 'string' && msg.image.startsWith('ENC')) {
                await this.saveImage(msg.id, msg.image);
                msg.image = msg.id;
            }

            const old = messageMap.get(msg.id);
            messageMap.set(msg.id, old ? { ...old, ...msg } : msg);
        }

        let allMessages = Array.from(messageMap.values());

        allMessages.sort((a, b) => a.id - b.id);

        const MAX_MESSAGES = 2000;

        if (allMessages.length > MAX_MESSAGES) {

            const trimmed = allMessages.splice(0, 200);

            const trimmedIds = trimmed
                .filter(m => m.image != null)
                .map(m => m.id);

            if (trimmedIds.length) {
                await this.deleteImages(trimmedIds);
            }
        }

        return new Promise((resolve, reject) => {

            const tx = db.transaction("messages", "readwrite");
            const store = tx.objectStore("messages");
            const index = store.index("username");

            const req = index.openCursor(IDBKeyRange.only(username));

            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    cursor.continue();
                } else {

                    allMessages.forEach(msg => {
                        store.put({ ...msg, username });
                    });

                    resolve();
                }
            };

            req.onerror = reject;
        });
    },

    async getMessages(username) {

        const db = await this.open();

        return new Promise((resolve, reject) => {

            const tx = db.transaction("messages", "readonly");
            const store = tx.objectStore("messages");
            const index = store.index("username");

            const req = index.getAll(username);

            req.onsuccess = () => {
                const messages = req.result || [];
                messages.sort((a, b) => a.id - b.id);
                resolve(messages);
            };

            req.onerror = reject;
        });
    },

    clearAll(username) {

        localStorage.removeItem(`${CACHE_KEY_PREFIX}sync_${username}`);
    },

    getLocalStorageSize() {

        let total = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }

        return total * 2;
    },

    saveSyncMetadata(username, data) {

        const key = `${CACHE_KEY_PREFIX}sync_${username}`;

        try {
            localStorage.setItem(key, JSON.stringify({
                lastMessageId: data.lastMessageId,
                lastSyncAt: data.lastSyncAt,
                version: CACHE_VERSION
            }));
        } catch (e) {
            console.error("Cache save error", e);
        }
    },

    getSyncMetadata(username) {

        const key = `${CACHE_KEY_PREFIX}sync_${username}`;

        try {
            const data = localStorage.getItem(key);

            if (!data) return { lastMessageId: 0, lastSyncAt: 0 };

            const parsed = JSON.parse(data);

            if (parsed.version !== CACHE_VERSION) {
                this.clearAll(username);
                return { lastMessageId: 0, lastSyncAt: 0 };
            }

            return parsed;

        } catch (e) {
            return { lastMessageId: 0, lastSyncAt: 0 };
        }
    }

};
