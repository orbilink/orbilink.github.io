import React, { useState } from 'react';
import { X, Search, Calendar } from 'lucide-react';
import { Message } from '../../types/chat';
import { formatMessageTime } from '../../utils/formatters';

interface SearchInChatModalProps {
  isOpen: boolean;
  messages: Message[];
  onSelectMessage: (messageId: string) => void;
  onClose: () => void;
}

export const SearchInChatModal: React.FC<SearchInChatModalProps> = ({
  isOpen,
  messages,
  onSelectMessage,
  onClose,
}) => {
  const [query, setQuery] = useState<string>('');

  if (!isOpen) return null;

  const results = query.trim()
    ? messages.filter(
        (m) =>
          m.text &&
          m.type !== 'system' &&
          m.text.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Header Search Input */}
        <div className="p-3.5 border-b border-neutral-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            placeholder="Search messages in this conversation..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              Type keywords to search past messages in this conversation.
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No messages found matching "{query}"
            </div>
          ) : (
            results.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  onSelectMessage(m.id);
                  onClose();
                }}
                className="p-3 rounded-xl hover:bg-neutral-800/80 cursor-pointer border border-transparent hover:border-neutral-700/50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-emerald-400">{m.senderName}</span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {formatMessageTime(m.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-neutral-200 line-clamp-2 leading-relaxed">{m.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
