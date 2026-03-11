import React from 'react';
import { useChatContext } from '../context/ChatContext';

export default function LogPanel() {
    const { logs, showLog, setShowLog } = useChatContext();

    return (
        <>
            <button
                id="toggle-log"
                onClick={() => setShowLog(prev => !prev)}
                title="لاگ‌ها"
            >
                🪵
            </button>

            {showLog && (
                <div id="log-panel">
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>لاگ‌ها</div>
                    {logs.map((log, i) => (
                        <div
                            key={i}
                            style={{
                                fontSize: 11,
                                color: log.type === 'error'
                                    ? '#f87171'
                                    : log.type === 'success'
                                        ? '#4ade80'
                                        : '#94a3b8',
                                marginBottom: 2,
                            }}
                        >
                            [{log.time}] {log.message}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
