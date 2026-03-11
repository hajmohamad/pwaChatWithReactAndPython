import React from 'react';
import { useChatContext } from '../context/ChatContext';

const USERNAME = 'mohamad';

export default function Sidebar({ currentDMRef }) {
    const {
        users,
        setCurrentDMUser,
        setUnreadMessageFrom,
        updateDMUnread,
        addLog,
    } = useChatContext();

    const selectDM = (user) => {
        // پاک کردن unread این کاربر
        setUnreadMessageFrom(prev => {
            const updated = prev.filter(u => u.username !== user.username);
            updateDMUnread(updated);
            return updated;
        });

        const dmUser = { id: user.id, username: user.username };
        setCurrentDMUser(dmUser);

        if (currentDMRef) currentDMRef.current = dmUser;

        addLog('DM با ' + user.username, 'success');
        document.getElementById('users-sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('open');
    };

    return (
        <div id="users-sidebar">
            <div style={{ padding: '12px 16px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                کاربران آنلاین
            </div>
            <ul id="user-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {users
                    .filter(u => u.username !== USERNAME)
                    .map(user => (
                        <li
                            key={user.id}
                            className="user"
                            onClick={() => selectDM(user)}
                            style={{ cursor: 'pointer', padding: '10px 16px' }}
                        >
                            {user.username}
                        </li>
                    ))}
            </ul>
        </div>
    );
}
