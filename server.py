import time
import json
import traceback
import uuid
import websockets
import asyncio
import os
from pathlib import Path
from aiohttp import web
from aiohttp_cors import setup as cors_setup, ResourceOptions  # اضافه کردن این خط

clients = {}          # websocket -> {"username": str, "id": str}
user_id_map = {}  # username -> user_id
last_seen_map = {}  # user_id -> unix_timestamp
messages = []
message_id_counter = 0

# مقدار هرس پیام‌ها به 10000 افزایش یافت تا پیام‌های کل سرور زود حذف نشوند
MAX_MESSAGES = 10000
VIDEO_TTL_SECONDS = 10 * 60
VIDEO_MAX_UPLOAD_SIZE = 80 * 1024 * 1024
BASE_DIR = Path(__file__).resolve().parent
MEDIA_ROOT = BASE_DIR / "media"
VIDEO_DIR = MEDIA_ROOT / "videos"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

# ── ثابت‌های chunk ──────────────────────────────────────
HISTORY_CHUNK_SIZE = 50
HISTORY_CHUNK_MAX_BYTES = 500_000

def now_ts():
    return int(time.time())

def find_message_by_id(message_id):
    for msg in messages:
        if msg.get("id") == message_id:
            return msg
    return None

def get_delta_messages_for_user(user_id, last_message_id=0, last_sync_at=0):
    visible_messages = get_messages_for_user(user_id)
    result = []

    for msg in visible_messages:
        msg_id = msg.get("id", 0)
        updated_at = msg.get("updated_at", msg.get("created_at", 0)) or 0

        if msg_id > last_message_id or updated_at > last_sync_at:
            result.append(msg)

    result.sort(key=lambda m: m.get("id", 0))
    return result

def find_ws_by_username(username):
    for ws, info in clients.items():
        if info.get("username") == username:
            return ws, info
    return None, None

def split_history_chunks(history):
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
        if not await safe_send(ws, data):
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
    if username not in user_id_map:
        user_id_map[username] = str(uuid.uuid4())
    return user_id_map[username]

def build_message(username, user_id, data):
    ts = now_ts()
    return {
        "type": "message",
        "id": next_message_id(),
        "user": username,
        "user_id": user_id,
        "recipient": data.get("recipient"),
        "recipient_username": data.get("recipient_username"),
        "text": data.get("text"),
        "image": data.get("image"),
        "video": data.get("video"),
        "reply": data.get("reply"),
        "time": data.get("time"),
        "is_dm": bool(data.get("recipient")),
        "read_by": [user_id],
        "reactions": {},
        "created_at": ts,
        "updated_at": ts,
        "deleted_at": None
    }

def get_messages_for_user(user_id):
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
    message_id = data.get("message_id")
    reaction = data.get("reaction")

    if not message_id or not reaction:
        return

    msg = find_message_by_id(message_id)
    if not msg:
        return

    reactions = msg.setdefault("reactions", {})
    reaction_users = reactions.setdefault(reaction, [])

    existing = next((u for u in reaction_users if u.get("user_id") == user_id), None)

    if existing:
        reaction_users.remove(existing)
    else:
        reaction_users.append({"user": username, "user_id": user_id})

    if not reaction_users:
        reactions.pop(reaction, None)

    msg["updated_at"] = now_ts()
    await broadcast_message_update(msg)

async def broadcast_message_update(msg):
    update_payload = {"type": "message_update", "message": msg}

    if not msg.get("is_dm"):
        await broadcast(update_payload)
    else:
        sender_id    = msg.get("user_id")
        recipient_id = msg.get("recipient")

        targets = []
        for ws, info in clients.items():
            if info["id"] in (sender_id, recipient_id):
                targets.append(ws)

        for ws in targets:
            await safe_send(ws, update_payload)

async def handle_read_receipt(user_id, data):
    message_id = data.get("message_id")
    if not message_id:
        return

    msg = find_message_by_id(message_id)
    if not msg:
        return

    read_by = msg.setdefault("read_by", [])
    if user_id not in read_by:
        read_by.append(user_id)
        msg["updated_at"] = now_ts()

    receipt_payload = {
        "type": "read_receipt_update",
        "message_id": message_id,
        "user_id": user_id,
        "read_by": read_by
    }

    sender_id = msg.get("user_id")
    sender_ws, _ = find_ws_by_user_id(sender_id)
    if sender_ws:
        await safe_send(sender_ws, receipt_payload)

