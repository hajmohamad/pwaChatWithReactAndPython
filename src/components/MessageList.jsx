import React, { useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import Message from './Message';

const USERNAME = 'mohamad';

export default function MessageList({ send }) {
    const { messages, currentDMUser, myUserId } = useChatContext();
    const bottomRef = useRef(null);

    // منطق عینا از JS اصلی
    function isVisible(data) {
        if (!data.is_dm) return currentDMUser === null;
        if (!myUserId)   return false;

        const me = myUserId;
        const s  = data.user_id;
        const r  = data.recipient;

        if (s !== me && r !== me) return false;
        if (!currentDMUser)       return false;

        const other = s === me ? r : s;
        return other === currentDMUser.id;
    }

    const visible = messages.filter(isVisible);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visible.length]);

    return (
        <ul id="messages">
            {visible.length === 0 ? (
                <li className="empty-state">
                    <div className="icon">💬</div>
                    <div>هنوز پیامی نیست</div>
                </li>
            ) : (
                visible.map(msg => (
                    <Message key={msg.id} data={msg} send={send} />
                ))
            )}
            <li ref={bottomRef} />
        </ul>
    );
}
