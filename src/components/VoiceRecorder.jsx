// src/components/VoiceRecorder.jsx
import React, { useState, useRef, useEffect } from 'react';

const MIN_DURATION = 2000;  // 2 ثانیه
const MAX_DURATION = 60000; // 1 دقیقه

export default function VoiceRecorder({ onVoiceReady, onCancel }) {
    const [status, setStatus] = useState('idle');
    const [duration, setDuration] = useState(0);
    const [audioURL, setAudioURL] = useState(null);
    const [audioB64, setAudioB64] = useState(null);
    const [error, setError] = useState('');
    const [recordedDuration, setRecordedDuration] = useState(0); // ذخیره مدت واقعی

    const mediaRecorderRef = useRef(null);
    const chunksRef        = useRef([]);
    const timerRef         = useRef(null);
    const startTimeRef     = useRef(null);
    const streamRef        = useRef(null);
    const autoStopRef      = useRef(null);

    useEffect(() => {
        return () => {
            stopTimer();
            stopStream();
            if (autoStopRef.current) clearTimeout(autoStopRef.current);
            if (audioURL) URL.revokeObjectURL(audioURL);
        };
    }, []);

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startRecording = async () => {
        setError('');
        chunksRef.current = [];

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
            setError('دسترسی به میکروفن رد شد');
            return;
        }

        streamRef.current = stream;

        const mimeType =
            MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/ogg';

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const elapsed = Date.now() - startTimeRef.current;
            const elapsedSec = Math.floor(elapsed / 1000);
            stopTimer();
            stopStream();

            if (elapsed < MIN_DURATION) {
                setError('حداقل ۲ ثانیه ضبط کنید');
                setStatus('idle');
                setDuration(0);
                setRecordedDuration(0);
                return;
            }

            const blob = new Blob(chunksRef.current, { type: mimeType });
            const url  = URL.createObjectURL(blob);

            const reader = new FileReader();
            reader.onloadend = () => {
                setAudioB64(reader.result);
            };
            reader.readAsDataURL(blob);

            setAudioURL(url);
            setRecordedDuration(elapsedSec); // ذخیره مدت واقعی
            setStatus('preview');
        };

        recorder.start(100);
        startTimeRef.current = Date.now();
        setStatus('recording');
        setDuration(0);

        timerRef.current = setInterval(() => {
            setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 500);

        autoStopRef.current = setTimeout(() => {
            stopRecording();
        }, MAX_DURATION);
    };

    const stopRecording = () => {
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== 'inactive'
        ) {
            mediaRecorderRef.current.stop();
        }
    };

    const handleSend = () => {
        if (audioB64) {
            onVoiceReady(audioB64, recordedDuration); // پاس دادن مدت واقعی
        }
    };

    const handleDiscard = () => {
        if (audioURL) URL.revokeObjectURL(audioURL);
        setAudioURL(null);
        setAudioB64(null);
        setStatus('idle');
        setDuration(0);
        setRecordedDuration(0);
        setError('');
        if (onCancel) onCancel();
    };

    const formatDur = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (status === 'idle') {
        return (
            <button
                className="voice-record-btn"
                title="ضبط صدا"
                onClick={startRecording}
            >
                🎙️
            </button>
        );
    }

    if (status === 'recording') {
        return (
            <div className="voice-recording-bar">
                <button
                    className="voice-stop-btn"
                    onClick={stopRecording}
                    title="توقف ضبط"
                >
                    ⏹
                </button>
                <span className="voice-rec-dot" />
                <span className="voice-rec-timer">{formatDur(duration)}</span>
                <span className="voice-rec-label">در حال ضبط...</span>

                <button
                    className="voice-cancel-btn"
                    onClick={() => {
                        stopRecording();
                        setTimeout(() => handleDiscard(), 200);
                    }}
                    title="لغو"
                >
                    🗑️
                </button>
                {error && <span className="voice-error">{error}</span>}
            </div>
        );
    }

    if (status === 'preview') {
        return (
            <div className="voice-preview-bar">
                <audio controls src={audioURL} className="voice-preview-audio" />
                <span className="voice-preview-dur">{formatDur(recordedDuration)}</span>
                <button
                    className="voice-send-btn"
                    onClick={handleSend}
                    title="ارسال ویس"
                >
                    ✅ ارسال
                </button>
                <button
                    className="voice-discard-btn"
                    onClick={handleDiscard}
                    title="حذف"
                >
                    🗑️ حذف
                </button>
                {error && <span className="voice-error">{error}</span>}
            </div>
        );
    }

    return null;
}