def get_all_known_users_for(user_id):
    known = {}
    for ws, info in clients.items():
        if info["id"] != user_id:
            known[info["id"]] = {"id": info["id"], "username": info["username"], "online": True,
            "last_seen": last_seen_map.get(info["id"], now_ts())}

    for msg in messages:
        if not msg.get("is_dm"):
            continue

        sender_id    = msg.get("user_id")
        recipient_id = msg.get("recipient")
        sender_name  = msg.get("user")
        recipient_username = msg.get("recipient_username")

        if sender_id == user_id and recipient_id and recipient_id not in known:
            known[recipient_id] = {"id": recipient_id, "username": recipient_username or "ناشناس", "online": False,
            "last_seen": last_seen_map.get(recipient_id, now_ts())
            }
        elif recipient_id == user_id and sender_id and sender_id not in known:
            known[sender_id] = {"id": sender_id, "username": sender_name or "ناشناس", "online": False,
            "last_seen": last_seen_map.get(sender_id, now_ts())
            }

    for uname, uid in user_id_map.items():
        if uid != user_id and uid not in known:
            is_online = any(info["id"] == uid for info in clients.values())
            known[uid] = {"id": uid, "username": uname, "online": is_online ,
            "last_seen": last_seen_map.get(uid, now_ts())
            }
    return list(known.values())

async def handle_message(ws, username, user_id, data):
    message   = build_message(username, user_id, data)
    recipient = data.get("recipient")

    if recipient:
        recipient_ws, _ = find_ws_by_user_id(recipient)
        messages.append(message)
        trim_messages()
        await safe_send(ws, message)

        if recipient_ws and recipient_ws != ws:
            await safe_send(recipient_ws, message)
        elif not recipient_ws:
            print(f"[INFO] Recipient {recipient} is offline.")
    else:
        messages.append(message)
        trim_messages()
        await safe_send(ws, message)
        await broadcast(message, exclude=ws)

def is_video_expired(video_path: Path):
    try:
        age = now_ts() - int(video_path.stat().st_mtime)
        return age >= VIDEO_TTL_SECONDS
    except FileNotFoundError:
        return True

def get_video_file_path_from_url(video_url):
    if not video_url or not isinstance(video_url, str):
        return None
    prefix = "/media/videos/"
    if not video_url.startswith(prefix):
        return None
    name = Path(video_url.replace(prefix, "", 1)).name
    if not name:
        return None
    return VIDEO_DIR / name

async def cleanup_expired_videos_once():
    expired_urls = set()
    for video_file in VIDEO_DIR.glob("*"):
        if not video_file.is_file():
            continue
        if is_video_expired(video_file):
            expired_urls.add(f"/media/videos/{video_file.name}")
            if video_file.exists():
                video_file.unlink()

    if not expired_urls:
        return

    changed = False
    for msg in messages:
        if msg.get("video") in expired_urls:
            msg["video"] = None
            msg["updated_at"] = now_ts()
            changed = True

    if changed:
        trim_messages()

async def cleanup_expired_videos_loop():
    while True:
        try:
            await cleanup_expired_videos_once()
        except Exception as exc:
            print(f"[CLEANUP ERROR] {exc}")
        await asyncio.sleep(500)
async def upload_video(request):
    reader = await request.multipart()
    part = await reader.next()
    if not part or part.name != "video":
        return web.json_response({"error": "video field is required"}, status=400)

    filename = part.filename or "video"
    ext = Path(filename).suffix.lower()
    if not ext or ext not in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
        ext = '.mp4'

    unique_filename = f"{uuid.uuid4()}{ext}"
    video_path = VIDEO_DIR / unique_filename

    size = 0
    with open(video_path, "wb") as f:
        while True:
            chunk = await part.read_chunk()
            if not chunk:
                break
            size += len(chunk)
            if size > VIDEO_MAX_UPLOAD_SIZE:
                f.close()
                if video_path.exists():
                    video_path.unlink()
                return web.json_response({"error": "video too large"}, status=413)
            f.write(chunk)

    if size == 0:
        if video_path.exists():
            video_path.unlink()
        return web.json_response({"error": "empty video"}, status=400)

    return web.json_response({
        "ok": True,
        "video_url": f"/media/videos/{unique_filename}",
        "expires_in_seconds": VIDEO_TTL_SECONDS,
        "size_bytes": size
    })

