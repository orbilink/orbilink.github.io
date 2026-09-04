import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onSendVoice: (durationSec: number, waveform: number[], audioBlob?: Blob) => void;
  onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTracks();
    };
  }, []);

  const stopTracks = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const startRecording = async () => {
    try {
      setPermissionError(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorder.start(250);

      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
        setWaveform((prev) => {
          const nextVal = Math.floor(Math.random() * 80) + 20;
          const updated = [...prev, nextVal];
          return updated.slice(-24);
        });
      }, 1000);
    } catch (err: any) {
      setPermissionError(err instanceof Error ? err.message : 'Microphone permission denied.');
    }
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopTracks();
    const finalDuration = Math.max(1, seconds);
    const finalWaveform = waveform.length > 0 ? waveform : [30, 45, 70, 40, 85, 60, 30, 50];
    const blob = audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : undefined;
    onSendVoice(finalDuration, finalWaveform, blob);
  };

  const handleCancel = () => {
    stopTracks();
    onCancel();
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center justify-between w-full bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-red-200 text-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{permissionError}</span>
        </div>
        <button
          onClick={handleCancel}
          className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 rounded-lg text-red-100 font-medium"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full bg-zinc-900/90 border border-[#25D366]/40 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/40 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-2 text-rose-400 font-mono text-sm font-semibold shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
        <span>{formatSecs(seconds)}</span>
      </div>

      {/* Live Waveform Bars */}
      <div className="flex-1 flex items-center justify-center gap-1 h-8 px-2 overflow-hidden">
        {waveform.map((height, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-[#128C7E] to-[#25D366] rounded-full transition-all duration-200"
            style={{ height: `${Math.max(15, (height / 100) * 32)}px` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl transition-colors"
          title="Delete voice note"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleSend}
          className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-black rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#25D366]/20"
        >
          <Send className="w-3.5 h-3.5 text-black" />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};
