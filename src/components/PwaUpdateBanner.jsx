import React from 'react';
import { useChatContext } from '../context/ChatContext';

export default function PwaUpdateBanner() {
    const { pwaUpdateReady, isStandalonePWA, applyPwaUpdate } = useChatContext();

    if (!isStandalonePWA || !pwaUpdateReady) return null;

    return (
        <div className="pwa-update-banner" role="status" aria-live="polite">
            <span>نسخه جدید آماده‌ست</span>
            <button onClick={applyPwaUpdate}>آپدیت و ریلود</button>
        </div>
    );
}
