import React, { useState, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { decryptText } from '../utils/encryption';
import { esc } from '../utils/helpers';

const USERNAME = 'mohamad';

export default function Message({ data, send }) {
    const { myUserId, setReplyTo } = useChatContext();
    const [plainText, setPlainText]   = useState('');
    const [replyText, setReplyText]   = useState('');
    const isMine = data.user === USERNAME;

    useEffect(() => {
        if (data.text) decryptText(data.text).then(setPlainText);
        if (data.reply?.text) decryptText(data.reply.text).then(setReplyText);
    }, [data.text, data.reply?.text]);

    useEffect(() => {
        if (!isMine && data.id) {
            send({ type: 'read_receipt', message_id: data.id });
        }
    }, [data.id]);

    const toggleReaction = (reaction) => {
        send({ type: 'reaction', message_id: data.id, reaction });
    };

    const isRead = data.read_by && data.read_by.length > 1;

    return (
        <li
            className={`message ${isMine ? 'my' : 'other'} ${data.is_dm ? 'dm-message' : ''}`}
            data-msg-id={data.id}
        >
            {/* Reply quote */}
            {data.reply && (
                <div className="reply">
                    <b>{esc(data.reply.user)}: </b>
                    {data.reply.image
                        ? <span>📷 تصویر</span>
                        : <span>{replyText}</span>
                    }
                </div>
            )}

            {/* Username */}
            {!isMine && (
                <div className="username">{esc(data.user)}</div>
            )}

            {/* Text */}
            {plainText && (
                <div className="text">{plainText}</div>
            )}

            {/* Image */}
            {data.image && (
                <img
                    className="chat-image"
                    src={data.image}
                    alt="تصویر"
                    onClick={() => window.open(data.image, '_blank')}
                />
            )}

            {/* Time + Read receipt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="time">{data.time}</span>
                {isMine && (
                    <span className="read-receipts">
            {isRead ? '✓✓ خوانده شده' : '✓'}
          </span>
                )}
            </div>

            {/* Reactions */}
            {data.reactions && Object.keys(data.reactions).length > 0 && (
                <div className="message-reactions">
                    {Object.entries(data.reactions).map(([emoji, users]) => {
                        const isMineReaction = users.includes(USERNAME);
                        const title = users.join('، ');
                        return (
                            <button
                                key={emoji}
                                className={`reaction ${isMineReaction ? 'my-reaction' : ''}`}
                                title={title}
                                onClick={() => toggleReaction(emoji)}
                            >
                                {emoji} {users.length}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Actions */}
            <div className="message-actions">
                <button onClick={() => setReplyTo({
                    id:      data.id,
                    user:    data.user,
                    preview: data.text ? 'پیام متنی' : (data.image ? '📷 تصویر' : ''),
                    text:    data.text  || null,
                    image:   data.image || null,
                })}>↩ Reply</button>
                <button onClick={() => toggleReaction('❤️')}>❤️</button>
                <button onClick={() => toggleReaction('👍')}>👍</button>
                <button onClick={() => toggleReaction('😂')}>😂</button>
            </div>
        </li>
    );
}
