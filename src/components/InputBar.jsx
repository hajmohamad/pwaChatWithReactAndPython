import React, { useRef, useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import { encryptText } from '../utils/encryption';
import { nowTime, readFileAsBase64 } from '../utils/helpers';
import VoiceRecorder from './VoiceRecorder';

const API_HTTP_BASE = 'https://server.chaarset.ir';
const MAX_VIDEO_SIZE = 30 * 1024 * 1024; // کاهش به 30MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MESSAGE_SIZE = 9 * 1024 * 1024; // 9MB
const TYPING_THROTTLE = 1200; // ms

export default function InputBar({ send, socketRef }) {
    const {
        currentDMUser,
        replyTo,
        setReplyTo,
        selectedImageB64,
        setSelectedImageB64,
        addLog,
    } = useChatContext();

    const textRef = useRef(null);
    const fileRef = useRef(null);
    const videoRef = useRef(null);
    const lastTypingSentAtRef = useRef(0);

    const [fileName, setFileName] = useState('');
    const [previewSrc, setPreviewSrc] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [voiceMode, setVoiceMode] = useState(false);
    const [selectedVideoUrl, setSelectedVideoUrl] = useState(null);
    const [videoName, setVideoName] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            clearImage();
            return;
        }

        if (!file.type.startsWith('image/')) {
            addLog('فقط فایل تصویر قابل ارسال است', 'error');
            clearImage();
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            addLog(`عکس خیلی بزرگ است (حداکثر ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`, 'error');
            clearImage();
            return;
        }

        setUploadStatus('در حال بارگذاری تصویر...');
        setIsUploading(true);

        try {
            const b64 = await readFileAsBase64(file);
            setSelectedImageB64(b64);
            setPreviewSrc(b64);
            setFileName(file.name);
            setUploadStatus('');
            addLog(`تصویر "${file.name}" آماده ارسال شد`, 'success');
        } catch (err) {
            addLog('خطا در خواندن تصویر: ' + err.message, 'error');
            clearImage();
        } finally {
            setIsUploading(false);
        }
    };

    const clearImage = () => {
        setSelectedImageB64(null);
        setPreviewSrc('');
        setFileName('');
        setUploadStatus('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const clearVideo = () => {
        setSelectedVideoUrl(null);
        setVideoName('');
        setUploadStatus('');
        setIsUploading(false);
        if (videoRef.current) videoRef.current.value = '';
    };

    const handleVideoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            clearVideo();
            return;
        }

        // اعتبارسنجی نوع فایل
        if (!file.type.startsWith('video/')) {
            addLog('فقط فایل ویدیو قابل ارسال است', 'error');
            clearVideo();
            return;
        }

        // بررسی حجم ویدیو
        if (file.size > MAX_VIDEO_SIZE) {
            const sizeMB = (file.size / 1024 / 1024).toFixed(2);
            addLog(`ویدیو خیلی بزرگ است (${sizeMB}MB). حداکثر ${MAX_VIDEO_SIZE / 1024 / 1024}MB`, 'error');
            clearVideo();
            return;
        }

        // بررسی فرمت‌های مجاز
        const allowedFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (!allowedFormats.includes(file.type)) {
            addLog('فرمت ویدیو پشتیبانی نمی‌شود. فرمت‌های مجاز: MP4, WebM, OGG', 'error');
            clearVideo();
            return;
        }

        setUploadStatus('در حال آپلود ویدیو...');
        setIsUploading(true);

        try {
            addLog(`شروع آپلود ویدیو: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'info');

            const formData = new FormData();
            formData.append('video', file);

            const response = await fetch(`${API_HTTP_BASE}/chatapi/upload-video`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.video_url) {
                throw new Error(data.error || 'آپلود ویدیو ناموفق بود');
            }

            setSelectedVideoUrl(data.video_url);
            setVideoName(file.name);
            setUploadStatus('');
            addLog('✅ ویدیو با موفقیت آپلود شد', 'success');

        } catch (err) {
            console.error('Video upload error:', err);
            addLog('خطا در آپلود ویدیو: ' + err.message, 'error');
            clearVideo();
        } finally {
            setIsUploading(false);
        }
    };

    const handleVoiceReady = async (audioB64, duration) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            addLog('اتصال WebSocket برقرار نیست', 'error');
            return;
        }

        if (!audioB64) {
            addLog('ویس دریافت نشد', 'error');
            return;
        }

        try {
            const voiceText = `__VOICE__:${duration}:${audioB64}`;
            const encryptedVoice = await encryptText(voiceText);

            const payload = {
                type: 'message',
                text: encryptedVoice,
                image: null,
                video: null,
                reply: replyTo ? {
                    id: replyTo.id,
                    user: replyTo.user,
                    text: replyTo.text
                } : null,
                time: nowTime(),
            };

            if (currentDMUser) {
                payload.recipient = currentDMUser.id;
                payload.recipient_username = currentDMUser.username;
            }

            socketRef.current.send(JSON.stringify(payload));
            addLog(`🎤 ویس ارسال شد (${duration} ثانیه)`, 'success');

            setVoiceMode(false);
            setReplyTo(null);

        } catch (err) {
            console.error('Voice send error:', err);
            addLog('خطا در ارسال ویس: ' + err.message, 'error');
        }
    };

    const handleSend = async () => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            addLog('اتصال WebSocket برقرار نیست', 'error');
            return;
        }

        const rawText = textRef.current?.value.trim();

        if (rawText === 'clearchat') {
            socketRef.current.send(JSON.stringify({ type: 'clear' }));
            if (textRef.current) textRef.current.value = '';
            addLog('چت پاک شد', 'info');
            return;
        }

        if (!rawText && !selectedImageB64 && !selectedVideoUrl) {
            addLog('لطفاً متن، تصویر یا ویدیو وارد کنید', 'warning');
            return;
        }

        if (isUploading) {
            addLog('لطفاً صبر کنید، فایل در حال آپلود است...', 'warning');
            return;
        }

        try {
            const encryptedText = rawText ? await encryptText(rawText) : null;
            const encryptedImage = selectedImageB64 ? await encryptText(selectedImageB64) : null;

            const payload = {
                type: 'message',
                text: encryptedText,
                image: encryptedImage,
                video: selectedVideoUrl,
                reply: replyTo ? {
                    id: replyTo.id,
                    user: replyTo.user,
                    text: replyTo.text
                } : null,
                time: nowTime(),
            };

            if (currentDMUser) {
                payload.recipient = currentDMUser.id;
                payload.recipient_username = currentDMUser.username;
            }

            const jsonStr = JSON.stringify(payload);
            const sizeMB = (new Blob([jsonStr]).size / 1024 / 1024).toFixed(2);

            if (parseFloat(sizeMB) > MAX_MESSAGE_SIZE) {
                addLog(`❌ پیام خیلی بزرگ است (${sizeMB}MB). حداکثر ${MAX_MESSAGE_SIZE / 1024 / 1024}MB`, 'error');
                return;
            }

            socketRef.current.send(jsonStr);
            addLog(`📤 پیام ارسال شد (حجم: ${sizeMB}MB)`, 'success');

            if (textRef.current) textRef.current.value = '';
            clearImage();
            clearVideo();
            setReplyTo(null);

        } catch (err) {
            console.error('Send error:', err);
            addLog('خطا در ارسال پیام: ' + err.message, 'error');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const now = Date.now();
            if (now - lastTypingSentAtRef.current < TYPING_THROTTLE) return;

            lastTypingSentAtRef.current = now;
            socketRef.current.send(JSON.stringify({
                type: 'typing',
                currentDMUser: currentDMUser?.username
            }));
        }
    };

    return (
        <div id="input">
            <button
                id="send-btn"
                onClick={handleSend}
                disabled={isUploading}
                style={{ opacity: isUploading ? 0.6 : 1 }}
            >
                {isUploading ? 'در حال آپلود...' : 'ارسال'}
            </button>

            {/* پیش‌نمایش تصویر */}
            {previewSrc && (
                <div id="file-preview">
                    <img id="preview-img" src={previewSrc} alt="پیش‌نمایش" />
                    <button onClick={clearImage} className="remove-btn">✕ حذف</button>
                </div>
            )}

            {/* پیش‌نمایش ویدیو */}
            {selectedVideoUrl && (
                <div id="file-preview">
                    <video
                        src={`${API_HTTP_BASE}${selectedVideoUrl}`}
                        controls
                        style={{ maxWidth: 180, borderRadius: 8 }}
                    />
                    <button onClick={clearVideo} className="remove-btn">✕ حذف</button>
                </div>
            )}

            {/* وضعیت آپلود */}
            {uploadStatus && (
                <div id="upload-status" className="status-info">
                    {uploadStatus}
                </div>
            )}

            {/* حالت ضبط ویس */}
            {voiceMode ? (
                <VoiceRecorder
                    onVoiceReady={handleVoiceReady}
                    onCancel={() => setVoiceMode(false)}
                />
            ) : (
                <div style={{ display: 'flex', flex: 1, gap: '8px' }}>
                    <button
                        className="voice-record-btn"
                        title="ضبط ویس"
                        onClick={() => setVoiceMode(true)}
                        disabled={isUploading}
                    >
                        🎙️
                    </button>

                    <textarea
                        id="text"
                        ref={textRef}
                        placeholder="پیام بنویسید..."
                        rows={1}
                        onKeyDown={handleKeyDown}
                        onInput={handleInput}
                        disabled={isUploading}
                        style={{ flex: 1 }}
                    />
                </div>
            )}

            {/* دکمه‌های آپلود فایل */}
            <div style={{ display: 'flex', gap: '4px' }}>
                <label
                    id="file-label"
                    htmlFor="file"
                    title="ارسال تصویر (حداکثر 5MB)"
                    style={{ cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1 }}
                >
                    📷
                </label>
                <input
                    id="file"
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={isUploading}
                />

                <label
                    id="file-label"
                    htmlFor="video-file"
                    title="ارسال ویدیو (حداکثر 30MB - MP4, WebM, OGG)"
                    style={{ cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1 }}
                >
                    🎥
                </label>
                <input
                    id="video-file"
                    ref={videoRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    style={{ display: 'none' }}
                    onChange={handleVideoChange}
                    disabled={isUploading}
                />
            </div>

            {/* نمایش نام فایل‌ها */}
            {fileName && <span id="file-name" className="file-name">📷 {fileName}</span>}
            {videoName && <span id="file-name" className="file-name">🎥 {videoName}</span>}
        </div>
    );
}