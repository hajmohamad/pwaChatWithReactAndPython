// src/components/VoiceMessage.jsx
import React, { useRef, useState, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

export default function VoiceMessage({ audioB64, duration }) {
    const { performanceMode } = useChatContext();
    const audioRef    = useRef(null);
    const [playing, setPlaying]       = useState(false);
    const [current, setCurrent]       = useState(0);
    const [total, setTotal]           = useState(0);
    const [speed, setSpeed]           = useState(1);

    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;

        const onLoaded = () => {
            const dur = el.duration;
            // اگه duration معتبر نبود از prop استفاده کن
            if (dur && !isNaN(dur) && isFinite(dur)) {
                setTotal(dur);
            } else if (duration && !isNaN(duration) && isFinite(duration)) {
                setTotal(duration);
            } else {
                setTotal(0);
            }
        };

        const onTime = () => {
            const ct = el.currentTime;
            if (!isNaN(ct) && isFinite(ct)) {
                setCurrent(ct);
            }
        };

        const onEnded = () => {
            setPlaying(false);
            setCurrent(0);
        };

        el.addEventListener('loadedmetadata', onLoaded);
        el.addEventListener('timeupdate',     onTime);
        el.addEventListener('ended',          onEnded);

        return () => {
            el.removeEventListener('loadedmetadata', onLoaded);
            el.removeEventListener('timeupdate',     onTime);
            el.removeEventListener('ended',          onEnded);
        };
    }, [audioB64, duration]);

    const togglePlay = () => {
        const el = audioRef.current;
        if (!el) return;
        if (playing) {
            el.pause();
            setPlaying(false);
        } else {
            el.play();
            setPlaying(true);
        }
    };

    const handleSeek = (e) => {
        const el = audioRef.current;
        if (!el || !total || total <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        el.currentTime = ratio * total;
    };

    const cycleSpeed = () => {
        const el = audioRef.current;
        if (!el) return;
        const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        el.playbackRate = next;
        setSpeed(next);
    };

    const formatDur = (sec) => {
        if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const progress = (total > 0 && !isNaN(total) && isFinite(total))
        ? (current / total) * 100
        : 0;

    const barCount = performanceMode ? 12 : 30;
    const bars = Array.from({ length: barCount }, (_, i) => {
        const h = 30 + Math.sin(i * 0.8) * 15 + Math.cos(i * 1.3) * 10;
        const filled = (i / barCount) * 100 <= progress;
        return { h, filled };
    });

    return (
        <div className="voice-message">
            <audio ref={audioRef} src={audioB64} preload="metadata" />

            <button className="voice-play-btn" onClick={togglePlay}>
                {playing ? '⏸' : '▶'}
            </button>

            <div className="voice-waveform" onClick={handleSeek}>
                {bars.map((b, i) => (
                    <span
                        key={i}
                        className={'voice-bar' + (b.filled ? ' filled' : '')}
                        style={{ height: b.h + '%' }}
                    />
                ))}
            </div>

            <span className="voice-time">
                {playing || current > 0 ? formatDur(current) : formatDur(total)}
            </span>

            <button className="voice-speed-btn" onClick={cycleSpeed}>
                {speed}×
            </button>
        </div>
    );
}
