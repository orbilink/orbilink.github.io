import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Lock,
  Sparkles,
  Shield,
} from 'lucide-react';
import { CallSignalingData } from '../../types/call';
import { webrtcService } from '../../services/webrtc/webrtcService';
import { getInitials } from '../../utils/mediaUtils';

interface ActiveCallModalProps {
  session: CallSignalingData;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  durationSeconds: number;
  onEndCall: () => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  session,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  durationSeconds,
  onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isCameraOff]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, session.state]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideoCall = session.type === 'video';
  const isConnected = session.state === 'connected';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all ${
        isFullscreen ? 'p-0' : 'p-3 sm:p-6'
      }`}
    >
      <div
        className={`relative w-full ${
          isFullscreen
            ? 'h-full rounded-none'
            : 'max-w-4xl h-[90vh] max-h-[750px] rounded-3xl'
        } bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                session.receiverColor || 'from-emerald-500 to-teal-700'
              } flex items-center justify-center text-xs font-bold text-white shadow-md`}
            >
              {getInitials(session.receiverName)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">
                  {session.receiverName}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                  <Lock className="w-2.5 h-2.5" />
                  <span>WebRTC P2P</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-300">
                {isConnected ? (
                  <span className="font-mono text-emerald-400 font-semibold tracking-wider">
                    {formatDuration(durationSeconds)}
                  </span>
                ) : (
                  <span className="capitalize text-emerald-300 animate-pulse">
                    {session.state === 'calling'
                      ? 'Calling...'
                      : session.state === 'ringing'
                      ? 'Ringing...'
                      : session.state === 'connecting'
                      ? 'Connecting secure media...'
                      : session.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-neutral-900/60 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Video / Voice Canvas Center */}
        <div className="flex-1 relative flex items-center justify-center bg-neutral-950 overflow-hidden">
          {isVideoCall ? (
            <>
              {/* Remote Video (Main Stage) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={isSpeakerMuted}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isConnected ? 'opacity-100' : 'opacity-30'
                }`}
              />

              {/* Connecting Overlay for Video */}
              {!isConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-2xl ring-4 ring-emerald-500/30">
                      {getInitials(session.receiverName)}
                    </div>
                    <span className="absolute -inset-2 rounded-3xl border-2 border-emerald-500/40 animate-ping" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {session.receiverName}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-xs">
                    {session.state === 'calling'
                      ? 'Calling...'
                      : session.state === 'ringing'
                      ? 'Device ringing...'
                      : 'Connecting WebRTC audio & video...'}
                  </p>
                </div>
              )}

              {/* Local PIP Video Preview */}
              <div className="absolute bottom-24 right-4 sm:right-6 z-20 group">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-neutral-900 shadow-2xl w-28 h-40 sm:w-36 sm:h-48 transition-all">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform -scale-x-100 ${
                      isCameraOff ? 'hidden' : 'block'
                    }`}
                  />
                  {isCameraOff && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-neutral-400 bg-neutral-900">
                      <VideoOff className="w-6 h-6 mb-1 text-neutral-500" />
                      <span className="text-[10px]">Camera Off</span>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-medium">
                    You
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Voice Call View */
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-8">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shadow-2xl ring-8 ring-emerald-500/20">
                  {getInitials(session.receiverName)}
                </div>

                {/* Animated Pulsing Waves when connected */}
                {isConnected && (
                  <>
                    <span className="absolute -inset-3 rounded-full border border-emerald-500/40 animate-ping opacity-60" />
                    <span className="absolute -inset-6 rounded-full border border-emerald-500/20 animate-pulse" />
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {session.receiverName}
              </h2>

              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium text-emerald-400">
                  {isConnected ? (
                    <span className="font-mono">{formatDuration(durationSeconds)}</span>
                  ) : (
                    <span className="capitalize">{session.state}...</span>
                  )}
                </span>
              </div>

              {/* Hidden audio element to playback remote sound */}
              <audio
                ref={(el) => {
                  if (el && remoteStream) {
                    el.srcObject = remoteStream;
                  }
                }}
                autoPlay
                muted={isSpeakerMuted}
              />
            </div>
          )}
        </div>

        {/* Bottom Control Actions Bar */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-neutral-950 to-neutral-950/80 border-t border-neutral-800/80 z-20">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {/* Microphone Toggle */}
            <button
              onClick={() => webrtcService.toggleMute()}
              className={`p-3.5 sm:p-4 rounded-2xl transition-all shadow-lg flex items-center justify-center ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* Video Camera Toggle (for video calls) */}
            {isVideoCall && (
              <button
                onClick={() => webrtcService.toggleCamera()}
                className={`p-3.5 sm:p-4 rounded-2xl transition-all shadow-lg flex items-center justify-center ${
                  isCameraOff
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
                }`}
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? (
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Video className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </button>
            )}

            {/* Speaker Mute Toggle */}
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`p-3.5 sm:p-4 rounded-2xl transition-all shadow-lg flex items-center justify-center ${
                isSpeakerMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
              }`}
              title={isSpeakerMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isSpeakerMuted ? (
                <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="p-3.5 sm:p-4 px-6 sm:px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
