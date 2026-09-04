import React from 'react';
import { X, Users, Shield, Sparkles, LogOut, Bell, FileText } from 'lucide-react';
import { ChatGroup, User } from '../../types';

interface GroupInfoModalProps {
  isOpen: boolean;
  chat: ChatGroup;
  onClose: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  chat,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-sm font-bold text-white">Channel Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Hero */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
          <img
            src={chat.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={chat.name}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-2xl object-cover border border-white/10"
          />
          <div>
            <h2 className="text-base font-bold text-white">{chat.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{chat.description || 'Secure communication channel'}</p>
          </div>
        </div>

        {/* Participants list */}
        <div>
          <h4 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Participants ({chat.participants?.length || 1})</span>
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {(chat.participants || []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/40 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-zinc-200">{p.name}</p>
                    <p className="text-[10px] text-zinc-500">@{p.username}</p>
                  </div>
                </div>
                {p.id === 'usr_ai' && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    AI Assistant
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings options */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-white/5 text-xs text-zinc-300">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Channel Encryption</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">Active</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-white/5 text-xs text-zinc-300">
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Notifications</span>
            </span>
            <span className="text-[11px] text-indigo-300 font-semibold">Enabled</span>
          </div>
        </div>

      </div>
    </div>
  );
};
