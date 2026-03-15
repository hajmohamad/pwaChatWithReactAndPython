// /* ------------------------- Push Notification Handler ------------------------- */
// self.addEventListener("push", (event) => {
//     const data = event.data ? event.data.json() : {};
//     const title = data.title || "پیام جدید";
//     const options = {
//         body: data.body || "",
//         icon: data.icon || "/icon-192.png",
//         badge: data.badge || "/badge-72.png",
//         dir: "rtl",
//         lang: "fa",
//         vibrate: [200, 100, 200],
//         data: { url: data.data?.url || "/" },
//         actions: [{ action: "open", title: "باز کردن چت" }],
//     };
//     event.waitUntil(self.registration.showNotification(title, options));
// });
//
// /* ------------------------- Notification Click Handler ------------------------- */
// self.addEventListener("notificationclick", (event) => {
//     event.notification.close();
//     const url = event.notification.data?.url || "/";
//     event.waitUntil(
//         clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
//             for (const client of windowClients) {
//                 if (client.url.includes(url) && "focus" in client) {
//                     return client.focus();
//                 }
//             }
//             if (clients.openWindow) {
//                 return clients.openWindow(url);
//             }
//         })
//     );
// });
//
// /* ------------------------- Protect Blob and IndexedDB Requests ------------------------- */
// self.addEventListener("fetch", (event) => {
//     const url = event.request.url;
//
//     // اگر blob: یا data: بود، نذار SW دخالت کند
//     if (url.startsWith("blob:") || url.startsWith("data:")) return;
//
//     // سایر درخواست‌ها → به شبکه بده (عدم کش اجباری)
//     event.respondWith(fetch(event.request).catch(() => fetch(event.request)));
// });
//
// /* ------------------------- Periodic Notification ------------------------- */
// // این عملکرد توسط setInterval اجرا نمی‌شود چون Service Worker بیدار نیست همیشه!
// // باید از periodicSync یا alarmها استفاده شود.
// // اما برای حالت ساده‌ی تست و تا زمانی که SW فعال است:
// function showPeriodicNotification() {
//     self.registration.showNotification("یادآوری خودکار", {
//         body: "این یک اعلان تستی است که هر دقیقه ارسال می‌شود.",
//         icon: "/icon-192.png",
//         badge: "/badge-72.png",
//     });
// }
//
// // هر بار که فعال شد، تایمر شروع شود
// self.addEventListener("activate", (event) => {
//     event.waitUntil(
//         (async () => {
//             console.log("Background interval started");
//             setInterval(() => {
//                 showPeriodicNotification();
//             }, 60 * 1000); // هر 1 دقیقه
//         })()
//     );
// });
