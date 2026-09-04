import React from 'react';
import { Phone, PhoneOff, Video, Shield, Lock } from 'lucide-react';
import { CallSignalingData } from '../../types/call';
import { UserProfile } from '../../types/user';
import { webrtcService } from '../../services/webrtc/webrtcService';
import { getInitials } from '../../utils/mediaUtils';

interface IncomingCallModalProps {
  session: CallSignalingData;
  currentUser: UserProfile;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ session, currentUser }) => {
  const isVideo = session.type === 'video';

  const handleAccept = () => {
    webrtcService.acceptIncomingCall(currentUser);
  };

  const handleDecline = () => {
    webrtcService.rejectIncomingCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 text-center overflow-hidden flex flex-col items-center">
        {/* Ambient background glow */}
        <div className="absolute -top-16 inset-x-0 h-32 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none" />

        {/* Security badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-6">
          <Lock className="w-3 h-3" />
          <span>Incoming WebRTC {isVideo ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Caller Avatar with Ring Animation */}
        <div className="relative mb-6">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br ${
              session.callerColor || 'from-emerald-500 to-teal-700'
            } flex items-center justify-center text-3xl font-bold text-white shadow-xl`}
          >
            {getInitials(session.callerName)}
          </div>
          <span className="absolute -inset-2 rounded-full border-2 border-emerald-500/50 animate-ping" />
          <span className="absolute -inset-4 rounded-full border border-emerald-500/30 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          {session.callerName}
        </h3>
        <p className="text-xs text-neutral-400 mb-8">
          is requesting a real-time {isVideo ? 'video' : 'voice'} connection...
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Decline */}
          <button
            onClick={handleDecline}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 animate-pulse"
          >
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
