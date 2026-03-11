import React from 'react';
import { useChatContext } from '../context/ChatContext';
import useDarkMode from '../hooks/useDarkMode';
import usePushNotification from "../usePushNotification";



export default function Header({ send, socketRef, currentDMRef }) {
    const {
        currentDMUser,
        setCurrentDMUser,
        setUnreadMessageFrom,
        updateDMUnread,
        dmUnreadCount,
        addLog,
        username: USERNAME,

    } = useChatContext();
    const { darkMode, toggleDark } = useDarkMode();
    const { status, subscribe, unsubscribe } = usePushNotification(USERNAME);
    const pushButtonConfig = {
        idle:        { icon: "🔔", title: "فعال‌سازی اعلان‌ها", action: subscribe,     cls: "push-btn" },
        loading:     { icon: "⏳", title: "در حال ثبت...",       action: null,          cls: "push-btn loading" },
        granted:     { icon: "🔕", title: "غیرفعال کردن اعلان", action: unsubscribe,   cls: "push-btn active" },
        denied:      { icon: "🚫", title: "اعلان مسدود شده",    action: null,          cls: "push-btn denied" },
        unsupported: { icon: "❌", title: "مرورگر پشتیبانی نمی‌کند", action: null,    cls: "push-btn disabled" },
    };
    const btnCfg = pushButtonConfig[status];

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
        if (currentDMRef) currentDMRef.current = null;
        addLog('بازگشت به گروه', 'info');
    };

    return (
        <div id="header">
            {/*<button id="sidebar-btn" onClick={toggleSidebar} title="کاربران">☰</button>*/}
            <span id="current-user">{USERNAME}</span>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 'auto' }}>
                <button
                    id="dm-btn"
                    className={currentDMUser ? 'active-dm' : ''}
                    onClick={openDMPanel}
                    title="پیام خصوصی"
                >
                    ✉️
                    {dmUnreadCount > 0 && (
                        <span id="dm-unread-badge">
                            {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
                        </span>
                    )}
                </button>

                {currentDMUser && (
                    <button onClick={backToGroup} title="بازگشت به گروه">👥 گروه</button>
                )}

                <button onClick={toggleDark} title="حالت تیره">
                    {darkMode ? '☀️' : '🌙'}
                </button>
                {status !== "unsupported" && (
                    <button
                        className={btnCfg.cls}
                        title={btnCfg.title}
                        onClick={btnCfg.action || undefined}
                        disabled={!btnCfg.action}
                    >
                        {btnCfg.icon}
                    </button>
                )}

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
