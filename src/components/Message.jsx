import React, { useState, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { decryptText } from '../utils/encryption';
import { esc } from '../utils/helpers';


export default function Message({ data, send }) {
    const { myUserId, setReplyTo ,
        username: USERNAME,
    } = useChatContext();
    const [plainText, setPlainText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [imageSrc, setImageSrc] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);


    const isMine = data.user === USERNAME;

    useEffect(() => {
        if (data.image) {
            decryptText(data.image).then(setImageSrc);
        } else {
            setImageSrc(null);
        }
    }, [data.image]);


    useEffect(() => {
        if (data.text) decryptText(data.text).then(setPlainText);
        else setPlainText('');
        if (data.reply?.text) decryptText(data.reply.text).then(setReplyText);
        else setReplyText('');
    }, [data.text, data.reply?.text]);

    useEffect(() => {
        if (!isMine && data.id) {
            send({type: 'read_receipt', message_id: data.id});
        }
    }, [data.id]);

    const toggleReaction = (reaction) => {
        send({type: 'reaction', message_id: data.id, reaction});
    };

    // read_by: آرایه‌ای از ID — مثل JS اصلی
    const readBy = Array.isArray(data.read_by) ? data.read_by : [];
    const others = readBy.filter(id => id !== myUserId).length;
    const isRead = others > 0;

    return (
        <li
            className={'message ' + (isMine ? 'my' : 'other') + (data.is_dm ? ' dm-message' : '')}
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
            <div className="username">{esc(data.user)}</div>

            {/* Text */}
            {plainText && (
                <div className="text">{plainText}</div>
            )}

            {/* Image */}
            {data.image && (
                <img
                    className="chat-image"
                    src={imageSrc}
                    alt="تصویر"
                    loading="lazy"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                    onClick={() => setPreviewImage(imageSrc)}
                />
            )}

            {/* Time + Read receipt */}
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <span className="time">{esc(data.time || '')}</span>
                {isMine && (
                    <span className="read-receipts">
                        {isRead ? '✓✓ خوانده شده' : '✓'}
                    </span>
                )}
            </div>

            {/* Reactions — سازگار با ساختار {emoji: [{user, user_id}]} */}
            {data.reactions && Object.keys(data.reactions).length > 0 && (
                <div className="message-reactions">
                    {Object.entries(data.reactions).map(([emoji, users]) => {
                        const count = users.length;
                        // پشتیبانی از هر دو ساختار: آرایه object یا آرایه string
                        const isMineReaction = users.some(u =>
                            typeof u === 'object' ? u.user_id === myUserId : u === USERNAME
                        );
                        const title = users.map(u =>
                            typeof u === 'object' ? u.user : u
                        ).join('، ');
                        return (
                            <button
                                key={emoji}
                                className={'reaction' + (isMineReaction ? ' my-reaction' : '')}
                                title={title}
                                onClick={() => toggleReaction(emoji)}
                            >
                                {emoji}{count > 1 ? ' ' + count : ''}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Actions */}
            <div className="message-actions">
                <button onClick={() => setReplyTo({
                    id: data.id,
                    user: data.user,
                    preview: data.text ? 'پیام متنی' : (data.image ? '📷 تصویر' : ''),
                    text: data.text || null,
                    image: data.image || null,
                })}>↩ Reply
                </button>
                <button onClick={() => toggleReaction('❤️')}>❤️</button>
                <button onClick={() => toggleReaction('👍')}>👍</button>
                <button onClick={() => toggleReaction('😂')}>😂</button>
            </div>
            {previewImage && (
                <div className="image-modal">
                    <button
                        className="image-close"
                        onClick={() => setPreviewImage(null)}
                    >
                        ×
                    </button>

                    <img
                        src={previewImage}
                        className="image-modal-img"
                        alt=""
                    />
                </div>
            )}



        </li>
    );
}
