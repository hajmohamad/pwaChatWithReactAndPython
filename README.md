
---

# پروژه PWA Chat (React & Python)

این پروژه یک برنامه پیام‌رسان تحت وب (PWA) با قابلیت‌های پیشرفته نظیر رمزنگاری سرتاسری (E2E Encryption)، پیام صوتی، اشتراک‌گذاری مدیا، و همگام‌سازی لحظه‌ای (Real-time) است که با فرانت‌اند React و بک‌اند Python (WebSockets / Aiohttp) پیاده‌سازی شده است.

---

## 🚀 ویژگی‌های کلیدی پروژه

### پشتیبانی از PWA (Progressive Web App)
- قابلیت نصب روی موبایل و دسکتاپ
- کارکرد آفلاین و کش‌کردن پیام‌ها
- بنر اطلاع‌رسانی نسخه جدید (PwaUpdateBanner)
- سیستم پوش نوتیفیکیشن‌ها (usePushNotification)

### سیستم چت امن و مدرن
- چت گروهی و چت خصوصی (DM)
- نشانگر تایپ کردن (TypingIndicator)
- وضعیت خوانده شدن پیام‌ها (Read Receipt)
- ریپلای و واکنش (Reaction) با ایموجی
- گالری مدیا برای مشاهده تصاویر و ویدیوها

### امنیت و حریم خصوصی
- رمزنگاری سرتاسری پیام‌ها با useEncryption
- نگهداری امن کلیدهای رمزنگاری در کلاینت

### رسانه و صوت
- ضبط صدا داخل برنامه (VoiceRecorder)
- پخش پیام صوتی (VoiceMessage)
- مدیریت بهینه آپلود ویدیو و تصاویر

### امکانات رابط کاربری
- پشتیبانی تم تاریک و روشن (useDarkMode)
- پنل لاگ رویدادها (LogPanel)
- مدیریت وضعیت سراسری با React Context (ChatContext)

---

## 📂 ساختار پوشه‌ها

### src/
```
App.jsx
index.js
index.css
usePushNotification.js

components/
  Chat.jsx
  Header.jsx
  Sidebar.jsx
  DMPanel.jsx
  InputBar.jsx
  MessageList.jsx
  Message.jsx
  SelectUser.jsx
  TypingIndicator.jsx
  ReplyIndicator.jsx
  VoiceRecorder.jsx
  VoiceMessage.jsx
  MediaGalleryPanel.jsx
  LogPanel.jsx
  PwaUpdateBanner.jsx

context/
  ChatContext.js

hooks/
  useWebSocket.js
  useEncryption.js
  useDarkMode.js

styles/
  Chat.css

utils/
  encryption.js
  helpers.js
  imageResolver.js
  messageCache.js
```

### Backend (Python)
```
server.py        # سرور aiohttp + websockets
push.py          # مدیریت پوش نوتیفیکیشن‌ها
```

---

## 🛠️ راه‌اندازی پروژه

### پیش‌نیازها
- Node.js نسخه 16+
- Python نسخه 3.8+

### راه‌اندازی Backend (Python)

```bash
pip install aiohttp aiohttp_cors websockets pywebpush
python server.py
```

### راه‌اندازی Frontend (React)

```bash
npm install
npm start
```

---

## 📲 نصب به عنوان PWA

```bash
npm run build
npm install -g serve
serve -s build
```

سپس اپلیکیشن را از مرورگر نصب کنید.

---

## 🔒 امنیت و رمزنگاری

پیام‌ها قبل از ارسال از طریق وب‌سوکت، در کلاینت با فایل  
`utils/encryption.js`  
رمزنگاری می‌شوند.

سرور فقط نقش Relay دارد و **به هیچ‌وجه** قادر به خواندن پیام نیست.

کلیدهای پیام‌رسانی فقط در کلاینت ذخیره می‌شوند.

---

