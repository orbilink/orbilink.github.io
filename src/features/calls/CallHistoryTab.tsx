import React, { useState } from 'react';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Trash2,
  Clock,
  Search,
  Shield,
} from 'lucide-react';
import { CallHistoryItem, CallType } from '../../types/call';
import { UserProfile } from '../../types/user';
import { getInitials } from '../../utils/mediaUtils';
import { formatCallTime } from '../../utils/formatters';
import { webrtcService } from '../../services/webrtc/webrtcService';

interface CallHistoryTabProps {
  history: CallHistoryItem[];
  currentUser: UserProfile;
  onStartCall: (
    peer: { id: string; displayName: string; username: string; avatarUrl?: string; avatarColor?: string },
    type: CallType
  ) => void;
  onClearHistory: () => void;
}

export const CallHistoryTab: React.FC<CallHistoryTabProps> = ({
  history,
  currentUser,
  onStartCall,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter((item) => {
    const matchesFilter = filter === 'all' || item.status === 'missed' || item.status === 'rejected';
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.peerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.peerUsername && item.peerUsername.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = (item: CallHistoryItem) => {
    if (item.status === 'missed') {
      return <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />;
    }
    if (item.status === 'rejected' || item.status === 'cancelled') {
      return <PhoneOff className="w-3.5 h-3.5 text-amber-400" />;
    }
    if (item.direction === 'outgoing') {
      return <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />;
    }
    return <PhoneIncoming className="w-3.5 h-3.5 text-teal-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950/60" id="rynox-call-history">
      {/* Header Bar */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-neutral-100">Call History</h2>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-300 hover:bg-neutral-900 transition-colors text-xs flex items-center gap-1"
              title="Clear call logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recent calls..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60'
            }`}
          >
            All Calls ({history.length})
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === 'missed'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60'
            }`}
          >
            Missed ({history.filter((h) => h.status === 'missed' || h.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredHistory.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <Phone className="w-10 h-10 mb-3 text-neutral-600" />
            <h4 className="text-sm font-semibold text-neutral-300 mb-1">No call logs</h4>
            <p className="text-xs max-w-xs">
              {filter === 'missed'
                ? 'You have no missed calls'
                : 'Start a high-definition encrypted voice or video call with any contact.'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800/60 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${
                    item.peerColor || 'from-emerald-500 to-teal-700'
                  } flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0`}
                >
                  {getInitials(item.peerName)}
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-xs sm:text-sm font-bold truncate ${
                      item.status === 'missed' ? 'text-rose-400' : 'text-neutral-200'
                    }`}
                  >
                    {item.peerName}
                  </h4>

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                    {getStatusIcon(item)}
                    <span className="capitalize">
                      {item.status === 'missed'
                        ? 'Missed'
                        : item.status === 'rejected'
                        ? 'Declined'
                        : item.status === 'cancelled'
                        ? 'Cancelled'
                        : formatDuration(item.duration)}
                    </span>
                    <span>•</span>
                    <span>{formatCallTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>

              {/* Call Back Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    onStartCall(
                      {
                        id: item.peerId,
                        displayName: item.peerName,
                        username: item.peerUsername || item.peerName,
                        avatarUrl: item.peerAvatar,
                        avatarColor: item.peerColor,
                      },
                      'voice'
                    )
                  }
                  className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    onStartCall(
                      {
                        id: item.peerId,
                        displayName: item.peerName,
                        username: item.peerUsername || item.peerName,
                        avatarUrl: item.peerAvatar,
                        avatarColor: item.peerColor,
                      },
                      'video'
                    )
                  }
                  className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-teal-300 hover:bg-teal-500/10 transition-colors"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
