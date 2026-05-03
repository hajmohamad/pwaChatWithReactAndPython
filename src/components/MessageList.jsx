import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Message from './Message';
import { useChatContext } from '../context/ChatContext';

export default function MessageList({ send }) {
    const {
        messages,
        currentDMUser,
        myUserId,
        username: USERNAME,
        performanceMode,
    } = useChatContext();

    const bottomRef = useRef(null);
    const listRef = useRef(null);
    const isAtBottomRef = useRef(true);
    const hasInitialScrollRef = useRef(false);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const isVisible = useCallback((data) => {
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
    }, [currentDMUser, myUserId, USERNAME]);

    const visible = useMemo(() => messages.filter(isVisible), [messages, isVisible]);
    const conversationKey = currentDMUser ? `dm:${currentDMUser.id}` : 'group';

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: performanceMode ? 'auto' : 'smooth',
            block: "end"
        });
    }, [performanceMode]);

    const handleScroll = () => {
        if (!listRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = listRef.current;

        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < 100;

        isAtBottomRef.current = isAtBottom;
        setShowScrollButton(!isAtBottom);
    };

    useEffect(() => {
        hasInitialScrollRef.current = false;
        isAtBottomRef.current = true;
    }, [conversationKey]);

    useEffect(() => {
        if (hasInitialScrollRef.current || visible.length === 0) return;
        hasInitialScrollRef.current = true;
        requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({
                behavior: 'auto',
                block: 'end',
            });
            setShowScrollButton(false);
        });
    }, [visible.length, conversationKey]);

    // وقتی پیام جدیدی اضافه می‌شود، فقط در صورتی اسکرول کن که کاربر از قبل پایین بوده باشد
    useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom();
        }
    }, [visible.length, scrollToBottom]); // به جای کل آرایه، طول آن را چک می‌کنیم تا بهینه‌تر باشد

    return (
        <div className="message-list-wrapper">
            <ul
                id="messages"
                ref={listRef}
                onScroll={handleScroll}
            >
                {visible.length === 0 ? (
                    <li className="empty-state">
                        <div className="icon">💬</div>
                        <div>هنوز پیامی نیست</div>
                    </li>
                ) : (
                    visible.map((msg) => (
                        <Message key={msg.id} data={msg} send={send} />
                    ))
                )}
                {/* این عنصر همیشه در انتهای لیست قرار دارد */}
                <li ref={bottomRef} style={{ height: '1px' }} />
            </ul>

            {showScrollButton && (
                <button
                    className="scroll-to-bottom-btn"
                    onClick={scrollToBottom}
                    aria-label="برو به آخرین پیام"
                >
                    ⬇️
                </button>
            )}
        </div>
    );
}
