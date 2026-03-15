import React, {useState} from 'react';
import { useChatContext } from '../context/ChatContext';
import useDarkMode from '../hooks/useDarkMode';
// import usePushNotification from "../usePushNotification";
import LogPanel from "./LogPanel";


export default function Header({ socketRef, currentDMRef }) {

    const {
        currentDMUser,
        setCurrentDMUser,
        dmUnreadCount,
        addLog,
        username: USERNAME,
    } = useChatContext();
    const [previewImage, setPreviewImage] = useState(null);


    const { darkMode, toggleDark } = useDarkMode();
    // const { status, subscribe, unsubscribe } = usePushNotification(USERNAME);
    // const pushButtonConfig = {
    //     idle:        { icon: "🔔", title: "فعال‌سازی اعلان‌ها", action: subscribe,     cls: "push-btn" },
    //     loading:     { icon: "⏳", title: "در حال ثبت...",       action: null,          cls: "push-btn loading" },
    //     granted:     { icon: "🔕", title: "غیرفعال کردن اعلان", action: unsubscribe,   cls: "push-btn active" },
    //     denied:      { icon: "🚫", title: "اعلان مسدود شده",    action: null,          cls: "push-btn denied" },
    //     unsupported: { icon: "❌", title: "مرورگر پشتیبانی نمی‌کند", action: null,    cls: "push-btn disabled" },
    // };
    // const btnCfg = pushButtonConfig[status];

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
    const userAvatars = {
        mohamad: "/me.jpg",
        anita: "/anita.jpg",
        paniz: "/paniz.jpg",
    };

    return (
        <div id="header">
            {previewImage && (
                <div className="image-modal">
                    <button className="image-close" onClick={() => setPreviewImage(null)}>×</button>
                    <img src={previewImage} className="image-modal-img" alt="" />
                </div>
            )}

            {currentDMUser ? (
                <>
                    <button  onClick={backToGroup} title="بازگشت">→</button>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                            src={userAvatars[currentDMUser.username] || "/default-avatar.png"}
                            alt=""
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: "50%",
                                objectFit: "cover"
                            }}
                            onClick={() => {
                                const avatar = userAvatars[currentDMUser.username] || "/default-avatar.png";
                                setPreviewImage(avatar);
                            }}
                        />

                        <span id="current-user">{currentDMUser.username}</span>
                    </div>
                </>
            ) : (
                <>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                        src={userAvatars[USERNAME] || "/default-avatar.png"}
                        alt=""
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: "50%"
                        }}
                    />

                    <span id="current-user">{USERNAME}</span>
                </div>

                </>
            )}

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

                {/* دارک مود */}
                <button onClick={toggleDark}>
                    {darkMode ? '☀️' : '🌙'}
                </button>
                {/*{status !== "unsupported" && (*/}
                {/*    <button*/}
                {/*        className={btnCfg.cls}*/}
                {/*        title={btnCfg.title}*/}
                {/*        onClick={btnCfg.action || undefined}*/}
                {/*        disabled={!btnCfg.action}*/}
                {/*    >*/}
                {/*        {btnCfg.icon}*/}
                {/*    </button>*/}
                {/*)}*/}

            </div>

        </div>
    );
}
