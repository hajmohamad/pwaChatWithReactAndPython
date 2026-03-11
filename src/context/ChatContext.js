import React, { createContext, useContext, useState, useRef } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [messages, setMessages]             = useState([]);
    const [users, setUsers]                   = useState([]);
    const [currentDMUser, setCurrentDMUser]   = useState(null);
    const [replyTo, setReplyTo]               = useState(null);
    const [darkMode, setDarkMode]             = useState(false);
    const [typingUser, setTypingUser]         = useState('');
    const [unreadMessageFrom, setUnreadMessageFrom] = useState([]);
    const [dmUnreadCount, setDmUnreadCount]   = useState(0);
    const [selectedImageB64, setSelectedImageB64] = useState(null);
    const [logs, setLogs]                     = useState([]);
    const [showLog, setShowLog]               = useState(false);
    const [myUserId, setMyUserId]             = useState(null);
    const messageBufferRef                    = useRef([]);

    const addLog = (message, type = 'info') => {
        const time = new Date().toLocaleTimeString('fa-IR');
        setLogs(prev => [...prev, { message, type, time }]);
    };

    const upsertMessage = (msg) => {
        setMessages(prev => {
            const idx = prev.findIndex(m => m.id === msg.id);
            let next;
            if (idx !== -1) {
                next = [...prev];
                next[idx] = { ...next[idx], ...msg };
            } else {
                next = [...prev, msg];
            }
            return next.sort((a, b) => a.id - b.id);
        });
    };

    const incrementDMUnread = () => {
        setDmUnreadCount(prev => prev + 1);
    };

    const updateDMUnread = (list) => {
        const total = (list || unreadMessageFrom).reduce(
            (sum, u) => sum + (u.numbermessageunread || 0), 0
        );
        setDmUnreadCount(total);
    };

    return (
        <ChatContext.Provider value={{
            messages, setMessages, upsertMessage,
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
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChatContext = () => useContext(ChatContext);
