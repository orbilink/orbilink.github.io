import React from 'react';
import { Reply, Copy, Edit2, CornerUpRight, Trash2, CheckSquare, Star, Smile } from 'lucide-react';
import { Message } from '../../types/chat';

interface MessageActionsMenuProps {
  message: Message;
  isSender: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onEdit?: () => void;
  onForward: () => void;
  onSelect: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onClose: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '⚡', '😂', '😮', '🙏'];

export const MessageActionsMenu: React.FC<MessageActionsMenuProps> = ({
  message,
  isSender,
  onReply,
  onReact,
  onCopy,
  onEdit,
  onForward,
  onSelect,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}) => {
  return (
    <div
      className="absolute z-40 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl p-2 backdrop-blur-xl min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      id="message-context-menu"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick Reactions Bar */}
      <div className="flex items-center justify-between gap-1 p-1 bg-neutral-950/60 rounded-xl mb-1.5 border border-neutral-800/60">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onReact(emoji);
              onClose();
            }}
            className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-neutral-800 active:scale-125 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Action Items List */}
      <div className="flex flex-col gap-0.5 text-xs text-neutral-200">
        <button
          onClick={() => {
            onReply();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
        >
          <Reply className="w-4 h-4 text-neutral-400" />
          <span>Reply</span>
        </button>

        <button
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
        >
          <Copy className="w-4 h-4 text-neutral-400" />
          <span>Copy Text</span>
        </button>

        {isSender && onEdit && message.type === 'text' && !message.isDeleted && (
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
          >
            <Edit2 className="w-4 h-4 text-neutral-400" />
            <span>Edit Message</span>
          </button>
        )}

        <button
          onClick={() => {
            onForward();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
        >
          <CornerUpRight className="w-4 h-4 text-neutral-400" />
          <span>Forward</span>
        </button>

        <button
          onClick={() => {
            onSelect();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
        >
          <CheckSquare className="w-4 h-4 text-neutral-400" />
          <span>Select</span>
        </button>

        <div className="h-px bg-neutral-800 my-1" />

        <button
          onClick={() => {
            onDeleteForMe();
            onClose();
          }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-left"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Delete for me</span>
        </button>

        {isSender && onDeleteForEveryone && !message.isDeleted && (
          <button
            onClick={() => {
              onDeleteForEveryone();
              onClose();
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete for everyone</span>
          </button>
        )}
      </div>
    </div>
  );
};
