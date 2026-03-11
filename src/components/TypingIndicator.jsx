import React from 'react';
import { useChatContext } from '../context/ChatContext';

export default function TypingIndicator() {
    const { typingUser } = useChatContext();

    if (!typingUser) return null;

    return (
        <div id="typing">
            {typingUser} در حال تایپ است...
        </div>
    );
}
