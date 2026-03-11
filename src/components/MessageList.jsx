import React, { useEffect, useRef } from 'react';
import Message from './Message';
import { useChatContext } from '../context/ChatContext';

const USERNAME = 'mohamad';

export default function MessageList({ send }) {
    const { messages, currentDMUser, myUserId } = useChatContext();
    const bottomRef = useRef(null);

    function isVisible(data) {
        if (!data.is_dm) return currentDMUser === null;
        if (!currentDMUser) return false;

        const dmUserId   = String(currentDMUser.id);
        const dmUsername = currentDMUser.username;

        const senderById   = myUserId && String(data.user_id)   === String(myUserId);
        const senderByName = data.user === USERNAME;
        const isMine       = senderById || senderByName;

        const recipientById   = myUserId && String(data.recipient) === String(myUserId);
        const recipientByName = data.recipient_username === USERNAME;
        const isToMe          = recipientById || recipientByName;

        const isFromDMUser = String(data.user_id) === dmUserId || data.user === dmUsername;
        const isToDMUser   = String(data.recipient) === dmUserId || data.recipient_username === dmUsername;

        if (isMine)  return isToDMUser;
        if (isToMe)  return isFromDMUser;
        return false;
    }

    const visible = messages.filter(isVisible);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visible, messages]);

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
