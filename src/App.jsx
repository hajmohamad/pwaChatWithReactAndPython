import React from 'react';
import { ChatProvider } from './context/ChatContext';
import Chat from './components/Chat';

function App() {
    return (
        <ChatProvider>
            <Chat />
        </ChatProvider>
    );
}

export default App;
