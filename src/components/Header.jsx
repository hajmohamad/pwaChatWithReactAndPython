import React from 'react';
import { useChatContext } from '../context/ChatContext';
import useDarkMode from '../hooks/useDarkMode';

const USERNAME = 'mohamad';

export default function Header({ send, socketRef }) {
    const {
        currentDMUser,
        setCurrentDMUser,
        dmUnreadCount,
    } = useChatContext();
    const { darkMode, toggleDark } = useDarkMode();

    const toggleSidebar = () => {
        document.getElementById('users-sidebar')?.classList.toggle('open');
        document.getElementById('sidebar-overlay')?.classList.toggle('open');
    };

    const openDMPanel = () => {
        const overlay = document.getElementById('dm-overlay');
        overlay?.classList.toggle('open');
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'get_dm_users' }));
        }
    };

    const backToGroup = () => {
        setCurrentDMUser(null);
    };

    return (
        <div id="header">
            <span id="current-user">{USERNAME}</span>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 'auto' }}>

                <button id="dm-btn"
                        className={currentDMUser ? 'active-dm' : ''}
                        onClick={openDMPanel}
                        title="پیام خصوصی"
                >
                    ✉️
                    {dmUnreadCount > 0 && (
                        <span id="dm-unread-badge">{dmUnreadCount}</span>
                    )}
                </button>

                {currentDMUser && (
                    <button onClick={backToGroup} title="بازگشت به گروه">👥 گروه</button>
                )}

                <button onClick={toggleDark} title="حالت تیره">
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>

            {currentDMUser && (
                <div id="dm-banner" className="show">
                    💬 DM با <span id="dm-target-name">{currentDMUser.username}</span>
                    <button onClick={backToGroup} style={{ marginRight: 8 }}>✕</button>
                </div>
            )}
        </div>
    );
}
