import React, { useState } from 'react';
import {
  Pin,
  VolumeX,
  Archive,
  Check,
  CheckCheck,
  Users,
  MoreVertical,
  Trash2,
  Mail,
  MailOpen,
  Camera,
  Film,
  Mic,
  FileText,
} from 'lucide-react';
import { Chat } from '../../types/chat';
import { UserProfile } from '../../types/user';
import { formatChatListTime } from '../../utils/formatters';
import { getInitials } from '../../utils/mediaUtils';

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  currentUser: UserProfile;
  onClick: () => void;
  onPinToggle: (chatId: string) => void;
  onMuteToggle: (chatId: string) => void;
  onArchiveToggle: (chatId: string) => void;
  onMarkReadToggle: (chatId: string, currentUnread: number) => void;
  onDeleteChat: (chatId: string) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  isActive,
  currentUser,
  onClick,
  onPinToggle,
  onMuteToggle,
  onArchiveToggle,
  onMarkReadToggle,
  onDeleteChat,
}) => {
  const [showContextMenu, setShowContextMenu] = useState<boolean>(false);

  // Check peer online status
  const profiles = chat.participantProfiles ? (Object.values(chat.participantProfiles) as Array<Partial<UserProfile>>) : [];
  const peerProfile = chat.type === 'direct'
    ? profiles.find((p) => p?.username !== currentUser.username)
    : undefined;
  const isPeerOnline = peerProfile?.isOnline ?? false;

  const isLastMessageMine = chat.lastMessage?.senderId === currentUser.id;

  const renderLastMessageSnippet = () => {
    if (chat.typingUsers && chat.typingUsers.length > 0) {
      return (
        <span className="text-emerald-400 font-medium text-xs flex items-center gap-1 animate-pulse">
          <span>typing...</span>
        </span>
      );
    }

    if (!chat.lastMessage) {
      return <span className="text-neutral-500 italic text-xs">No messages yet</span>;
    }

    let icon = null;
    if (chat.lastMessage.type === 'image') icon = <Camera className="w-3.5 h-3.5 inline mr-1 text-neutral-400" />;
    if (chat.lastMessage.type === 'video') icon = <Film className="w-3.5 h-3.5 inline mr-1 text-neutral-400" />;
    if (chat.lastMessage.type === 'audio') icon = <Mic className="w-3.5 h-3.5 inline mr-1 text-neutral-400" />;
    if (chat.lastMessage.type === 'document') icon = <FileText className="w-3.5 h-3.5 inline mr-1 text-neutral-400" />;

    return (
      <span className="truncate flex items-center text-xs text-neutral-400">
        {isLastMessageMine && (
          <span className="mr-1">
            {chat.lastMessage.status === 'read' ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
            ) : (
              <Check className="w-3.5 h-3.5 text-neutral-400 inline" />
            )}
          </span>
        )}
        {icon}
        <span className="truncate">{chat.lastMessage.text}</span>
      </span>
    );
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(!showContextMenu);
  };

  return (
    <div
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
        isActive
          ? 'bg-neutral-800/90 border border-neutral-700/80 shadow-md'
          : 'hover:bg-neutral-900/80 border border-transparent'
      }`}
      id={`chat-item-${chat.id}`}
    >
      {/* Avatar Container */}
      <div className="relative flex-shrink-0">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
            chat.avatarColor || 'from-emerald-500 to-teal-700'
          } flex items-center justify-center text-sm font-bold text-white shadow-sm`}
        >
          {chat.type === 'group' ? (
            <Users className="w-6 h-6 text-white/90" />
          ) : (
            getInitials(chat.name)
          )}
        </div>

        {/* Presence status dot */}
        {chat.type === 'direct' && isPeerOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Name and Time */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-neutral-100 truncate flex items-center gap-1.5">
            {chat.name}
            {chat.isMuted && <VolumeX className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />}
          </h4>
          <span className="text-[11px] font-mono text-neutral-400 flex-shrink-0 ml-2">
            {formatChatListTime(chat.updatedAt)}
          </span>
        </div>

        {/* Last Message and Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">{renderLastMessageSnippet()}</div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {chat.isPinned && (
              <Pin className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            )}

            {chat.unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-neutral-950 text-[10px] font-bold flex items-center justify-center shadow-xs">
                {chat.unreadCount}
              </span>
            )}

            {/* Quick 3-dot trigger for context actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(!showContextMenu);
              }}
              className="p-1 rounded-lg text-neutral-500 hover:text-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu Popup */}
      {showContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-10 z-40 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl p-1.5 backdrop-blur-xl min-w-[170px] animate-in fade-in zoom-in-95 duration-100 text-xs text-neutral-200"
        >
          <button
            onClick={() => {
              onPinToggle(chat.id);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
          >
            <Pin className="w-4 h-4 text-neutral-400" />
            <span>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
          </button>

          <button
            onClick={() => {
              onMuteToggle(chat.id);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
          >
            <VolumeX className="w-4 h-4 text-neutral-400" />
            <span>{chat.isMuted ? 'Unmute chat' : 'Mute notifications'}</span>
          </button>

          <button
            onClick={() => {
              onMarkReadToggle(chat.id, chat.unreadCount);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
          >
            {chat.unreadCount > 0 ? (
              <>
                <MailOpen className="w-4 h-4 text-neutral-400" />
                <span>Mark as read</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 text-neutral-400" />
                <span>Mark as unread</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onArchiveToggle(chat.id);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left"
          >
            <Archive className="w-4 h-4 text-neutral-400" />
            <span>{chat.isArchived ? 'Unarchive' : 'Archive chat'}</span>
          </button>

          <div className="h-px bg-neutral-800 my-1" />

          <button
            onClick={() => {
              onDeleteChat(chat.id);
              setShowContextMenu(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete chat</span>
          </button>
        </div>
      )}
    </div>
  );
};
