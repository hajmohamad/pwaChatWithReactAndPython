import { useEffect, useRef } from 'react';
import { useChatContext } from '../context/ChatContext';

const WS_URL  = 'ws://92.114.51.254:8084';
const USERNAME = 'mohamad';

export default function useWebSocket() {
    const {
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

    const socketRef      = useRef(null);
    const currentDMRef   = useRef(null);
    const myUserIdRef    = useRef(null);

    // isVisible — منطق عینا از JS اصلی
    function isVisible(data, curDMUser, userId) {
        if (!data.is_dm) return curDMUser === null;
        if (!userId)     return false;

        const me = userId;
        const s  = data.user_id;
        const r  = data.recipient;

        if (s !== me && r !== me) return false;
        if (!curDMUser)           return false;

        const other = s === me ? r : s;
        return other === curDMUser.id;
    }

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
                    myUserIdRef.current = data.user_id;
                    setMyUserId(data.user_id);
                    addLog('ورود موفق — ID: ' + data.user_id, 'success');
                    // flush buffer
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

                    // unread DM از history
                    const uid = myUserIdRef.current;
                    const unread = msgs.filter(m =>
                        m.recipient_username === USERNAME &&
                        m.is_dm &&
                        m.user !== USERNAME &&
                        !(m.read_by ?? []).includes(uid)
                    );

                    if (unread.length > 0) {
                        setUnreadMessageFrom(prevList => {
                            const list = [...prevList];
                            unread.forEach(msg => {
                                const ex = list.find(u => u.username === msg.user);
                                if (ex) ex.numbermessageunread += 1;
                                else list.push({ username: msg.user, numbermessageunread: 1 });
                            });
                            return list;
                        });
                    }

                    addLog('chunk ' + (chunkIndex + 1) + '/' + totalChunks + ' — ' + msgs.length + ' پیام', 'info');
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
                        const curDM = currentDMRef.current;
                        if (curDM?.username !== data.user) {
                            setUnreadMessageFrom(prev => {
                                const list = [...prev];
                                const ex = list.find(m => m.username === data.user);
                                if (ex) ex.numbermessageunread += 1;
                                else list.push({ username: data.user, numbermessageunread: 1 });
                                return list;
                            });
                            incrementDMUnread();
                        }
                    }
                    if (!myUserIdRef.current) {
                        messageBufferRef.current.push(data);
                    } else {
                        upsertMessage(data);
                    }
                    break;

                case 'message_update':
                    upsertMessage(data.message);
                    break;

                case 'read_receipt_update':
                    upsertMessage({
                        ...data,
                        id:      data.message_id,
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
                    addLog('خطا: ' + data.message, 'error');
                    break;

                default:
                    addLog('پیام ناشناخته: ' + data.type, 'info');
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

    // expose currentDMRef so DMPanel/Header can update it
    return { socketRef, send, currentDMRef };
}
