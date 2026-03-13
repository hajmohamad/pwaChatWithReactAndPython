const CACHE_VERSION = '1.0';
const CACHE_KEY_PREFIX = 'chat_cache_';

export const MessageCache = {
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

            // ادغام پیام‌های موجود با پیام‌های جدید
            const messageMap = new Map();
            existing.forEach(msg => messageMap.set(msg.id, msg));
            messages.forEach(msg => {
                const existingMsg = messageMap.get(msg.id);
                messageMap.set(msg.id, existingMsg ? { ...existingMsg, ...msg } : msg);
            });

            // مرتب‌سازی و نگه‌داشتن نهایتا 1500 پیام آخر برای بهینه‌سازی حجم localstorage
            const allMessages = Array.from(messageMap.values())
                .sort((a, b) => a.id - b.id)
                .slice(-1500);

            localStorage.setItem(key, JSON.stringify(allMessages));
        } catch (e) { console.error("Message save error", e); }
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
