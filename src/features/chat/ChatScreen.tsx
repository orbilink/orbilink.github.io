import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Shield,
  Trash2,
  Copy,
  Users,
  CheckSquare,
  Sparkles,
  Globe,
  Mic,
  X,
} from 'lucide-react';
import { Chat, Message, Attachment } from '../../types/chat';
import { UserProfile } from '../../types/user';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { MediaLightbox } from '../media/MediaLightbox';
import { ForwardModal } from './ForwardModal';
import { SearchInChatModal } from './SearchInChatModal';
import { LiveVoiceModal } from '../ai/LiveVoiceModal';
import { GoogleSearchGroundingModal } from '../ai/GoogleSearchGroundingModal';
import { groupMessagesByDate } from '../../utils/dateUtils';
import { getInitials } from '../../utils/mediaUtils';
import { toast } from '../../components/ToastContainer';
import { formatLastSeen } from '../../utils/formatters';

interface ChatScreenProps {
  chat: Chat;
  messages: Message[];
  allChats: Chat[];
  currentUser: UserProfile;
  onBack?: () => void;
  onSendMessage: (text: string, type?: Message['type'], attachments?: Attachment[]) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessageForMe: (messageId: string) => void;
  onDeleteMessageForEveryone: (messageId: string) => void;
  onForwardMessages: (targetChatIds: string[], message: Message) => void;
  onBatchDeleteMessages: (messageIds: string[]) => void;
  onOpenInfoModal: () => void;
  onTyping?: (isTyping: boolean) => void;
  onStartCall?: (
    peer: { id: string; displayName: string; username: string; avatarUrl?: string; avatarColor?: string },
    type: 'voice' | 'video'
  ) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  chat,
  messages,
  allChats,
  currentUser,
  onBack,
  onSendMessage,
  onReactToMessage,
  onEditMessage,
  onDeleteMessageForMe,
  onDeleteMessageForEveryone,
  onForwardMessages,
  onBatchDeleteMessages,
  onOpenInfoModal,
  onTyping,
  onStartCall,
}) => {
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);

  // Modals state
  const [activeMedia, setActiveMedia] = useState<{ attachment: Attachment; caption?: string } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showLiveVoiceModal, setShowLiveVoiceModal] = useState<boolean>(false);
  const [showGroundingModal, setShowGroundingModal] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, chat.id]);

  // Peer Profile Info
  const profiles = chat.participantProfiles ? (Object.values(chat.participantProfiles) as Array<Partial<UserProfile>>) : [];
  const peerProfile = chat.type === 'direct'
    ? profiles.find((p) => p?.username !== currentUser.username)
    : undefined;
  const isPeerOnline = peerProfile?.isOnline ?? false;

  const dateGroups = groupMessagesByDate(messages);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.show('Copied to clipboard', 'success');
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  };

  const handleBatchCopy = () => {
    const selectedMsgs = messages.filter((m) => selectedMessageIds.includes(m.id));
    const combined = selectedMsgs.map((m) => `[${m.senderName}]: ${m.text}`).join('\n');
    navigator.clipboard.writeText(combined);
    toast.show(`${selectedMsgs.length} messages copied`, 'success');
    setIsSelectMode(false);
    setSelectedMessageIds([]);
  };

  const handleBatchDelete = () => {
    onBatchDeleteMessages(selectedMessageIds);
    toast.show(`${selectedMessageIds.length} messages deleted`, 'info');
    setIsSelectMode(false);
    setSelectedMessageIds([]);
  };

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-bubble-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-emerald-400');
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950/40 relative overflow-hidden" id="rynox-chatscreen">
      {/* Lightboxes and Modals */}
      {activeMedia && (
        <MediaLightbox
          attachment={activeMedia.attachment}
          caption={activeMedia.caption}
          onClose={() => setActiveMedia(null)}
        />
      )}

      {forwardingMessage && (
        <ForwardModal
          isOpen={true}
          chats={allChats}
          onForwardToChats={(targetIds) => {
            onForwardMessages(targetIds, forwardingMessage);
            setForwardingMessage(null);
            toast.show('Forwarded to selected chats', 'success');
          }}
          onClose={() => setForwardingMessage(null)}
        />
      )}

      {showSearchModal && (
        <SearchInChatModal
          isOpen={true}
          messages={messages}
          onSelectMessage={scrollToMessage}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Gemini 3.1 Flash Live Voice Assistant */}
      {showLiveVoiceModal && (
        <LiveVoiceModal
          isOpen={showLiveVoiceModal}
          onClose={() => setShowLiveVoiceModal(false)}
          onShareTranscriptToChat={(transcript: string) => {
            onSendMessage(transcript, 'text');
            setShowLiveVoiceModal(false);
            toast.show('Voice transcript sent to chat', 'success');
          }}
        />
      )}

      {/* Gemini 3.5 Flash Google Search Grounding */}
      {showGroundingModal && (
        <GoogleSearchGroundingModal
          isOpen={showGroundingModal}
          onClose={() => setShowGroundingModal(false)}
          onShareToChat={(content) => {
            onSendMessage(content, 'text');
            setShowGroundingModal(false);
          }}
        />
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-neutral-950/90 border-b border-neutral-800/80 z-10 backdrop-blur-md">
        {/* Left: Avatar & Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 rounded-xl transition-colors md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onOpenInfoModal}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative flex-shrink-0">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br ${
                  chat.avatarColor || 'from-emerald-500 to-teal-700'
                } flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-sm`}
              >
                {chat.type === 'group' ? (
                  <Users className="w-5 h-5 text-white/90" />
                ) : (
                  getInitials(chat.name)
                )}
              </div>
              {chat.type === 'direct' && isPeerOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-100 truncate group-hover:text-emerald-300 transition-colors">
                {chat.name}
              </h3>

              <div className="text-xs text-neutral-400 truncate">
                {chat.typingUsers && chat.typingUsers.length > 0 ? (
                  <span className="text-emerald-400 font-medium animate-pulse">
                    {chat.typingUsers.join(', ')} typing...
                  </span>
                ) : chat.type === 'group' ? (
                  <span>{chat.members?.length || chat.participants.length} members</span>
                ) : isPeerOnline ? (
                  <span className="text-emerald-400 font-medium">Online</span>
                ) : (
                  <span>{formatLastSeen(peerProfile?.lastSeen || 0)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 sm:gap-2 text-neutral-400">
          {/* Gemini 3.1 Flash Live Voice Trigger */}
          <button
            onClick={() => setShowLiveVoiceModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all shadow-sm"
            title="Live Voice Conversation (gemini-3.1-flash-live-preview)"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden md:inline">Voice AI</span>
          </button>

          {/* Gemini 3.7 Flash Google Search Grounding Trigger */}
          <button
            onClick={() => setShowGroundingModal(true)}
            className="p-2 rounded-xl hover:bg-neutral-900 hover:text-blue-400 transition-colors text-neutral-400"
            title="Search Web with Google Grounding (gemini-3.7-flash)"
          >
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {chat.type === 'direct' && onStartCall && (
            <>
              <button
                onClick={() => {
                  const peerUid = chat.participants.find((p) => p !== currentUser.id) || '';
                  onStartCall(
                    {
                      id: peerUid,
                      displayName: chat.name,
                      username: peerProfile?.username || chat.name,
                      avatarUrl: chat.avatarUrl,
                      avatarColor: chat.avatarColor,
                    },
                    'voice'
                  );
                }}
                className="p-2 rounded-xl hover:bg-neutral-900 hover:text-emerald-400 transition-colors"
                title="Start Voice Call"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => {
                  const peerUid = chat.participants.find((p) => p !== currentUser.id) || '';
                  onStartCall(
                    {
                      id: peerUid,
                      displayName: chat.name,
                      username: peerProfile?.username || chat.name,
                      avatarUrl: chat.avatarUrl,
                      avatarColor: chat.avatarColor,
                    },
                    'video'
                  );
                }}
                className="p-2 rounded-xl hover:bg-neutral-900 hover:text-teal-400 transition-colors"
                title="Start Video Call"
              >
                <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </>
          )}

          <button
            onClick={() => setShowSearchModal(true)}
            className="p-2 rounded-xl hover:bg-neutral-900 hover:text-neutral-200 transition-colors"
            title="Search in conversation"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={onOpenInfoModal}
            className="p-2 rounded-xl hover:bg-neutral-900 hover:text-neutral-200 transition-colors"
            title="View Details"
          >
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Multi-Select Batch Action Bar */}
      {isSelectMode && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/30 p-2.5 px-4 flex items-center justify-between z-10 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedMessageIds.length} messages selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchCopy}
              disabled={selectedMessageIds.length === 0}
              className="p-1.5 rounded-lg bg-neutral-900/80 text-neutral-300 hover:text-white disabled:opacity-40"
              title="Copy Selected"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={selectedMessageIds.length === 0}
              className="p-1.5 rounded-lg bg-rose-900/40 text-rose-300 hover:bg-rose-900/60 disabled:opacity-40"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedMessageIds([]);
              }}
              className="p-1.5 rounded-lg bg-neutral-900/80 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Privacy Notice Banner */}
        <div className="flex justify-center my-2">
          <div className="max-w-md px-4 py-2 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 text-[11px] text-neutral-400 text-center leading-relaxed backdrop-blur-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Direct conversation secured with Firebase Authentication & Firestore rules.
            </span>
          </div>
        </div>

        {/* Grouped Messages */}
        {dateGroups.map((group) => (
          <div key={group.dateKey} className="space-y-1">
            {/* Date Separator Badge */}
            <div className="flex justify-center my-4 sticky top-2 z-10 pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-neutral-400 shadow-md backdrop-blur-md">
                {group.dateLabel}
              </span>
            </div>

            {/* Messages in this day */}
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUser={currentUser}
                isGroupChat={chat.type === 'group'}
                isSelectMode={isSelectMode}
                isSelected={selectedMessageIds.includes(message.id)}
                onToggleSelect={toggleSelectMessage}
                onReply={(msg) => setReplyingTo(msg)}
                onReact={(msgId, emoji) => onReactToMessage(msgId, emoji)}
                onCopy={handleCopyText}
                onEdit={(msg) => setEditingMessage(msg)}
                onForward={(msg) => setForwardingMessage(msg)}
                onDeleteForMe={onDeleteMessageForMe}
                onDeleteForEveryone={onDeleteMessageForEveryone}
                onOpenMedia={(att, cap) => setActiveMedia({ attachment: att, caption: cap })}
              />
            ))}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        chatId={chat.id}
        onSendMessage={(text, type, atts) => {
          onSendMessage(text, type, atts);
          setReplyingTo(null);
          setEditingMessage(null);
        }}
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessage(null)}
        onSaveEdit={(msgId, newTxt) => {
          onEditMessage(msgId, newTxt);
          setEditingMessage(null);
        }}
        onTyping={onTyping}
      />
    </div>
  );
};
