import React from 'react';
import { useChatContext } from '../context/ChatContext';
import { esc } from '../utils/helpers';

const USERNAME = 'mohamad';

export default function DMPanel({ socketRef }) {
    const {
        unreadMessageFrom,
        setUnreadMessageFrom,
        setCurrentDMUser,
        updateDMUnread,
        addLog,
    } = useChatContext();

    const [dmUsers, setDmUsers] = React.useState([]);

    React.useEffect(() => {
        const ws = socketRef.current;
        if (!ws) return;

        const original = ws.onmessage;
        ws.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'dm_users') {
                    setDmUsers(data.users || []);
                }
            } catch {}
        });
    }, [socketRef.current]);

    const sorted = [...dmUsers].sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return 0;
    });

    const selectUser = (user) => {
        setUnreadMessageFrom(prev =>
            prev.filter(u => u.username !== user.username)
        );
        updateDMUnread();
        setCurrentDMUser({ id: user.id, username: user.username });
        addLog(`DM با ${user.username}`, 'success');
        document.getElementById('dm-overlay')?.classList.remove('open');
    };

    return (
        <div className="dm-panel">
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <b>پیام خصوصی</b>
                <button
                    className="dm-close-btn"
                    onClick={() => document.getElementById('dm-overlay')?.classList.remove('open')}
                >✕</button>
            </div>

            <div id="dm-users-list">
                {sorted.length === 0 ? (
                    <div style={{ padding: 12, color: 'var(--subtext)', fontSize: 13, textAlign: 'center' }}>
                        هنوز کاربری وجود ندارد
                    </div>
                ) : (
                    sorted
                        .filter(u => u.username !== USERNAME)
                        .map(user => {
                            const dot    = user.online ? '🟢' : '⚫';
                            const status = user.online ? 'آنلاین' : 'آفلاین';
                            const unread = unreadMessageFrom.find(m => m.username === user.username);
                            const count  = unread?.numbermessageunread || 0;

                            return (
                                <div
                                    key={user.id}
                                    className="dm-user"
                                    data-user-id={user.id}
                                    onClick={() => selectUser(user)}
                                >
                                    <span style={{ fontSize: 10 }}>{dot}</span>
                                    <span style={{ flex: 1 }}>{esc(user.username)}</span>
                                    <span style={{ fontSize: 10, opacity: 0.6 }}>{status}</span>
                                    {count > 0 && (
                                        <span style={{ fontSize: 10, background: 'red', color: '#fff',
                                            borderRadius: '50%', padding: '1px 5px' }}>
                      {count}
                    </span>
                                    )}
                                </div>
                            );
                        })
                )}
            </div>
        </div>
    );
}
