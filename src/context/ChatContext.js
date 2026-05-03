import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {MessageCache} from '../utils/messageCache';

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
    const [performanceMode, setPerformanceMode]       = useState(() => {
        const saved = localStorage.getItem('PERF_MODE');
        if (saved === '1') return true;
        if (saved === '0') return false;
        return window.matchMedia('(max-width: 700px)').matches;
    });
    const messageBufferRef                            = useRef([]);
    const swRegistrationRef                           = useRef(null);
    const [isLoadingCache, setIsLoadingCache]         = useState(true);
    const cacheSaveTimerRef                           = useRef(null);
    const [pwaUpdateReady, setPwaUpdateReady]         = useState(false);
    const [isStandalonePWA]                           = useState(() =>
        window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    );

    const [username] = useState(() => getUsernameFromURL());

    const addLog = useCallback((message, type = 'info') => {
        const time = new Date().toLocaleTimeString('fa-IR');
        setLogs(prev => {
            const next = [...prev, { message, type, time }];
            return next.length > 300 ? next.slice(next.length - 300) : next;
        });
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

    useEffect(() => {
        if (!username) return;

        let cancelled = false;

        const loadCache = async () => {
            try {
                const cachedMessages = await MessageCache.getMessages(username);

                if (!cancelled && cachedMessages.length > 0) {
                    setMessages(cachedMessages);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingCache(false);
                }
            }
        };

        loadCache();

        return () => {
            cancelled = true;
        };
    }, [username]);

    useEffect(() => {
        localStorage.setItem('PERF_MODE', performanceMode ? '1' : '0');
    }, [performanceMode]);

    useEffect(() => {
        const onUpdateReady = (event) => {
            swRegistrationRef.current = event.detail?.registration || null;
            setPwaUpdateReady(true);
        };

        window.addEventListener('pwa-update-ready', onUpdateReady);
        return () => window.removeEventListener('pwa-update-ready', onUpdateReady);
    }, []);

    const applyPwaUpdate = useCallback(() => {
        const registration = swRegistrationRef.current;

        if (registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            return;
        }

        window.location.reload();
    }, []);


    const upsertMessage = useCallback((msg) => {
        setMessages(prev => {
            const idx = prev.findIndex(m => m.id === msg.id);

            if (idx !== -1) {
                const merged = { ...prev[idx], ...msg };
                const changed = Object.keys(merged).some((key) => merged[key] !== prev[idx][key]);
                if (!changed) return prev;
                const next = [...prev];
                next[idx] = merged;
                return next;
            }

            if (prev.length === 0 || (prev[prev.length - 1]?.id ?? -1) <= (msg.id ?? -1)) {
                return [...prev, msg];
            }

            const next = [...prev, msg];
            next.sort((a, b) => a.id - b.id);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!username || isLoadingCache || messages.length === 0) return;
        if (cacheSaveTimerRef.current) {
            clearTimeout(cacheSaveTimerRef.current);
        }

        cacheSaveTimerRef.current = setTimeout(() => {
            MessageCache.saveMessages(username, messages);
        }, 1200);

        return () => {
            if (cacheSaveTimerRef.current) {
                clearTimeout(cacheSaveTimerRef.current);
                cacheSaveTimerRef.current = null;
            }
        };

    }, [messages, username, isLoadingCache]);


    const upsertMessages = useCallback((msgs) => {
        if (!msgs || msgs.length === 0) return;

        setMessages(prev => {
            const messageMap = new Map();
            prev.forEach(m => messageMap.set(m.id, m));

            msgs.forEach(msg => {
                const existing = messageMap.get(msg.id);
                messageMap.set(msg.id, existing ? { ...existing, ...msg } : msg);
            });

            return Array.from(messageMap.values()).sort((a, b) => a.id - b.id);
        });
    }, []);

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
            setLogs,
            showLog, setShowLog,
            myUserId, setMyUserId,
            performanceMode, setPerformanceMode,
            pwaUpdateReady,
            isStandalonePWA,
            applyPwaUpdate,
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
