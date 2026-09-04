import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { geminiLiveVoiceService } from '../../services/gemini/geminiLiveVoiceService';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareTranscriptToChat?: (transcript: string) => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [voiceState, setVoiceState] = useState({
    isRecording: false,
    isSpeaking: false,
    transcript: '',
    aiResponse: '',
    rmsLevel: 0
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubState = geminiLiveVoiceService.subscribe((state) => {
      setVoiceState(state);
    });

    const unsubErr = geminiLiveVoiceService.subscribeError((err) => {
      setErrorMessage(err);
    });

    geminiLiveVoiceService.startSession().catch((e) => {
      setErrorMessage(e instanceof Error ? e.message : 'Could not initialize microphone stream.');
    });

    return () => {
      unsubState();
      unsubErr();
      geminiLiveVoiceService.stopSession();
    };
  }, [isOpen]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    geminiLiveVoiceService.setMute(next);
  };

  const handleEndCall = () => {
    geminiLiveVoiceService.stopSession();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-indigo-950/40">
        
        {/* Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemini Live Voice • Real-Time Audio</span>
        </div>

        {/* Central Audio Visualizer Orb */}
        <div className="relative flex items-center justify-center my-6">
          {/* Animated Glow Rings */}
          <div
            className="absolute w-44 h-44 rounded-full bg-indigo-500/20 blur-xl transition-all duration-300"
            style={{
              transform: `scale(${1 + voiceState.rmsLevel * 0.8})`,
              opacity: voiceState.isSpeaking || voiceState.rmsLevel > 0.1 ? 0.8 : 0.3
            }}
          />
          <div
            className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform duration-150"
            style={{
              transform: `scale(${1 + voiceState.rmsLevel * 0.25})`
            }}
          >
            {voiceState.isSpeaking ? (
              <Volume2 className="w-12 h-12 text-white animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-12 h-12 text-zinc-300" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </div>
        </div>

        {/* Status Text */}
        <h3 className="text-lg font-bold text-white mb-1">
          {voiceState.isSpeaking
            ? 'RYNOX is speaking...'
            : isMuted
            ? 'Microphone muted'
            : 'Listening...'}
        </h3>
        <p className="text-xs text-zinc-400 min-h-[40px] px-4 leading-relaxed">
          {voiceState.transcript || 'Speak naturally to converse in real-time'}
        </p>

        {/* AI response caption box */}
        {voiceState.aiResponse && (
          <div className="mt-4 p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 text-left max-h-24 overflow-y-auto">
            <span className="font-semibold text-indigo-400 block mb-0.5">Response:</span>
            {voiceState.aiResponse}
          </div>
        )}

        {/* Error notice banner */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-200 text-left">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-5 mt-8">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
