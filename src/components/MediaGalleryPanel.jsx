import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useChatContext } from '../context/ChatContext';
import { resolveMessageImageSource } from '../utils/imageResolver';

function GalleryThumb({ msg, onOpen }) {
    const [src, setSrc] = useState(null);
    const srcRef = useRef(null);
    const shouldRevokeRef = useRef(false);

    useEffect(() => {
        if (srcRef.current && shouldRevokeRef.current) {
            URL.revokeObjectURL(srcRef.current);
        }
        srcRef.current = null;
        shouldRevokeRef.current = false;
        setSrc(null);

        let cancelled = false;

        resolveMessageImageSource(msg.image).then(({ src: resolvedSrc, revoke }) => {
            if (cancelled || !resolvedSrc) return;
            srcRef.current = resolvedSrc;
            shouldRevokeRef.current = revoke;
            setSrc(resolvedSrc);
        });

        return () => {
            cancelled = true;
            if (srcRef.current && shouldRevokeRef.current) {
                URL.revokeObjectURL(srcRef.current);
            }
            srcRef.current = null;
            shouldRevokeRef.current = false;
        };
    }, [msg.image]);

    if (!src) return null;

    return (
        <button className="gallery-thumb" onClick={() => onOpen(src)} title={msg.user || ''}>
            <img src={src} alt="media" loading="lazy" />
        </button>
    );
}

export default function MediaGalleryPanel() {
    const { messages, currentDMUser, myUserId, username: USERNAME } = useChatContext();
    const [previewImage, setPreviewImage] = useState(null);

    const groupImages = useMemo(
        () => messages
            .filter((m) => !m.is_dm && m.image)
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
        [messages]
    );

    const dmImages = useMemo(() => {
        if (!currentDMUser || !myUserId) return [];

        const me = String(myUserId);
        const dmUserId = String(currentDMUser.id);
        const dmUsername = currentDMUser.username;

        return messages
            .filter((m) => {
                if (!m.is_dm || !m.image) return false;
                const isMine = (m.user_id !== undefined && String(m.user_id) === me) || m.user === USERNAME;
                const isToMe = (m.recipient !== undefined && String(m.recipient) === me) || m.recipient_username === USERNAME;
                const isFromDMUser = (m.user_id !== undefined && String(m.user_id) === dmUserId) || m.user === dmUsername;
                const isToDMUser = (m.recipient !== undefined && String(m.recipient) === dmUserId) || m.recipient_username === dmUsername;
                return (isMine && isToDMUser) || (isToMe && isFromDMUser);
            })
            .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    }, [messages, currentDMUser, myUserId, USERNAME]);

    return (
        <div className="media-gallery-panel">
            <div className="media-gallery-header">
                <b>گالری تصاویر</b>
                <button
                    className="dm-close-btn"
                    onClick={() => document.getElementById('media-overlay')?.classList.remove('open')}
                >
                    ✕
                </button>
            </div>

            <div className="media-gallery-body">
                <section>
                    <div className="media-gallery-section-title">گروه ({groupImages.length})</div>
                    {groupImages.length === 0 ? (
                        <div className="media-gallery-empty">تصویری در گروه نیست</div>
                    ) : (
                        <div className="media-grid">
                            {groupImages.map((msg) => (
                                <GalleryThumb key={`g-${msg.id}`} msg={msg} onOpen={setPreviewImage} />
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <div className="media-gallery-section-title">
                        {currentDMUser ? `چت با ${currentDMUser.username}` : 'چت خصوصی'} ({dmImages.length})
                    </div>
                    {!currentDMUser ? (
                        <div className="media-gallery-empty">برای دیدن تصاویر خصوصی، یک کاربر DM انتخاب کن</div>
                    ) : dmImages.length === 0 ? (
                        <div className="media-gallery-empty">تصویری در این چت خصوصی نیست</div>
                    ) : (
                        <div className="media-grid">
                            {dmImages.map((msg) => (
                                <GalleryThumb key={`d-${msg.id}`} msg={msg} onOpen={setPreviewImage} />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {previewImage && createPortal(
                <div className="image-modal" onClick={() => setPreviewImage(null)}>
                    <button className="image-close" onClick={() => setPreviewImage(null)}>×</button>
                    <img src={previewImage} className="image-modal-img" alt="تصویر بزرگ" />
                </div>,
                document.body
            )}
        </div>
    );
}
