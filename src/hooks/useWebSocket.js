import { useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { decryptText } from '../utils/encryption';

const WS_URL = 'ws://92.114.51.254:8084';
const USERNAME = 'mohamad';

export default function useWebSocket() {
    const {
        setUsers,
        upsertMessage,
        setMyUserId,
        myUserId,
        messageBufferRef,
        addLog,
        currentDMUser,
        unreadMessageFrom,
        setUnreadMessageFrom,
        incrementDMUnread,
        updateDMUnread,
        setTypingUser,
    } = useChatContext();

    const socketRef = useRef(null);

    const isVisible = (data, curDMUser, userId) => {
        if (!data.is_dm) return curDMUser === null;
        if (!userId) return false;
        const partnerId = data.user === USERNAME ? data.recipient : data.sender_id;
        return curDMUser !== null && String(partnerId) === String(curDMUser.id);
    };

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            addLog('اتصال برقرار شد', 'success');
            ws.send(JSON.stringify({ type: 'join', user: USERNAME }));
            const ping = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
            ws._pingInterval = ping;
        };

        ws.onmessage = async (event) => {
            let data;
            try { data = JSON.parse(event.data); }
            catch { addLog('پیام نامعتبر دریافت شد', 'error'); return; }

            switch (data.type) {

                case 'joined':
                    setMyUserId(data.user_id);
                    addLog(`ورود موفق — ID: ${data.user_id}`, 'success');
                    const buf = [...messageBufferRef.current];
                    messageBufferRef.current = [];
                    buf.forEach(m => upsertMessage(m));
                    break;

                case 'history': {
                    const msgs        = data.messages     || [];
                    const isLast      = data.is_last      ?? true;
                    const totalChunks = data.total_chunks ?? 1;
                    const chunkIndex  = data.chunk_index  ?? 0;

                    for (const msg of msgs) upsertMessage(msg);

                    setMyUserId(prev => {
                        const uid = prev;
                        const unread = msgs.filter(m =>
                            m.recipient_username === USERNAME &&
                            m.is_dm &&
                            m.user !== USERNAME &&
                            !(m.read_by ?? []).includes(uid)
                        );
                        setUnreadMessageFrom(prevList => {
                            let list = [...prevList];
                            unread.forEach(msg => {
                                const ex = list.find(u => u.username === msg.user);
                                if (ex) ex.numbermessageunread += 1;
                                else list.push({ username: msg.user, numbermessageunread: 1 });
                            });
                            return list;
                        });
                        return uid;
                    });

                    addLog(`chunk ${chunkIndex + 1}/${totalChunks} — ${msgs.length} پیام`, 'info');
                    if (isLast) {
                        updateDMUnread();
                        addLog('تاریخچه کامل بارگذاری شد', 'success');
                    }
                    break;
                }

                case 'users':
                    setUsers(data.users);
                    break;

                case 'message':
                    if (data.is_dm && data.user !== USERNAME) {
                        setUnreadMessageFrom(prev => {
                            const cur = currentDMUser;
                            if (cur?.username === data.user) return prev;
                            let list = [...prev];
                            const ex = list.find(m => m.username === data.user);
                            if (ex) ex.numbermessageunread += 1;
                            else list.push({ username: data.user, numbermessageunread: 1 });
                            incrementDMUnread();
                            return list;
                        });
                    }
                    setMyUserId(prev => {
                        if (!prev) {
                            messageBufferRef.current.push(data);
                        } else {
                            upsertMessage(data);
                        }
                        return prev;
                    });
                    break;

                case 'message_update':
                    upsertMessage(data.message);
                    break;

                case 'read_receipt_update':
                    upsertMessage({
                        ...data,
                        id: data.message_id,
                        read_by: data.read_by || [],
                    });
                    break;

                case 'typing':
                    setTypingUser(data.user);
                    setTimeout(() => setTypingUser(''), 1800);
                    break;

                case 'dm_users':
                    break;

                case 'pong':
                    break;

                case 'error':
                    addLog(`خطا: ${data.message}`, 'error');
                    break;

                default:
                    addLog(`پیام ناشناخته: ${data.type}`, 'info');
            }
        };

        ws.onerror = () => addLog('خطای WebSocket', 'error');
        ws.onclose = () => {
            addLog('اتصال قطع شد', 'error');
            clearInterval(ws._pingInterval);
        };

        return () => {
            clearInterval(ws._pingInterval);
            ws.close();
        };
    }, []);

    const send = (payload) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        }
    };

    return { socketRef, send };
}
