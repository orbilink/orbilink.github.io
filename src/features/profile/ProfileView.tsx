import React, { useState } from 'react';
import { User as UserIcon, Mail, Shield, Check, Camera, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface ProfileViewProps {
  currentUser: User;
  onUpdateUser: (updated: Partial<User>) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser
}) => {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [status, setStatus] = useState(currentUser.status || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name, username, status, bio });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-xl font-bold text-white">Profile & Account Settings</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your personal identity, bio, and cryptographic security credentials
          </p>
        </div>

        {/* User Card */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/5 space-y-6 shadow-xl">
          {/* Avatar row */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10"
              />
              <button
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
                title="Update avatar"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                {name}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Verified
                </span>
              </h2>
              <p className="text-xs text-zinc-400">@{username}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <Mail className="w-3 h-3" />
                {currentUser.email}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Username Handle
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Status Message
              </label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="What are you currently focusing on?"
                className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Bio & Background
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>End-to-End Encryption Enabled</span>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
