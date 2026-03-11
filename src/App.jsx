import React from "react";
import { ChatProvider } from "./context/ChatContext";
import Chat from "./components/Chat";
import SelectUser from "./components/SelectUser";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export default function App() {
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
