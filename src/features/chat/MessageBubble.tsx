import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  ChevronDown,
  FileText,
  Download,
  Film,
  CornerUpRight,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Message, Attachment } from '../../types/chat';
import { UserProfile } from '../../types/user';
import { formatMessageTime, formatFileSize } from '../../utils/formatters';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { MessageActionsMenu } from './MessageActionsMenu';

interface MessageBubbleProps {
  message: Message;
  currentUser: UserProfile;
  isGroupChat?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (messageId: string) => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onCopy: (text: string) => void;
  onEdit?: (message: Message) => void;
  onForward: (message: Message) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  onOpenMedia: (attachment: Attachment, caption?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUser,
  isGroupChat = false,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onReply,
  onReact,
  onCopy,
  onEdit,
  onForward,
  onDeleteForMe,
  onDeleteForEveryone,
  onOpenMedia,
}) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const isSender = message.senderId === currentUser.id;

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="px-3.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-[11px] font-medium text-neutral-400 flex items-center gap-1.5 shadow-xs">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  const renderStatus = () => {
    if (!isSender) return null;
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3.5 h-3.5 text-neutral-400 animate-spin" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-neutral-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Check className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const handleDownloadFile = (e: React.MouseEvent, attachment: Attachment) => {
    e.stopPropagation();
    if (!attachment.url) return;
    const a = document.createElement('a');
    a.href = attachment.url;
    a.download = attachment.name || 'file';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`group relative flex items-end gap-2 my-1 px-2 transition-colors ${
        isSelected ? 'bg-emerald-500/10 -mx-2 px-4 py-1 rounded-lg' : ''
      } ${isSender ? 'justify-end' : 'justify-start'}`}
      id={`msg-bubble-${message.id}`}
    >
      {/* Multi-select checkbox */}
      {isSelectMode && (
        <div className="flex items-center pb-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(message.id)}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/30"
          />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[62%] rounded-2xl p-2.5 sm:p-3 shadow-md transition-shadow ${
          isSender
            ? 'bg-gradient-to-br from-emerald-950/90 to-teal-950/80 border border-emerald-500/30 text-neutral-100 rounded-br-xs'
            : 'bg-neutral-900/90 border border-neutral-800 text-neutral-100 rounded-bl-xs'
        }`}
      >
        {/* Group Sender Name Header */}
        {isGroupChat && !isSender && (
          <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
            <span>{message.senderName}</span>
          </div>
        )}

        {/* Forwarded Header */}
        {message.isForwarded && (
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 italic mb-1">
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Reply Context Bar */}
        {message.replyTo && (
          <div
            className={`mb-2 p-2 rounded-xl border-l-3 text-xs overflow-hidden ${
              isSender
                ? 'bg-emerald-900/40 border-emerald-400 text-emerald-100'
                : 'bg-neutral-950/60 border-emerald-500 text-neutral-300'
            }`}
          >
            <span className="font-semibold block text-[11px] text-emerald-300">
              {message.replyTo.senderName}
            </span>
            <span className="truncate block opacity-85 text-[11px]">{message.replyTo.text}</span>
          </div>
        )}

        {/* Image Attachment */}
        {message.type === 'image' && message.attachments?.[0] && (
          <div
            onClick={() => onOpenMedia(message.attachments![0], message.text)}
            className="rounded-xl overflow-hidden mb-2 cursor-pointer relative group/img min-h-[140px] max-h-72 bg-neutral-950 flex items-center justify-center border border-neutral-800/80"
          >
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-[11px]">Loading image...</span>
              </div>
            )}

            {imageError ? (
              <div className="p-4 flex flex-col items-center justify-center text-center text-rose-400 gap-1.5">
                <AlertCircle className="w-5 h-5" />
                <span className="text-xs">Failed to load image</span>
              </div>
            ) : (
              <img
                src={message.attachments[0].url}
                alt={message.attachments[0].name}
                referrerPolicy="no-referrer"
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
                className={`w-full h-full max-h-72 object-cover group-hover/img:scale-102 transition-transform duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur-xs">
                  Click to view
                </span>
              </div>
            )}
          </div>
        )}

        {/* Video Attachment */}
        {message.type === 'video' && message.attachments?.[0] && (
          <div
            onClick={() => onOpenMedia(message.attachments![0], message.text)}
            className="rounded-xl overflow-hidden mb-2 cursor-pointer relative group/vid max-h-72 bg-neutral-950 border border-neutral-800/80"
          >
            <video
              src={message.attachments[0].url}
              className="w-full max-h-72 object-cover bg-black"
              preload="metadata"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/90 text-neutral-950 flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                <Film className="w-6 h-6 ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Audio / Voice Attachment */}
        {message.type === 'audio' && message.attachments?.[0] && (
          <div className="mb-1">
            <AudioWaveformPlayer
              audioUrl={message.attachments[0].url}
              duration={message.attachments[0].duration}
              waveform={message.attachments[0].waveform}
              isSender={isSender}
            />
          </div>
        )}

        {/* Document Attachment */}
        {message.type === 'document' && message.attachments?.[0] && (
          <div
            onClick={() => onOpenMedia(message.attachments![0])}
            className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer border transition-colors ${
              isSender
                ? 'bg-emerald-900/30 border-emerald-500/30 hover:bg-emerald-900/50'
                : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800/60'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold block truncate text-neutral-100">
                {message.attachments[0].name}
              </span>
              <span className="text-[10px] text-neutral-400">
                {formatFileSize(message.attachments[0].size)}
              </span>
            </div>
            <button
              onClick={(e) => handleDownloadFile(e, message.attachments![0])}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Message Text */}
        {message.decryptionError ? (
          <div className="flex items-center gap-1.5 p-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs my-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{message.decryptionError}</span>
          </div>
        ) : (
          message.text && message.type !== 'audio' && (
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                message.isDeleted ? 'italic text-neutral-400 text-xs' : ''
              }`}
            >
              {message.text}
            </p>
          )
        )}

        {/* Footer info: time, edited badge & checkmarks */}
        <div className="flex items-center justify-end gap-1.5 mt-1 select-none">
          {message.editedAt && (
            <span className="text-[9px] text-neutral-400 italic">edited</span>
          )}
          <span className="text-[10px] font-mono text-neutral-400">
            {formatMessageTime(message.timestamp)}
          </span>
          {renderStatus()}
        </div>

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-3 ${
              isSender ? 'right-2' : 'left-2'
            } flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-full px-2 py-0.5 shadow-md text-xs cursor-pointer hover:bg-neutral-800 transition-colors z-10`}
          >
            {Array.from(new Set(message.reactions.map((r) => r.emoji))).map((emoji) => {
              const count = message.reactions!.filter((r) => r.emoji === emoji).length;
              return (
                <span
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="flex items-center gap-0.5"
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] text-neutral-400">{count}</span>}
                </span>
              );
            })}
          </div>
        )}

        {/* Hover Context Trigger Button */}
        {!isSelectMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="absolute top-1 right-1 p-1 rounded-lg bg-neutral-900/80 border border-neutral-700/40 text-neutral-400 hover:text-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs z-20"
            title="Message options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Context Menu Popup */}
        {showMenu && (
          <MessageActionsMenu
            message={message}
            isSender={isSender}
            onReply={() => onReply(message)}
            onReact={(emoji) => onReact(message.id, emoji)}
            onCopy={() => onCopy(message.text)}
            onEdit={onEdit ? () => onEdit(message) : undefined}
            onForward={() => onForward(message)}
            onSelect={() => onToggleSelect?.(message.id)}
            onDeleteForMe={() => onDeleteForMe(message.id)}
            onDeleteForEveryone={onDeleteForEveryone ? () => onDeleteForEveryone(message.id) : undefined}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  );
};
