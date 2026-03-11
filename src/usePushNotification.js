import { useState, useEffect, useCallback } from "react";
import {logDOM} from "@testing-library/dom";
import {useChatContext} from "./context/ChatContext";

const HTTP_BASE = "https://server.chaarset.ir";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export default function usePushNotification(username) {
    const {

        addLog,
       
    } = useChatContext();
    // "idle" | "loading" | "granted" | "denied" | "unsupported"
    const [status, setStatus] = useState("idle");

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setStatus("unsupported");
            return;
        }
        if (Notification.permission === "granted") {
            setStatus("granted");
            addLog("granted");
        } else if (Notification.permission === "denied") {
            setStatus("denied");
        }
    }, []);

    const subscribe = useCallback(async () => {
        console.log("🔔 PUSH: subscribe called");

        if (!username) {
            console.log("❌ PUSH: username missing");
            return;
        }

        setStatus("loading");
        console.log("⏳ PUSH: status -> loading");

        try {

            console.log("1️⃣ PUSH: fetching VAPID public key...");

            const keyRes = await fetch(`${HTTP_BASE}/vapid-public-key`);
            console.log("✅ PUSH: vapid response received", keyRes);

            const data = await keyRes.json();
            console.log("✅ PUSH: vapid json parsed", data);

            const publicKey = data.publicKey;
            console.log("✅ PUSH: publicKey =", publicKey);



            console.log("2️⃣ PUSH: requesting notification permission...");

            const permission = await Notification.requestPermission();
            console.log("✅ PUSH: permission result =", permission);

            if (permission !== "granted") {
                console.log("❌ PUSH: permission denied");
                setStatus("denied");
                return;
            }



            console.log("3️⃣ PUSH: registering service worker...");

            const reg = await navigator.serviceWorker.register("/sw.js");
            console.log("✅ PUSH: service worker registered", reg);

            console.log("3️⃣.1 PUSH: waiting for service worker ready...");

            const readyReg = await navigator.serviceWorker.ready;
            console.log("✅ PUSH: service worker ready", readyReg);



            console.log("4️⃣ PUSH: converting VAPID key...");

            const convertedKey = urlBase64ToUint8Array(publicKey);
            console.log("✅ PUSH: converted VAPID key", convertedKey);



            console.log("5️⃣ PUSH: subscribing to push manager...");

            const subscription = await readyReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey,
            });

            console.log("✅ PUSH: subscription created", subscription);

            addLog(subscription);
            addLog("subscription ready");



            console.log("6️⃣ PUSH: sending subscription to server...");

            const subRes = await fetch(`${HTTP_BASE}/subscribe/${username}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscription: subscription.toJSON() }),
            });

            console.log("✅ PUSH: server subscribe response", subRes);



            console.log("✅ PUSH: subscription flow finished");

            setStatus("granted");
            addLog("[Push] Subscribed successfully for " + username);

        } catch (err) {

            console.error("💥 PUSH ERROR:", err);
            addLog("[Push] Subscribe failed:");
            addLog(err);

            setStatus("idle");
        }

    }, [username]);

    const unsubscribe = useCallback(async () => {
        if (!username) return;
        try {
            const reg = await navigator.serviceWorker.getRegistration("/sw.js");
            if (!reg) return;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch(`${HTTP_BASE}/unsubscribe/${username}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setStatus("idle");
        } catch (err) {
            addLog("[Push] Unsubscribe failed:", err);
        }
    }, [username]);

    return { status, subscribe, unsubscribe };
}
