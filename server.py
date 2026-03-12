import asyncio
import json
import traceback
import uuid
import websockets
# from pywebpush import webpush, WebPushException
import json
# from aiohttp import web
# import aiohttp


# ─── Push Notification Config ───────────────────────────────────────────────
# VAPID_PUBLIC_KEY  = "BBM15UGuQeJuLJanX8jMI4HW21QvNmzOxMi4mbKYnkzcnQXoe21NJy_wDvObRtStPsNljRrUf5I1AmKwHFCJrd8"
# VAPID_PRIVATE_KEY = "92uAooIFptZkchhR9ah76lEYaT7-NsqSySB9nQkngeU"
# VAPID_CLAIMS      = {"sub": "mailto:admin@yourchat.com"}

# { username -> [subscription_dict, ...] }
# push_subscriptions: dict[str, list[dict]] = {}


clients = {}          # websocket -> {"username": str, "id": str}
user_id_map = {}      # username -> user_id (ثابت برای هر نام)
messages = []
message_id_counter = 0

MAX_MESSAGES = 300

# ── ثابت‌های chunk ──────────────────────────────────────
HISTORY_CHUNK_SIZE = 50          # هر بار ۵۰ پیام
HISTORY_CHUNK_MAX_BYTES = 500_000  # هر chunk حداکثر ۵۰۰KB
#
# # ─── HTTP Routes برای Push ───────────────────────────────────────────────────
#
# async def handle_subscribe(request: web.Request) -> web.Response:
#     """
#     POST /subscribe/{username}
#     body: { "subscription": { "endpoint": ..., "keys": {...} } }
#     """
#
#     username = request.match_info["username"]
#     try:
#         body = await request.json()
#         subscription = body.get("subscription")
#         if not subscription or "endpoint" not in subscription:
#             return web.json_response({"error": "invalid subscription"}, status=400)
#
#         if username not in push_subscriptions:
#             push_subscriptions[username] = []
#
#         # جلوگیری از ثبت endpoint تکراری
#         endpoints = [s["endpoint"] for s in push_subscriptions[username]]
#         if subscription["endpoint"] not in endpoints:
#             push_subscriptions[username].append(subscription)
#
#         print(f"[PUSH] Subscription registered for {username}")
#         return web.json_response({"status": "ok"})
#
#     except Exception as e:
#         print(f"[PUSH] Subscribe error: {e}")
#         return web.json_response({"error": str(e)}, status=500)
#
#
# async def handle_unsubscribe(request: web.Request) -> web.Response:
#     """
#     POST /unsubscribe/{username}
#     body: { "endpoint": "..." }
#     """
#     username = request.match_info["username"]
#     try:
#         body = await request.json()
#         endpoint = body.get("endpoint")
#         if username in push_subscriptions:
#             push_subscriptions[username] = [
#                 s for s in push_subscriptions[username]
#                 if s["endpoint"] != endpoint
#             ]
#         return web.json_response({"status": "ok"})
#     except Exception as e:
#         return web.json_response({"error": str(e)}, status=500)
#
#
# async def handle_vapid_key(request: web.Request) -> web.Response:
#     return web.json_response({"publicKey": VAPID_PUBLIC_KEY})
#
#
# def send_push_notification(subscription: dict, payload: dict) -> bool:
#     """ارسال push به یک subscription"""
#     try:
#         webpush(
#             subscription_info=subscription,
#             data=json.dumps(payload),
#             vapid_private_key=VAPID_PRIVATE_KEY,
#             vapid_claims=VAPID_CLAIMS,
#         )
#         return True
#     except WebPushException as e:
#         print(f"[PUSH] WebPushException: {e}")
#         # اگر subscription منقضی شده باشد (410) حذفش کن
#         if e.response and e.response.status_code in (404, 410):
#             return False  # caller حذف می‌کند
#         return False
#     except Exception as e:
#         print(f"[PUSH] Error: {e}")
#         return False
#
#
# async def notify_offline_user(recipient_username: str, sender_username: str, text: str):
#     """
#     اگر گیرنده آفلاین بود push بفرست.
#     این تابع از handle_message صدا زده می‌شود.
#     """
#     # بررسی آفلاین بودن
#     online_usernames = {info["username"] for info in clients.values()}
#     if recipient_username in online_usernames:
#         return  # آنلاین است، push لازم نیست
#
#     subscriptions = push_subscriptions.get(recipient_username, [])
#     if not subscriptions:
#         return  # subscription ندارد
#
#     payload = {
#         "title": f"پیام جدید از {sender_username}",
#         "body": text[:100] if text else "📷 تصویر",
#         "icon": "/icon-192.png",
#         "badge": "/badge-72.png",
#         "data": {"url": f"/{recipient_username}"},
#     }
#
#     # اجرای sync در thread pool تا event loop بلاک نشود
#     import asyncio
#     loop = asyncio.get_event_loop()
#     dead_endpoints = []
#
#     for sub in subscriptions:
#         ok = await loop.run_in_executor(None, send_push_notification, sub, payload)
#         if not ok:
#             dead_endpoints.append(sub["endpoint"])
#
#     # حذف subscription‌های مرده
#     if dead_endpoints:
#         push_subscriptions[recipient_username] = [
#             s for s in subscriptions if s["endpoint"] not in dead_endpoints
#         ]


