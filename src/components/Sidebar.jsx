import React from 'react';
import { useChatContext } from '../context/ChatContext';

const USERNAME = 'mohamad';

export default function Sidebar() {
    const { users, setCurrentDMUser, addLog } = useChatContext();

    const selectDM = (user) => {
        setCurrentDMUser({ id: user.id, username: user.username });
        addLog(`DM با ${user.username}`, 'success');
        document.getElementById('users-sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('open');
    };

    return (
        <div id="users-sidebar" id="users">
            <div style={{ padding: '12px 16px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                کاربران آنلاین
            </div>
            <ul id="user-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {users
                    .filter(u => u.username !== USERNAME)
                    .map(user => (
                        <li key={user.id}
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
