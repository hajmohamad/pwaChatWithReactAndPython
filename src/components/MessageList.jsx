import React, { useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import Message from './Message';

const USERNAME = 'mohamad';

export default function MessageList({ send }) {
    const { messages, currentDMUser, myUserId } = useChatContext();
    const bottomRef = useRef(null);

    const isVisible = (data) => {
        if (!data.is_dm) return currentDMUser === null;
        if (!myUserId) return false;
        const partnerId = data.user === USERNAME ? data.recipient : data.sender_id;
        return currentDMUser !== null &&
            String(partnerId) === String(currentDMUser.id);
    };

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
