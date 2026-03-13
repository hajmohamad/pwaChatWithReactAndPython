import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { MessageCache } from '../utils/messageCache';

const ChatContext = createContext();

function getUsernameFromURL() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (!parts[0]) {
        throw new Error("Username not found in URL");
    }
    return parts[0];
}

export function ChatProvider({ children }) {
    const [messages, setMessages]                     = useState([]);
    const [users, setUsers]                           = useState([]);
    const [currentDMUser, setCurrentDMUser]           = useState(null);
    const [replyTo, setReplyTo]                       = useState(null);
    const [darkMode, setDarkMode]                     = useState(false);
    const [typingUser, setTypingUser]                 = useState('');
    const [unreadMessageFrom, setUnreadMessageFrom]   = useState([]);
    const [dmUnreadCount, setDmUnreadCount]           = useState(0);
    const [selectedImageB64, setSelectedImageB64]     = useState(null);
    const [logs, setLogs]                             = useState([]);
    const [showLog, setShowLog]                       = useState(false);
    const [myUserId, setMyUserId]                     = useState(null);
    const messageBufferRef                            = useRef([]);
    const [isLoadingCache, setIsLoadingCache]         = useState(true);

    const [username] = useState(() => getUsernameFromURL());

    const addLog = useCallback((message, type = 'info') => {
        const time = new Date().toLocaleTimeString('fa-IR');
        setLogs(prev => [...prev, { message, type, time }]);
    }, []);

    const incrementDMUnread = useCallback(() => {
        setDmUnreadCount(prev => prev + 1);
    }, []);

    const updateDMUnread = useCallback((list) => {
        setUnreadMessageFrom(prev => {
            const source = list || prev;
            const total  = source.reduce((sum, u) => sum + (u.numbermessageunread || 0), 0);
            setDmUnreadCount(total);
            return list || prev;
        });
    }, []);

    // رفع باگ: بارگذاری کش بر اساس username در لحظه شروع
    useEffect(() => {
        if (username) {
            const cachedMessages = MessageCache.getMessages(username);
            if (cachedMessages.length > 0) {
                setMessages(cachedMessages);
            }
            setIsLoadingCache(false);
        }
    }, [username]);

    const upsertMessage = useCallback((msg) => {
        setMessages(prev => {
            const next = [...prev];
            const idx = prev.findIndex(m => m.id === msg.id);

            if (idx !== -1) {
                next[idx] = { ...next[idx], ...msg };
            } else {
                next.push(msg);
            }

            const sorted = next.sort((a, b) => a.id - b.id);

            if (username) {
                MessageCache.saveMessages(username, sorted);
            }

            return sorted;
        });
    }, [username]);

    const upsertMessages = useCallback((msgs) => {
        setMessages(prev => {
            const messageMap = new Map();
            prev.forEach(m => messageMap.set(m.id, m));

            msgs.forEach(msg => {
                const existing = messageMap.get(msg.id);
                messageMap.set(msg.id, existing ? { ...existing, ...msg } : msg);
            });

            const sorted = Array.from(messageMap.values()).sort((a, b) => a.id - b.id);

            if (username) {
                MessageCache.saveMessages(username, sorted);
            }

            return sorted;
        });
    }, [username]);

    return (
        <ChatContext.Provider value={{
            messages, setMessages, upsertMessage, upsertMessages,
            isLoadingCache,
            users, setUsers,
            currentDMUser, setCurrentDMUser,
            replyTo, setReplyTo,
            darkMode, setDarkMode,
            typingUser, setTypingUser,
            unreadMessageFrom, setUnreadMessageFrom,
            dmUnreadCount, setDmUnreadCount,
            selectedImageB64, setSelectedImageB64,
            logs, addLog,
            showLog, setShowLog,
            myUserId, setMyUserId,
            messageBufferRef,
            incrementDMUnread,
            updateDMUnread,
            username,
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChatContext = () => useContext(ChatContext);
