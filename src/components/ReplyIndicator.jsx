import React from 'react';
import { useChatContext } from '../context/ChatContext';
import { esc } from '../utils/helpers';

export default function ReplyIndicator() {
    const { replyTo, setReplyTo } = useChatContext();

    if (!replyTo) return null;

    return (
        <div id="reply-indicator" style={{ display: 'flex' }}>
            <div className="reply-indicator-content">
                ↩ پاسخ به <b>{esc(replyTo.user)}</b>: {esc(replyTo.preview)}
            </div>
            <button className="cancel-reply-btn" onClick={() => setReplyTo(null)}>✕</button>
        </div>
    );
}
