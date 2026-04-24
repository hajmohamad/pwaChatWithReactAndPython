import React, {useEffect, useState} from "react";
import { ChatProvider } from "./context/ChatContext";
import Chat from "./components/Chat";
import SelectUser from "./components/SelectUser";
import { BrowserRouter, Routes, Route } from "react-router-dom";
const STORAGE_VERSION = 7;



export async function clearAllStorage() {
    try {

        const secretKey = localStorage.getItem("SECRET_KEY");

        // 1️⃣ IndexedDB
        if (indexedDB.databases) {
            const dbs = await indexedDB.databases();

            for (const db of dbs) {
                await new Promise((resolve) => {
                    const req = indexedDB.deleteDatabase(db.name);
                    req.onsuccess = req.onerror = req.onblocked = resolve;
                });
            }
        }

        console.log("✅ IndexedDB cleared");


        // 2️⃣ LocalStorage
        localStorage.clear();

        if (secretKey) {
            localStorage.setItem("SECRET_KEY", secretKey);
        }

        console.log("✅ LocalStorage cleared");


        // 3️⃣ Session
        sessionStorage.clear();


        // 4️⃣ CacheStorage
        if ("caches" in window) {
            const cacheNames = await caches.keys();

            for (const name of cacheNames) {
                await caches.delete(name);
            }
        }

        console.log("🎉 All storages cleared");
        window.location.reload();

    } catch (err) {
        console.error("❌ Error clearing storages:", err);
    }
}

export default function App() {
    const [SECRET_KEY, setSECRET_KEY] = useState("");


        useEffect(() => {
            const savedName = localStorage.getItem("SECRET_KEY");

            if (savedName) {
                setSECRET_KEY(savedName);
            } else {
                const name = prompt("رمزو بده خوشگله");
                if (name) {
                    localStorage.setItem("SECRET_KEY", name);
                    setSECRET_KEY(name);
                }
            }
        }, []);


    useEffect(() => {
        initStorage().then(r => "clear db");
    }, []);
    async function initStorage() {
        const savedVersion = Number(localStorage.getItem("SavedVersion") || 0);

        if (savedVersion !== STORAGE_VERSION) {
            await clearAllStorage();

            localStorage.setItem("SavedVersion",STORAGE_VERSION);
        }
    }






    useEffect(() => {

        const path = window.location.pathname;

        const manifest = {
            name: path.replace("/", ""),
            short_name: path.replace("/", ""),
            start_url: path,
            display: "standalone",
            background_color: "#ffffff",
            theme_color: "#000000",
            icons: [
                {
                    src: "/logo98.jpeg",
                    sizes: "192x192",
                    type: "image/png"
                }
            ]
        };

        const stringManifest = JSON.stringify(manifest);
        const blob = new Blob([stringManifest], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.querySelector("#manifest-placeholder");
        if (link) {
            link.setAttribute("href", url);
        }

    }, []);

    return (
        <BrowserRouter>
            <Routes>

                <Route path="/admin" element={<SelectUser />} />

                <Route
                    path="/mohamad"
                    element={
                        <ChatProvider username="mohamad">
                            <Chat />
                        </ChatProvider>
                    }
                />

                <Route
                    path="/anita"
                    element={
                        <ChatProvider username="anita">
                            <Chat />
                        </ChatProvider>
                    }
                />

                <Route
                    path="/paniz"
                    element={
                        <ChatProvider username="paniz">
                            <Chat />
                        </ChatProvider>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}