def split_history_chunks(history):
    """
    تاریخچه را به چند chunk تقسیم می‌کند.
    هم تعداد پیام و هم حجم JSON را چک می‌کند.
    """
    chunks = []
    current_chunk = []
    current_size  = 0

    for msg in history:
        msg_size = len(json.dumps(msg, ensure_ascii=False).encode("utf-8"))

        if current_chunk and (
            len(current_chunk) >= HISTORY_CHUNK_SIZE or
            current_size + msg_size > HISTORY_CHUNK_MAX_BYTES
        ):
            chunks.append(current_chunk)
            current_chunk = []
            current_size  = 0

        current_chunk.append(msg)
        current_size += msg_size

    if current_chunk:
        chunks.append(current_chunk)

    return chunks

def make_json(data):
    return json.dumps(data, ensure_ascii=False)


async def safe_send(ws, data):
    try:
        await ws.send(make_json(data))
        return True
    except Exception as e:
        print(f"[SEND ERROR] {e}")
        return False


async def broadcast(data, exclude=None, only=None):
    dead = []
    targets = list(clients.keys())
    if only is not None:
        targets = [ws for ws in targets if ws in only]

    for ws in targets:
        if exclude is not None and ws == exclude:
            continue
        ok = await safe_send(ws, data)
        if not ok:
            dead.append(ws)

    for d in dead:
        clients.pop(d, None)


async def send_users():
    users = list(clients.values())
    await broadcast({"type": "users", "users": users})


def find_ws_by_user_id(user_id):
    for ws, info in clients.items():
        if info["id"] == user_id:
            return ws, info
    return None, None

def next_message_id():
    global message_id_counter
    message_id_counter += 1
    return message_id_counter


def trim_messages():
    global messages
    if len(messages) > MAX_MESSAGES:
        messages = messages[-MAX_MESSAGES:]


def get_or_create_user_id(username):
    """
    اگر این username قبلاً وصل شده، همان id را برگردان.
    در غیر این صورت یک id جدید بساز و ذخیره کن.
    """
    if username not in user_id_map:
        user_id_map[username] = str(uuid.uuid4())
    return user_id_map[username]


def build_message(username, user_id, data):

    return {
        "type": "message",
        "id": next_message_id(),
        "user": username,
        "user_id": user_id,
        "recipient": data.get("recipient"),
        "recipient_username": data.get("recipient_username"),
        "text": data.get("text"),
        "image": data.get("image"),
        "reply": data.get("reply"),
        "time": data.get("time"),
        "is_dm": bool(data.get("recipient")),
        "read_by": [user_id],
        "reactions": {}
    }

def get_messages_for_user(user_id):
    """
    پیام‌هایی که این کاربر باید ببیند:
    - همه پیام‌های گروهی (is_dm=False)
    - پیام‌های DM که فرستنده یا گیرنده این کاربر است
    """
    result = []
    for m in sorted(messages, key=lambda x: x.get("id", 0)):
        if not m.get("is_dm"):
            result.append(m)
        else:
            sender    = m.get("user_id")
            recipient = m.get("recipient")
            if sender == user_id or recipient == user_id:
                result.append(m)
    return result


async def handle_reaction(ws, username, user_id, data):
    msg_id   = data.get("message_id")
    reaction = data.get("reaction")

    if not msg_id or not reaction:
        return

    for msg in messages:
        if msg.get("id") == msg_id:
            reactions = msg.setdefault("reactions", {})
            users     = reactions.setdefault(reaction, [])

            existing_index = next(
                (i for i, u in enumerate(users) if u["user_id"] == user_id),
                None
            )

            if existing_index is None:
                users.append({"user": username, "user_id": user_id})
            else:
                users.pop(existing_index)

            if not users:
                reactions.pop(reaction, None)

            # فقط به کسانی broadcast کن که این پیام را می‌بینند
            await broadcast_message_update(msg)
            return


