import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MessageList from './MessageList';
import InputBar from './InputBar';
import DMPanel from './DMPanel';
import ReplyIndicator from './ReplyIndicator';
import TypingIndicator from './TypingIndicator';
import LogPanel from './LogPanel';
import useWebSocket from '../hooks/useWebSocket';
import useDarkMode from '../hooks/useDarkMode';
import { useChatContext } from '../context/ChatContext';
import '../styles/Chat.css';

export default function Chat() {
    const { darkMode } = useChatContext();
    const { send, socketRef } = useWebSocket();

    return (
        <div id="chat-wrapper" className={darkMode ? 'dark' : ''}>
            <div id="sidebar-overlay" onClick={() => {
                document.getElementById('users-sidebar')?.classList.remove('open');
                document.getElementById('sidebar-overlay')?.classList.remove('open');
            }} />

            <div id="dm-overlay" onClick={(e) => {
                if (e.target.id === 'dm-overlay') {
                    e.currentTarget.classList.remove('open');
                }
            }}>
                <DMPanel socketRef={socketRef} />
            </div>

            <div id="chat">
                <Sidebar />
                <div id="main">
                    <Header send={send} socketRef={socketRef} />
                    <ReplyIndicator />
                    <MessageList send={send} />
                    <TypingIndicator />
                    <InputBar send={send} socketRef={socketRef} />
                </div>
            </div>

            <LogPanel />
        </div>
    );
}
