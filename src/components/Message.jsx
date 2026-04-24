// src/components/Message.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // اضافه شدن ایمپورت پورتال
import { useChatContext } from '../context/ChatContext';
import { decryptText } from '../utils/encryption';
import { esc } from '../utils/helpers';
import VoiceMessage from './VoiceMessage';
import { MessageCache } from '../utils/messageCache';

const VOICE_PREFIX = '__VOICE__:';

export default function Message({ data, send }) {
    const { myUserId, setReplyTo, username: USERNAME } = useChatContext();
    const [plainText, setPlainText]       = useState('');
    const [replyText, setReplyText]       = useState('');
    const [imageSrc, setImageSrc]         = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showReactionBox, setShowReactionBox] = useState(false);

    // صدا
    const [voiceB64, setVoiceB64] = useState(null);
    const [voiceDur, setVoiceDur] = useState(0);

    // متغیرهای مربوط به Swipe
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping]   = useState(false);
    const messageRef = useRef(null);

    const isMine = data.user === USERNAME;

    useEffect(() => {
        if (data.image) {
            if (typeof data.image === "string" && data.image.indexOf('ECC') !== 0) {
                decryptText(data.image).then(setImageSrc);
            } else {
                MessageCache.getImage(data.image).then(blob => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    setImageSrc(url);
                });
            }
        }
        else setImageSrc(null);
    }, [data.image]);

    useEffect(() => {
        if (data.text) {
            decryptText(data.text).then((decoded) => {
                if (decoded.startsWith(VOICE_PREFIX)) {
                    const parts = decoded.slice(VOICE_PREFIX.length).split(':');
                    const dur   = parseInt(parts[0], 10) || 0;
                    const b64   = parts.slice(1).join(':');

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

    const handleReply = () => {
        setReplyTo({
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
        });
    };

    useEffect(() => {
        const el = messageRef.current;
        if (!el) return;

        let startX = null;
        let startY = null;
        let currentTranslate = 0;
        let isHorizontal = null;

        const handleTouchStart = (e) => {
            const touchX = e.touches[0].clientX;
            if (touchX < 30 || touchX > window.innerWidth - 30) {
                return;
            }

            startX = touchX;
            startY = e.touches[0].clientY;
            isHorizontal = null;
            setIsSwiping(true);
        };
        const handleTouchMove = (e) => {
            if (startX === null || startY === null) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;

            if (isHorizontal === null) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    isHorizontal = true;
                } else if (Math.abs(diffY) > Math.abs(diffX)) {
                    isHorizontal = false;
                }
            }

            if (isHorizontal) {
                if (e.cancelable) {
                    e.preventDefault();
                }

                if (!isMine && diffX < 0) {
                    currentTranslate = Math.max(diffX, -80);
                    setTranslateX(currentTranslate);
                }
                else if (isMine && diffX > 0) {
                    currentTranslate = Math.min(diffX, 80);
                    setTranslateX(currentTranslate);
                }
                // در غیر این صورت reset کن
                else {
                    currentTranslate = 0;
                    setTranslateX(0);
                }
            }
        };


        const handleTouchEnd = () => {
            if (startX === null) return;

            if ((isMine && currentTranslate >= 50) || (!isMine && currentTranslate <= -50)) {
                handleReply();
            }

            startX = null;
            startY = null;
            isHorizontal = null;
            currentTranslate = 0;
            setTranslateX(0);
            setIsSwiping(false);
        };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [data.id, voiceB64, data.text, data.image]);

    return (
        <li
            ref={messageRef}
            className={'message ' + (isMine ? 'my' : 'other') + (data.is_dm ? ' dm-message' : '')}
            data-msg-id={data.id}
            style={{
                transform: `translateX(${isSwiping ? translateX : 0}px)`,
                transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
                position: 'relative',
                touchAction: 'pan-y'
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    ...(isMine
                        ? { right: '100%', width: 'calc(90vw - 100%)' }
                        : { left: '100%', width: 'calc(90vw - 100%)' }),
                    backgroundColor: 'transparent',
                    touchAction: 'pan-y'
                }}
            />

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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', margin: '5px 0', minHeight: '50px' }}>
                    {imageSrc ? (
                        <img
                            className="chat-image"
                            src={imageSrc}
                            alt="تصویر پیام"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }}
                            onClick={() => setPreviewImage(imageSrc)}
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px', cursor: 'pointer' }}
                        />
                    ) : (
                        <span style={{ fontSize: '12px', color: '#888' }}>در حال بارگذاری تصویر...</span>
                    )}
                </div>
            )}

            {/* زمان + تیک */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: '5px' }}>
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
                {!showReactionBox && (
                    <button onClick={handleReply}>↩ </button>
                )}
                <div className="toggel-reaction-box"
                     onClick={(e)=>{
                         e.stopPropagation();
                         setShowReactionBox(true);
                     }}
                >
                    {!showReactionBox && <button>😏</button>}
                    {showReactionBox && (
                        <div className="reaction-box">
                            <button onClick={(e)=>{
                                e.stopPropagation();
                                setShowReactionBox(false);
                            }}>♻︎</button>
                            <button onClick={(e) =>{ toggleReaction('❤️')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>❤️</button>
                            <button onClick={(e) => { toggleReaction('👍')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>👍</button>
                            <button onClick={(e) =>{  toggleReaction('😂')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>😂</button>
                            <button onClick={(e) => { toggleReaction('😘')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>😘</button>
                            <button onClick={(e) =>{  toggleReaction('👎')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>👎</button>
                            <button onClick={(e) => { toggleReaction('😢')
                                e.stopPropagation();
                                setShowReactionBox(false);}}>😢</button>
                        </div>
                    )}
                </div>
            </div>

            {previewImage && createPortal(
                <div className="image-modal">
                    <button className="image-close" onClick={() => setPreviewImage(null)}>×</button>
                    <img src={previewImage} className="image-modal-img" alt="تصویر بزرگ" />
                </div>,
                document.body
            )}
        </li>
    );
}