async def broadcast_message_update(msg):
    """
    message_update را فقط به کاربرانی بفرست که این پیام برایشان visible است.
    """
    update_payload = {"type": "message_update", "message": msg}

    if not msg.get("is_dm"):
        # پیام گروهی — همه ببینند
        await broadcast(update_payload)
    else:
        # پیام خصوصی — فقط sender و recipient
        sender_id    = msg.get("user_id")
        recipient_id = msg.get("recipient")

        targets = []
        for ws, info in clients.items():
            if info["id"] in (sender_id, recipient_id):
                targets.append(ws)

        for ws in targets:
            await safe_send(ws, update_payload)


async def handle_read_receipt(user_id, data):
    msg_id = data.get("message_id")
    if not msg_id:
        return

    for msg in messages:
        if msg.get("id") == msg_id:
            read_by = msg.setdefault("read_by", [])
            if user_id not in read_by:
                read_by.append(user_id)

            receipt_payload = {
                "type":       "read_receipt_update",
                "message_id": msg_id,
                "user_id":    user_id,
                "read_by":    read_by
            }

            sender_id = msg.get("user_id")
            sender_ws, _ = find_ws_by_user_id(sender_id)
            if sender_ws:
                await safe_send(sender_ws, receipt_payload)
            return

def get_all_known_users_for(user_id):
    """
    همه کاربرانی که این user باید در لیست DM ببیند:
    ۱. همه کاربران آنلاین (به غیر از خودش)
    ۲. همه کاربرانی که قبلاً باهاشان DM داشته (آفلاین یا آنلاین)
    """
    known = {}  # user_id -> {"username": str, "id": str, "online": bool}

    # ── کاربران آنلاین ──────────────────────────────────
    for ws, info in clients.items():
        if info["id"] != user_id:
            known[info["id"]] = {
                "id":       info["id"],
                "username": info["username"],
                "online":   True
            }

    # ── کاربران آفلاین که DM داشته‌اند ──────────────────
    for msg in messages:
        if not msg.get("is_dm"):
            continue

        sender_id    = msg.get("user_id")
        recipient_id = msg.get("recipient")
        sender_name  = msg.get("user")
        recipient_username = msg.get("recipient_username")

        # طرف مقابل را پیدا کن
        if sender_id == user_id and recipient_id and recipient_id not in known:
            known[recipient_id] = {
                "id":       recipient_id,
                "username": recipient_username or "کاربر ناشناس",
                "online":   False
            }
        elif recipient_id == user_id and sender_id and sender_id not in known:
            known[sender_id] = {
                "id":       sender_id,
                "username": sender_name or "کاربر ناشناس",
                "online":   False
            }

    # ── همه کاربران ثبت‌شده در user_id_map ──────────────
    # (حتی اگر هیچ DM نداشته‌اند — برای ارسال اول)
    for uname, uid in user_id_map.items():
        if uid != user_id and uid not in known:
            is_online = any(
                info["id"] == uid for info in clients.values()
            )
            known[uid] = {
                "id":       uid,
                "username": uname,
                "online":   is_online
            }
    return list(known.values())

async def handle_message(ws, username, user_id, data):
    message   = build_message(username, user_id, data)
    recipient = data.get("recipient")


    if recipient:
        recipient_ws, recipient_info = find_ws_by_user_id(recipient)

        # ذخیره همیشه انجام می‌شود (حتی اگر آفلاین باشد)
        messages.append(message)
        trim_messages()

        # به فرستنده بفرست
        await safe_send(ws, message)

        # اگر گیرنده آنلاین است و متفاوت است
        if recipient_ws and recipient_ws != ws:
            await safe_send(recipient_ws, message)
        elif not recipient_ws:
            # گیرنده آفلاین است — پیام ذخیره شده، وقتی وصل شد می‌بیند
            print(f"[INFO] Recipient {recipient} is offline. Message saved.")

        recipient_username = data.get("recipient_username")
        msg_text = data.get("text", "")
#         if recipient_username:
#             await notify_offline_user(recipient_username, username, msg_text)

    else:
        messages.append(message)
        trim_messages()

        await safe_send(ws, message)
        await broadcast(message, exclude=ws)
        msg_text = data.get("text", "")
        online_usernames = {info["username"] for info in clients.values()}
