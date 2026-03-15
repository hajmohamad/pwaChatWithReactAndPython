import React, { useEffect, useRef, useState } from 'react';
import Message from './Message';
import { useChatContext } from '../context/ChatContext';

export default function MessageList({ send }) {
    const {
        messages,
        currentDMUser,
        myUserId,
        username: USERNAME
    } = useChatContext();

    const bottomRef = useRef(null);
    const listRef = useRef(null); // رفرنس برای المنتی که اسکرول می‌شود (ul)
    const isAtBottomRef = useRef(true); // ذخیره وضعیت اسکرول کاربر (آیا پایین است؟)
    const [showScrollButton, setShowScrollButton] = useState(false); // استیت برای نمایش دکمه

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

    // تابعی برای رفتن به آخرین پیام
    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // این تابع با هر بار اسکرول شدن لیست فراخوانی می‌شود
    const handleScroll = () => {
        if (!listRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = listRef.current;

        // فاصله اسکرول تا پایین لیست را محاسبه می‌کنیم
        // عدد 100 به عنوان تلورانس در نظر گرفته شده تا اگر کاربر کمی رفت بالا دکمه نشان داده نشود
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        const isAtBottom = distanceFromBottom < 100;

        // آپدیت کردن رفرنس و استیت دکمه
        isAtBottomRef.current = isAtBottom;
        setShowScrollButton(!isAtBottom);
    };

    // وقتی پیام جدیدی اضافه می‌شود، فقط در صورتی اسکرول کن که کاربر از قبل پایین بوده باشد
    useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom();
        }
    }, [visible.length]); // به جای کل آرایه، طول آن را چک می‌کنیم تا بهینه‌تر باشد

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
                    visible.map(msg => (
                        <Message key={msg.id} data={msg} send={send} />
                    ))
                )}
                {/* این عنصر همیشه در انتهای لیست قرار دارد */}
                <li ref={bottomRef} style={{ height: '1px' }} />
            </ul>

            {/* دکمه اسکرول به پایین (فقط وقتی کاربر بالا باشد رندر می‌شود) */}
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
