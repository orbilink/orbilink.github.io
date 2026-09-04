import React, { useState } from 'react';
import { Play, Pause, Sparkles, Check, CheckCheck, Smile, CornerUpLeft } from 'lucide-react';
import { Message } from '../../types';
import { formatTimestamp } from '../../lib/utils';

interface MessageItemProps {
  message: Message;
  isMe: boolean;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMe,
  onReply,
  onReact
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const emojis = ['👍', '❤️', '🔥', '👏', '😂', '🎉'];

  const toggleVoicePlayback = () => {
    setIsPlayingVoice(!isPlayingVoice);
    if (!isPlayingVoice) {
      setTimeout(() => {
        setIsPlayingVoice(false);
      }, (message.voiceDuration || 3) * 1000);
    }
  };

  return (
    <div
      className={`group relative flex flex-col mb-4 ${
        isMe ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender Header */}
      {!isMe && (
        <div className="flex items-center gap-2 mb-1 pl-1">
          {message.senderAvatar && (
            <img
              src={message.senderAvatar}
              alt={message.senderName}
              referrerPolicy="no-referrer"
              className="w-5 h-5 rounded-full object-cover border border-white/10"
            />
          )}
          <span className="text-xs font-semibold text-zinc-300">
            {message.senderName}
          </span>
          {message.isAiGenerated && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-2.5 h-2.5" /> AI
            </span>
          )}
        </div>
      )}

      {/* Message Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Quoted Reply context */}
        {message.replyTo && (
          <div
            className={`text-xs px-3 py-1.5 mb-1 rounded-lg border-l-2 ${
              isMe
                ? 'bg-emerald-950/50 border-emerald-400 text-emerald-200'
                : 'bg-zinc-800/80 border-zinc-500 text-zinc-300'
            }`}
          >
            <p className="font-semibold text-[11px] opacity-80">{message.replyTo.senderName}</p>
            <p className="truncate line-clamp-1">{message.replyTo.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-md ${
            isMe
              ? 'bg-[#005C4B] text-white rounded-tr-sm shadow-black/20'
              : message.isAiGenerated
              ? 'bg-gradient-to-b from-zinc-900 to-zinc-900/90 border border-emerald-500/30 text-zinc-100 rounded-tl-sm'
              : 'bg-[#202C33] border border-white/5 text-zinc-100 rounded-tl-sm'
          }`}
        >
          {/* Voice Type */}
          {message.type === 'voice' ? (
            <div className="flex items-center gap-3 min-w-[200px]">
              <button
                onClick={toggleVoicePlayback}
                className={`p-2.5 rounded-full flex items-center justify-center transition-colors ${
                  isMe
                    ? 'bg-white text-emerald-800 hover:bg-zinc-100'
                    : 'bg-[#25D366] text-black hover:bg-[#1ebd5d]'
                }`}
              >
                {isPlayingVoice ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-0.5 h-6">
                  {(message.voiceWaveform || [30, 45, 60, 40, 70, 50, 80, 35, 60, 90, 40]).map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isPlayingVoice ? 'bg-emerald-300 animate-pulse' : isMe ? 'bg-white/60' : 'bg-emerald-400/60'
                      }`}
                      style={{ height: `${Math.max(6, (h / 100) * 22)}px` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] opacity-75 mt-0.5 font-mono">
                  <span>Voice message</span>
                  <span>{message.voiceDuration || 3}s</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2.5 grid grid-cols-1 gap-1.5">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-black/20 border border-white/10 text-xs"
                >
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                    📎
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{att.name}</p>
                    <p className="text-[10px] opacity-70">Google Drive attachment</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer: Timestamp & status */}
          <div
            className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
              isMe ? 'text-emerald-200' : 'text-zinc-400'
            }`}
          >
            <span>{formatTimestamp(message.timestamp)}</span>
            {isMe && (
              <span>
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((r, i) => (
              <button
                key={i}
                onClick={() => onReact(message.id, r.emoji)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500 transition-colors"
              >
                <span>{r.emoji}</span>
                <span className="font-semibold text-[10px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover Action Bar */}
        <div
          className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-full px-2 py-1 shadow-lg z-10 ${
            isMe ? 'right-full mr-2' : 'left-full ml-2'
          }`}
        >
          <button
            onClick={() => onReply(message)}
            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
            title="Reply"
          >
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowReactionsMenu(!showReactionsMenu)}
            className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Popover Emoji Picker */}
        {showReactionsMenu && (
          <div
            className={`absolute z-20 top-0 -translate-y-full mb-1 flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl ${
              isMe ? 'right-0' : 'left-0'
            }`}
          >
            {emojis.map((em) => (
              <button
                key={em}
                onClick={() => {
                  onReact(message.id, em);
                  setShowReactionsMenu(false);
                }}
                className="p-1.5 hover:bg-zinc-800 rounded-xl text-base transition-transform hover:scale-125"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