#         for uname, subs in push_subscriptions.items():
#                    if uname not in online_usernames and subs:
#                        payload = {
#                            "title": f"پیام گروهی از {username}",
#                            "body": msg_text[:100] if msg_text else "📷 تصویر",
#                            "icon": "/icon-192.png",
#                            "data": {"url": "/"},
#                        }
#                        import asyncio
#                        loop = asyncio.get_event_loop()
#                        for sub in subs:
#                            await loop.run_in_executor(
#                                None, send_push_notification, sub, payload
#                            )

async def handle_client(ws):
    username = None
    try:
        raw  = await ws.recv()
        join = json.loads(raw)

        if join.get("type") != "join":
            await safe_send(ws, {
                "type":    "error",
                "message": "اول باید join ارسال شود."
            })
            return

        username = (join.get("user") or "").strip()
        last_message_id = join.get("last_message_id", 0)

        if not username:
            await safe_send(ws, {
                "type":    "error",
                "message": "نام کاربری معتبر نیست."
            })
            return

        # اگر همین username قبلاً آنلاین است، قطع کن (جلوگیری از duplicate)
        for existing_ws, info in list(clients.items()):
            if info["username"] == username and existing_ws != ws:
                await safe_send(existing_ws, {
                    "type":    "error",
                    "message": "از جای دیگری وارد شدید. این اتصال قطع می‌شود."
                })
                await existing_ws.close()
                clients.pop(existing_ws, None)
                break

        # id ثابت برای این username
        user_id = get_or_create_user_id(username)
        clients[ws] = {"username": username, "id": user_id}

        # تایید ورود
        await safe_send(ws, {
            "type":    "joined",
            "user":    username,
            "user_id": user_id
        })

        # لیست کاربران آنلاین
        await send_users()

        # ارسال تاریخچه پیام‌های مرتبط

        history = get_messages_for_user(user_id)
        history = [
            m for m in history
            if m["id"] > last_message_id
        ]
        chunks  = split_history_chunks(history)

        for i, chunk in enumerate(chunks):
            await safe_send(ws, {
                "type":        "history",
                "messages":    chunk,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "is_last":     (i == len(chunks) - 1)
            })
            # کمی صبر تا سوکت هضم کند
            await asyncio.sleep(0.05)

        print(f"[JOIN] {username} ({user_id}) - {len(history)} msgs in {len(chunks)} chunks")

        # حلقه اصلی
        while True:
            raw      = await ws.recv()
            data     = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "clear":
                global messages
                messages = []
                print("clearchat")

            elif msg_type == "typing":
                await broadcast({
                    "type":    "typing",
                    "user":    username,
                    "user_id": user_id
                }, exclude=ws)

            elif msg_type == "message":
                await handle_message(ws, username, user_id, data)

            elif msg_type == "reaction":
                await handle_reaction(ws, username, user_id, data)

            elif msg_type == "read_receipt":
                await handle_read_receipt(user_id, data)

            elif msg_type == "get_dm_users":
                dm_users = get_all_known_users_for(user_id)
                await safe_send(ws, {"type": "dm_users", "users": dm_users})

            elif msg_type == "ping":
                await safe_send(ws, {"type": "pong"})

            else:
                await safe_send(ws, {
                    "type":    "error",
                    "message": f"نوع پیام نامعتبر: {msg_type}"
                })

    except websockets.ConnectionClosed:
        print(f"[DISCONNECT] {username or 'unknown'}")
    except Exception as e:
        print(f"[SERVER ERROR] {e}")
        traceback.print_exc()
    finally:
        if ws in clients:
            clients.pop(ws, None)
            await send_users()


async def main():
    # ─── WebSocket Server ────────────────────────────────────────────────────
    ws_server = await websockets.serve(
        handle_client,
        "0.0.0.0",
        8085,
        max_size=10 * 1024 * 1024,
        ping_interval=None,
        ping_timeout=None,
    )
    print("[WS] WebSocket server started on port 8085")

    # ─── HTTP Server برای Push API ───────────────────────────────────────────
#     app = web.Application()
#     app.router.add_get("/vapid-public-key", handle_vapid_key)
#     app.router.add_post("/subscribe/{username}", handle_subscribe)
#     app.router.add_post("/unsubscribe/{username}", handle_unsubscribe)
#
#     runner = web.AppRunner(app)
#     await runner.setup()
#     site = web.TCPSite(runner, "0.0.0.0", 8085)
#     await site.start()
#     print("[HTTP] Push API started on port 8085")

    await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())


