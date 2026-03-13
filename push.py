# from aiohttp import web
# import aiohttp
# from pywebpush import webpush, WebPushException



# ─── Push Notification Config ───────────────────────────────────────────────
# VAPID_PUBLIC_KEY  = "BBM15UGuQeJuLJanX8jMI4HW21QvNmzOxMi4mbKYnkzcnQXoe21NJy_wDvObRtStPsNljRrUf5I1AmKwHFCJrd8"
# VAPID_PRIVATE_KEY = "92uAooIFptZkchhR9ah76lEYaT7-NsqSySB9nQkngeU"
# VAPID_CLAIMS      = {"sub": "mailto:admin@yourchat.com"}

# { username -> [subscription_dict, ...] }
# push_subscriptions: dict[str, list[dict]] = {}
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
