import React, { useRef, useState, useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';
import { encryptText } from '../utils/encryption';
import { nowTime, readFileAsBase64 } from '../utils/helpers';

export default function InputBar({ send, socketRef }) {
    const {
        currentDMUser,
        replyTo,
        setReplyTo,
        selectedImageB64,
        setSelectedImageB64,
        addLog,
    } = useChatContext();

    const textRef    = useRef(null);
    const fileRef    = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef   = useRef([]);
    const recordingTimerRef = useRef(null);

    const [fileName, setFileName]         = useState('');
    const [previewSrc, setPreviewSrc]     = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [isRecording, setIsRecording]   = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);

    // ─── Image ────────────────────────────────────────────────────────────────
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) { clearImage(); return; }
        if (file.size > 5 * 1024 * 1024) {
            addLog('عکس خیلی بزرگ است (حداکثر 5MB)', 'error');
            clearImage();
            return;
        }
        setUploadStatus('در حال بارگذاری...');
        try {
            const b64 = await readFileAsBase64(file);
            setSelectedImageB64(b64);
            setPreviewSrc(b64);
            setFileName(file.name);
            setUploadStatus('');
            addLog('عکس آماده ارسال: ' + file.name, 'success');
        } catch (err) {
            addLog('خطا در خواندن عکس: ' + err.message, 'error');
            clearImage();
        }
    };

    const clearImage = () => {
        setSelectedImageB64(null);
        setPreviewSrc('');
        setFileName('');
        setUploadStatus('');
        if (fileRef.current) fileRef.current.value = '';
    };

    // ─── Voice Recording ──────────────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];
            const recorder = new MediaRecorder(stream);

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendVoice(blob);
                setRecordSeconds(0);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordSeconds(0);

            // شمارنده و حداکثر ۶۰ ثانیه
            let sec = 0;
            recordingTimerRef.current = setInterval(() => {
                sec += 1;
                setRecordSeconds(sec);
                if (sec >= 60) stopRecording();
            }, 1000);

        } catch (err) {
            addLog('دسترسی به میکروفون ممکن نیست: ' + err.message, 'error');
        }
    };

    const stopRecording = () => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const sendVoice = async (blob) => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
            addLog('اتصال WebSocket برقرار نیست', 'error');
            return;
        }

        // تبدیل blob به base64
        const b64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // data:audio/webm;base64,...
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // اضافه کردن prefix تا موقع دریافت بشناسیمش
        const voiceText = 'VOICE_MSG:' + b64;
        const encryptedVoice = await encryptText(voiceText);

        const payload = {
            type:  'message',
            text:  encryptedVoice,
            image: null,
            reply: replyTo
                ? { id: replyTo.id, user: replyTo.user, text: replyTo.text }
                : null,
            time:  nowTime(),
        };

        if (currentDMUser) {
            payload.recipient          = currentDMUser.id;
            payload.recipient_username = currentDMUser.username;
        }

        const jsonStr = JSON.stringify(payload);
        const sizeMB  = (new Blob([jsonStr]).size / 1024 / 1024).toFixed(2);

        if (parseFloat(sizeMB) > 9) {
            addLog('ویس خیلی بزرگ است (' + sizeMB + 'MB).', 'error');
            return;
        }

        addLog('ارسال ویس — حجم: ' + sizeMB + 'MB', 'info');
        try {
            socketRef.current.send(jsonStr);
            setReplyTo(null);
        } catch (err) {
            addLog('خطا در ارسال ویس: ' + err.message, 'error');
        }
    };

    // ─── Text Send ────────────────────────────────────────────────────────────
    const handleSend = async () => {
        const rawText = textRef.current?.value.trim();
        if (rawText === 'clearchat') {
            socketRef.current.send(JSON.stringify({ type: 'clear' }));
            if (textRef.current) textRef.current.value = '';
            return;
        }
        if (!rawText && !selectedImageB64) return;

        if (socketRef.current?.readyState !== WebSocket.OPEN) {
            addLog('اتصال WebSocket برقرار نیست', 'error');
            return;
        }

        const encryptedText       = rawText          ? await encryptText(rawText)          : null;
        const encryptedImageB64   = selectedImageB64 ? await encryptText(selectedImageB64) : null;

        const payload = {
            type:  'message',
            text:  encryptedText,
            image: encryptedImageB64,
            reply: replyTo
                ? { id: replyTo.id, user: replyTo.user, text: replyTo.text }
                : null,
            time:  nowTime(),
        };

        if (currentDMUser) {
            payload.recipient          = currentDMUser.id;
            payload.recipient_username = currentDMUser.username;
        }

        const jsonStr = JSON.stringify(payload);
        const sizeMB  = (new Blob([jsonStr]).size / 1024 / 1024).toFixed(2);

        if (parseFloat(sizeMB) > 9) {
            addLog('پیام خیلی بزرگ است (' + sizeMB + 'MB). عکس کوچک‌تری انتخاب کنید.', 'error');
            return;
        }

        addLog('ارسال پیام — حجم: ' + sizeMB + 'MB', 'info');
        try {
            socketRef.current.send(jsonStr);
        } catch (err) {
            addLog('خطا در ارسال: ' + err.message, 'error');
            return;
        }

        if (textRef.current) textRef.current.value = '';
        clearImage();
        setReplyTo(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'typing' }));
        }
    };

    return (
        <div id="input">
            <button id="send-btn" onClick={handleSend}>ارسال</button>

            {/* Voice button */}
            <button
                id="voice-btn"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                title="نگه دار برای ضبط صدا"
                style={{
                    background: isRecording ? '#e53935' : undefined,
                    color: isRecording ? '#fff' : undefined,
                }}
            >
                {isRecording ? `🔴 ${recordSeconds}s` : '🎙️'}
            </button>

            {previewSrc && (
                <div id="file-preview">
                    <img id="preview-img" src={previewSrc} alt="پیش‌نمایش" />
                    <button onClick={clearImage} style={{ marginTop: 4, fontSize: 11 }}>✕ حذف</button>
                </div>
            )}

            {uploadStatus && <div id="upload-status">{uploadStatus}</div>}

            <textarea
                id="text"
                ref={textRef}
                placeholder="پیام بنویسید..."
                rows={1}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
            />

            <label id="file-label" htmlFor="file" title="ارسال تصویر">📷</label>
            <input
                id="file"
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {fileName && <span id="file-name">{fileName}</span>}
        </div>
    );
}
