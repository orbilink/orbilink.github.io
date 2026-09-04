import React, { useState } from 'react';
import { X, Search, Check, Send, Users } from 'lucide-react';
import { Chat } from '../../types/chat';
import { getInitials } from '../../utils/mediaUtils';

interface ForwardModalProps {
  isOpen: boolean;
  chats: Chat[];
  onForwardToChats: (targetChatIds: string[]) => void;
  onClose: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  chats,
  onForwardToChats,
  onClose,
}) => {
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleForward = () => {
    if (selectedChatIds.length === 0) return;
    onForwardToChats(selectedChatIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-base font-semibold text-neutral-100">Forward Message</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-neutral-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search chats to forward..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((c) => {
            const isSelected = selectedChatIds.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleSelect(c.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                      c.avatarColor || 'from-emerald-500 to-teal-700'
                    } flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0`}
                  >
                    {c.type === 'group' ? <Users className="w-5 h-5" /> : getInitials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-neutral-200 block truncate">
                      {c.name}
                    </span>
                    <span className="text-xs text-neutral-400 capitalize">{c.type} chat</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                      : 'border-neutral-700 bg-neutral-950'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <span className="text-xs text-neutral-400">
            {selectedChatIds.length} chat{selectedChatIds.length !== 1 ? 's' : ''} selected
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedChatIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-950/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
