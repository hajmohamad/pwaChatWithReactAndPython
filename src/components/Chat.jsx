import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MessageList from './MessageList';
import InputBar from './InputBar';
import DMPanel from './DMPanel';
import ReplyIndicator from './ReplyIndicator';
import TypingIndicator from './TypingIndicator';
import LogPanel from './LogPanel';
import PwaUpdateBanner from './PwaUpdateBanner';
import MediaGalleryPanel from './MediaGalleryPanel';
import useWebSocket from '../hooks/useWebSocket';
import useDarkMode from '../hooks/useDarkMode';
import { useChatContext } from '../context/ChatContext';
import '../styles/Chat.css';

export default function Chat() {
    const { darkMode, username, performanceMode } = useChatContext();
    const { send, socketRef, currentDMRef } = useWebSocket();

    return (
        <div id="chat-wrapper" className={`${darkMode ? 'dark' : ''} ${performanceMode ? 'perf-mode' : ''}`.trim()}>
            <div
                id="sidebar-overlay"
                onClick={() => {
                    document.getElementById('users-sidebar')?.classList.remove('open');
                    document.getElementById('sidebar-overlay')?.classList.remove('open');
                }}
            />

            <div
                id="dm-overlay"
                onClick={(e) => {
                    if (e.target.id === 'dm-overlay') {
                        e.currentTarget.classList.remove('open');
                    }
                }}
            >
                <DMPanel socketRef={socketRef} currentDMRef={currentDMRef} />
            </div>

            <div
                id="media-overlay"
                onClick={(e) => {
                    if (e.target.id === 'media-overlay') {
                        e.currentTarget.classList.remove('open');
                    }
                }}
            >
                <MediaGalleryPanel />
            </div>

            <div id="chat">
                {/*<Sidebar currentDMRef={currentDMRef} />*/}
                <div id="main">
                    <Header send={send} socketRef={socketRef} currentDMRef={currentDMRef} />
                    <PwaUpdateBanner />
                    <MessageList send={send} />
                    <ReplyIndicator />
                    <InputBar send={send} socketRef={socketRef} />
                    <TypingIndicator />
                </div>
            </div>
            {username === "mohamad" && <LogPanel />}

        </div>
    );
}
