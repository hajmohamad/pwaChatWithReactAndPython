const CACHE_VERSION = '1.0';
const CACHE_KEY_PREFIX = 'chat_cache_';

export const MessageCache = {
     getLocalStorageSize() {
    let total = 0;

    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }

    return total * 2; // bytes
},
    saveSyncMetadata(username, data) {
        const key = `${CACHE_KEY_PREFIX}sync_${username}`;
        try {
            localStorage.setItem(key, JSON.stringify({
                lastMessageId: data.lastMessageId,
                lastSyncAt: data.lastSyncAt,
                version: CACHE_VERSION
            }));
        } catch (e) { console.error("Cache save error", e); }
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
        } catch (e) { return { lastMessageId: 0, lastSyncAt: 0 }; }
    },
    saveMessages(username, messages) {
        const key = `${CACHE_KEY_PREFIX}messages_${username}`;
        try {
            const existing = this.getMessages(username);

            const messageMap = new Map();

            for (const msg of existing) {
                messageMap.set(msg.id, msg);
            }

            for (const msg of messages) {
                const old = messageMap.get(msg.id);
                messageMap.set(msg.id, old ? { ...old, ...msg } : msg);
            }

            let allMessages = Array.from(messageMap.values());

            allMessages.sort((a, b) => a.id - b.id);
            const localSize = this.getLocalStorageSize();
            console.log(localSize);


            const MAX_MESSAGES = 700;
            const TRIM_COUNT = 200;

            if (allMessages.length > MAX_MESSAGES) {
                allMessages.splice(0, TRIM_COUNT);
            }

            localStorage.setItem(key, JSON.stringify(allMessages));

        } catch (e) {
            console.error("Message save error", e);
        }
    },


    getMessages(username) {
        const key = `${CACHE_KEY_PREFIX}messages_${username}`;
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    },

    clearAll(username) {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}sync_${username}`);
        localStorage.removeItem(`${CACHE_KEY_PREFIX}messages_${username}`);
    }
};
