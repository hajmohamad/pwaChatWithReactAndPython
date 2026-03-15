import { useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';
import { MessageCache } from '../utils/messageCache';
import {decryptText} from "../utils/encryption"; // استفاده از یک منبع کش واحد

 const WS_URL = "wss://server.chaarset.ir/ws";
/*
const WS_URL = "ws://localhost:8085";
*/

export default function useWebSocket() {
    const {
        username: USERNAME,
        setUsers,
        upsertMessage,
        setMyUserId,
        messageBufferRef,
        addLog,
        setUnreadMessageFrom,
        incrementDMUnread,
        updateDMUnread,
        setTypingUser,
    } = useChatContext();

    const socketRef = useRef(null);
    const reconnectTimerRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const currentDMRef = useRef(null);
    const myUserIdRef = useRef(null);
    const lastMessageIdRef = useRef(0);
    const lastSyncAtRef = useRef(0);


    function attemptReconnect() {
        const maxAttempts = 12;
        if (reconnectAttemptsRef.current >= maxAttempts) {
            addLog('🚫 تلاش برای اتصال مجدد متوقف شد بعد از چندین بار شکست.', 'error');
            return;
        }

        const delay = 5000;
        reconnectAttemptsRef.current++;
        addLog(`در حال تلاش مجدد (${reconnectAttemptsRef.current})...`, 'info');

        reconnectTimerRef.current = setTimeout(() => {
            connect();
        }, delay);
    }

    const connect = () => {
        const ws = new WebSocket(WS_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            addLog('🟢 اتصال برقرار شد', 'success');
            reconnectAttemptsRef.current = 0;
            clearTimeout(reconnectTimerRef.current);

            const syncMeta = MessageCache.getSyncMetadata(USERNAME);
            lastMessageIdRef.current = syncMeta.lastMessageId;
            lastSyncAtRef.current = syncMeta.lastSyncAt;

            ws.send(JSON.stringify({
                type: 'join',
                user: USERNAME,
                last_message_id: lastMessageIdRef.current,
                last_sync_at: lastSyncAtRef.current
            }));

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
                case 'joined': {
                    const uid = data.user_id;
                    myUserIdRef.current = uid;
                    setMyUserId(uid);
                    addLog('ورود موفق — ID: ' + uid, 'success');
                    // بافر کردن پیام‌های دریافت شده در طول مدت اتصال اولیه
                    const buf = [...messageBufferRef.current];
                    messageBufferRef.current = [];
                    buf.forEach(m => upsertMessage(m));
                    break;
                }

                case 'history': {
                    const msgs = data.messages || [];
                    const isLast = data.is_last ?? true;
                    const totalChunks = data.total_chunks ?? 1;
                    const chunkIndex = data.chunk_index ?? 0;

                    if (msgs.length > 0) {
                        for (const msg of msgs) upsertMessage(msg);

                        const maxId = msgs.reduce((acc, m) => Math.max(acc, m.id ?? 0), lastMessageIdRef.current);
                        const maxUpdatedAt = msgs.reduce(
                            (acc, m) => Math.max(acc, m.updated_at ?? m.created_at ?? 0),
                            lastSyncAtRef.current
                        );

                        lastMessageIdRef.current = maxId;
                        lastSyncAtRef.current = maxUpdatedAt;

                        MessageCache.saveSyncMetadata(USERNAME, { lastMessageId: maxId, lastSyncAt: maxUpdatedAt });

                        const uid2 = myUserIdRef.current;
                        const unread = msgs.filter(m =>
                            m.recipient_username === USERNAME &&
                            m.is_dm &&
                            m.user !== USERNAME &&
                            !(m.read_by ?? []).includes(uid2)
                        );

                        if (unread.length > 0) {
                            setUnreadMessageFrom(prevList => {
                                const list = [...prevList];
                                unread.forEach(msg => {
                                    if(msg.user!==currentDMRef.current) {
                                    const ex = list.find(u => u.username === msg.user);
                                    if (ex) ex.numbermessageunread += 1;
                                    else list.push({ username: msg.user, numbermessageunread: 1 });
                                    }
                                });
                                return list;
                            });
                        }
                    }

                    addLog('chunk ' + (chunkIndex + 1) + '/' + totalChunks + ' — ' + msgs.length + ' پیام جدید', 'info');
                    if (isLast) {
                        updateDMUnread();
                        addLog('sync کامل شد', 'success');
                    }
                    break;
                }

                case 'users':
                    setUsers(data.users);
                    break;

                case 'message': {
                    if (data.id) {
                        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, data.id);
                        const ts = data.updated_at ?? data.created_at ?? 0;
                        lastSyncAtRef.current = Math.max(lastSyncAtRef.current, ts);
                        MessageCache.saveSyncMetadata(USERNAME, { lastMessageId: lastMessageIdRef.current, lastSyncAt: lastSyncAtRef.current });
                    }

                    if (data.is_dm && data.user !== USERNAME) {
                        const curDM = currentDMRef.current;
                        if (curDM?.username !== data.user) {
                            setUnreadMessageFrom(prev => {
                                const list = [...prev];
                                const ex = list.find(m => m.username === data.user);
                                if (ex) ex.numbermessageunread += 1;
                                else list.push({ username: data.user, numbermessageunread: 1 });
                                incrementDMUnread();
                                return list;
                            });
                        }
                    }

                    if (!myUserIdRef.current) {
                        messageBufferRef.current.push(data);
                    } else {
                        upsertMessage(data);
                    }
                    break;
                }

                case 'message_update': {
                    const msg = data.message;
                    if (msg?.updated_at) {
                        lastSyncAtRef.current = Math.max(lastSyncAtRef.current, msg.updated_at);
                        MessageCache.saveSyncMetadata(USERNAME, { lastMessageId: lastMessageIdRef.current, lastSyncAt: lastSyncAtRef.current });
                    }
                    upsertMessage(msg);
                    break;
                }

                case 'read_receipt_update': {
                    const updated = {
                        ...data,
                        id: data.message_id,
                        read_by: data.read_by || [],
                    };
                    upsertMessage(updated);
                    break;
                }

                case 'typing':
                    setTypingUser(data.user);
                    setTimeout(() => setTypingUser(''), 1800);
                    break;

                case 'dm_users':
                    break;

                case 'error':
                    addLog('⚠️ خطا: ' + data.message, 'error');
                    break;

                default:
                    addLog('پیام ناشناخته: ' + data.type, 'info');
            }
        };

        ws.onerror = () => {
            addLog('❌ خطای WebSocket', 'error');
        };

        ws.onclose = () => {
            addLog('🔴 اتصال قطع شد — تلاش برای اتصال مجدد...', 'error');
            clearInterval(ws._pingInterval);
            attemptReconnect(); // اکنون به درستی کار می‌کند
        };
    };

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimerRef.current);
            if (socketRef.current) {
                clearInterval(socketRef.current._pingInterval);
                socketRef.current.close();
            }
        };
    }, []);

    const send = (payload) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
        } else {
            addLog('⚠️ عدم ارسال — اتصال باز نیست.', 'warning');
        }
    };

    return { socketRef, send, currentDMRef };
}
