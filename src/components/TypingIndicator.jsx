import React from 'react';
import { useChatContext } from '../context/ChatContext';

export default function TypingIndicator() {
    const { typingUser } = useChatContext();


    return (
        <div id="typing">
            {typingUser && `${typingUser} در حال تایپ است...`}
        </div>
    );
}