async def handle_client(ws):
    username = None
    try:
        raw = await ws.recv()
        join = json.loads(raw)

        if join.get("type") != "join":
            await safe_send(ws, {"type": "error", "message": "First message must be join"})
            return

        username = (join.get("user") or "").strip()
        last_message_id = int(join.get("last_message_id", 0) or 0)
        last_sync_at = int(join.get("last_sync_at", 0) or 0)

        global message_id_counter

        if last_message_id > message_id_counter:
            last_message_id = 0

        if not username:
            await safe_send(ws, {"type": "error", "message": "Username is required"})
            return

        user_id = get_or_create_user_id(username)
        last_seen_map[user_id] = now_ts()

        old_ws, _ = find_ws_by_username(username)
        if old_ws and old_ws != ws:
            await safe_send(old_ws, {"type": "error", "message": "Logged in from another session"})
            await old_ws.close()
            clients.pop(old_ws, None)

        clients[ws] = {"username": username, "id": user_id}

        await safe_send(ws, {
            "type": "joined",
            "user": username,
            "user_id": user_id,
            "server_time": now_ts(),
            "server_message_id": message_id_counter
        })

        await send_users()

        history = get_delta_messages_for_user(
            user_id=user_id,
            last_message_id=last_message_id,
            last_sync_at=last_sync_at
        )

        chunks = split_history_chunks(history)
        for i, chunk in enumerate(chunks):
            await safe_send(ws, {
                "type": "history",
                "messages": chunk,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "is_last": i == len(chunks) - 1,
                "is_delta": True
            })

        print(f"[JOIN] {username} ({user_id}) - Sent {len(history)} msgs in {len(chunks)} chunks")

        while True:
            raw = await ws.recv()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "clear":
                global messages
                messages = []
                message_id_counter = 0
                print("clearchat by", username)

            elif msg_type == "typing":
                dm_username = data.get("currentDMUser")
                if dm_username:
                    dm_ws, _ = find_ws_by_username(dm_username)
                    if dm_ws:
                        await safe_send(dm_ws, {"type": "typing", "user": username, "user_id": user_id})
                else:
                    await broadcast({"type": "typing", "user": username, "user_id": user_id}, exclude=ws)

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

    except websockets.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[SERVER ERROR] {e}")
        traceback.print_exc()
    finally:
        if ws in clients:
            clients.pop(ws, None)
            await send_users()

        if username and user_id_map.get(username):
            uid = user_id_map[username]
            last_seen_map[uid] = now_ts()

        print(f"[DISCONNECT] {username or 'unknown'}")

async def get_unread_count(request):
    username = request.match_info.get('username')
    if not username:
        return web.json_response({"error": "Username is required"}, status=400)

    user_id = user_id_map.get(username)

    if not user_id:
        return web.json_response({"username": username, "unread_count": 0})

    unread_count = 0
    for msg in messages:
        if msg.get("user_id") == user_id:
            continue
        if user_id in msg.get("read_by", []):
            continue
        if msg.get("is_dm"):
            if msg.get("recipient") == user_id:
                unread_count += 1
        else:
            unread_count += 1

    return web.json_response({
        "username": username,
        "unread_count": unread_count
    })

async def main():
    app = web.Application()

    # تنظیم CORS
    cors = cors_setup(app, defaults={
        "*": ResourceOptions(
            allow_credentials=True,
            expose_headers="*",
            allow_headers="*",
            allow_methods="*"
        )
    })

    cors.add(app.router.add_get('/chatapi/unread/{username}', get_unread_count))
    cors.add(app.router.add_post('/chatapi/upload-video', upload_video))

    app.router.add_static('/media/', path=str(MEDIA_ROOT), show_index=False)

    runner = web.AppRunner(app)
    await runner.setup()
    http_site = web.TCPSite(runner, '0.0.0.0', 8086)
    await http_site.start()
    print("[HTTP] API server started on port 8086")
    print("[CORS] CORS enabled for all origins")

    ws_server = await websockets.serve(
        handle_client,
        "0.0.0.0",
        8085,
        max_size=10 * 1024 * 1024,
        ping_interval=None,
        ping_timeout=None,
    )
    print("[WS] WebSocket server started on port 8085")
    asyncio.create_task(cleanup_expired_videos_loop())
    await cleanup_expired_videos_once()

    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
