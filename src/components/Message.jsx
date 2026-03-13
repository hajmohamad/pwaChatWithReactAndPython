// src/components/Message.jsx
import React, { useState, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { decryptText } from '../utils/encryption';
import { esc } from '../utils/helpers';
import VoiceMessage from './VoiceMessage';

const VOICE_PREFIX = '__VOICE__:';

export default function Message({ data, send }) {
    const { myUserId, setReplyTo, username: USERNAME } = useChatContext();
    const [plainText, setPlainText]     = useState('');
    const [replyText, setReplyText]     = useState('');
    const [imageSrc, setImageSrc]       = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showReactionBox, setShowReactionBox]= useState(false);

    // صدا
    const [voiceB64, setVoiceB64]       = useState(null);
    const [voiceDur, setVoiceDur]       = useState(0);

    const isMine = data.user === USERNAME;

    useEffect(() => {
        if (data.image) decryptText(data.image).then(setImageSrc);
        else setImageSrc(null);
    }, [data.image]);

// src/components/Message.jsx - فقط بخش useEffect متن

    useEffect(() => {
        if (data.text) {
            decryptText(data.text).then((decoded) => {
                if (decoded.startsWith(VOICE_PREFIX)) {
                    // فرمت: __VOICE__:duration:base64
                    const parts = decoded.slice(VOICE_PREFIX.length).split(':');
                    const dur   = parseInt(parts[0], 10) || 0;
                    const b64   = parts.slice(1).join(':'); // در صورت : در base64

                    setVoiceB64(b64);
                    setVoiceDur(dur);
                    setPlainText('');
                } else {
                    setVoiceB64(null);
                    setVoiceDur(0);
                    setPlainText(decoded);
                }
            });
        } else {
            setPlainText('');
            setVoiceB64(null);
            setVoiceDur(0);
        }

        if (data.reply?.text) decryptText(data.reply.text).then(setReplyText);
        else setReplyText('');
    }, [data.text, data.reply?.text]);

    // ─── read receipt ───
    useEffect(() => {
        if (!isMine && data.id) {
            send({ type: 'read_receipt', message_id: data.id });
        }
    }, [data.id]);

    const toggleReaction = (reaction) => {
        send({ type: 'reaction', message_id: data.id, reaction });
    };

    const readBy  = Array.isArray(data.read_by) ? data.read_by : [];
    const others  = readBy.filter(id => id !== myUserId).length;
    const isRead  = others > 0;

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

            {/* ویس پیام */}
            {voiceB64 && (
                <VoiceMessage audioB64={voiceB64} duration={voiceDur} />
            )}

            {/* متن معمولی */}
            {plainText && (
                <div className="text">{plainText}</div>
            )}

            {/* تصویر */}
            {data.image && (
                <img
                    className="chat-image"
                    src={imageSrc}
                    alt="تصویر"
                    loading="lazy"
                    onError={(e) => { e.target.style.display = 'none'; }}
                    onClick={() => setPreviewImage(imageSrc)}
                />
            )}

            {/* زمان + تیک */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="time">{esc(data.time || '')}</span>
                {isMine && (
                    <span className="read-receipts">
                        {isRead ? '✓✓ خوانده شده' : '✓'}
                    </span>
                )}
            </div>

            {data.reactions && Object.keys(data.reactions).length > 0 && (
                <div className="message-reactions">
                    {Object.entries(data.reactions).map(([emoji, users]) => {
                        const count = users.length;
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

            {/* اکشن‌ها */}
            <div className="message-actions">
                {!showReactionBox&&(
                        <button onClick={() => setReplyTo({
                    id:      data.id,
                    user:    data.user,
                    preview: voiceB64
                        ? '🎙️ پیام صوتی'
                        : data.text
                            ? 'پیام متنی'
                            : data.image
                                ? '📷 تصویر'
                                : '',
                    text:    data.text  || null,
                    image:   data.image || null,
                })}>↩ </button>)}
                <div className="toggel-reaction-box"
                     onClick={(e)=>{
                         e.stopPropagation();
                         setShowReactionBox(true);
                }}
                >
                    {!showReactionBox&&<button>😏</button>}
                    {showReactionBox&&(
                        <div className="reaction-box">
                            <button  onClick={(e)=>{
                                e.stopPropagation();
                                setShowReactionBox(false);
                            }}>♻︎</button>
                            <button onClick={() =>{ toggleReaction('❤️')
                                setShowReactionBox(false);}}>❤️</button>
                            <button onClick={() => { toggleReaction('👍')
                                setShowReactionBox(false);}}>👍</button>
                            <button onClick={() =>{  toggleReaction('😂')
                                setShowReactionBox(false);}}>😂</button>
                            <button onClick={() => { toggleReaction('😘')
                                setShowReactionBox(false);}}>😘</button>
                            <button onClick={() =>{  toggleReaction('👎')
                                setShowReactionBox(false);}}>👎</button>
                            <button onClick={() => { toggleReaction('😢')
                                setShowReactionBox(false);}}>😢</button>
                        </div>
                    )}

                </div>

            </div>

            {/* مودال تصویر */}
            {previewImage && (
                <div className="image-modal">
                    <button className="image-close" onClick={() => setPreviewImage(null)}>×</button>
                    <img src={previewImage} className="image-modal-img" alt="" />
                </div>
            )}
        </li>
    );
}
