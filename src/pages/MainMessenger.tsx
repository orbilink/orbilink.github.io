import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  HardDrive,
  Sparkles,
  User as UserIcon,
  Plus,
  Search,
  Phone,
  Settings,
  LogOut,
  Hash,
  Pin,
  Bot
} from 'lucide-react';
import { ChatGroup, Message, User, GoogleContact, GoogleDriveFile } from '../types';
import {
  INITIAL_GROUPS,
  INITIAL_MESSAGES,
  INITIAL_USERS,
  INITIAL_GOOGLE_CONTACTS,
  INITIAL_DRIVE_FILES
} from '../services/mockStorage';
import { ChatArea } from '../features/chat/ChatArea';
import { AiHubView } from '../features/ai/AiHubView';
import { GoogleContactsView } from '../features/contacts/GoogleContactsView';
import { GoogleDriveView } from '../features/drive/GoogleDriveView';
import { ProfileView } from '../features/profile/ProfileView';
import { LiveVoiceModal } from '../features/ai/LiveVoiceModal';
import { NewGroupModal } from '../features/groups/NewGroupModal';
import { GroupInfoModal } from '../features/groups/GroupInfoModal';
import { GoogleDrivePickerModal } from '../features/drive/GoogleDrivePickerModal';

interface MainMessengerProps {
  currentUser: User;
  onLogout: () => void;
}

export const MainMessenger: React.FC<MainMessengerProps> = ({
  currentUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'ai_hub' | 'contacts' | 'drive' | 'profile'>('chats');
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>(INITIAL_GROUPS);
  const [activeChatId, setActiveChatId] = useState<string>('chat_ai');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [userProfile, setUserProfile] = useState<User>(currentUser);
  const [contacts, setContacts] = useState<GoogleContact[]>(INITIAL_GOOGLE_CONTACTS);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>(INITIAL_DRIVE_FILES);

  // Modals
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const activeChat = chatGroups.find((g) => g.id === activeChatId) || chatGroups[0];
  const activeMessages = messagesMap[activeChatId] || [];

  const handleSendMessage = (
    content: string,
    type: Message['type'] = 'text',
    extra: Partial<Message> = {}
  ) => {
    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId: activeChatId,
      senderId: extra.senderId || userProfile.id,
      senderName: extra.senderName || userProfile.name,
      senderAvatar: extra.senderAvatar || userProfile.avatarUrl,
      content,
      timestamp: new Date().toISOString(),
      type,
      status: 'sent',
      ...extra
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    // Update last message in chat group
    setChatGroups((prev) =>
      prev.map((g) => (g.id === activeChatId ? { ...g, lastMessage: newMsg } : g))
    );
  };

  const handleCreateGroup = (name: string, description: string, memberIds: string[]) => {
    const selectedMembers = INITIAL_USERS.filter((u) => memberIds.includes(u.id));
    const newGroup: ChatGroup = {
      id: `group_${Date.now()}`,
      name,
      description,
      type: 'group',
      avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      participants: [userProfile, ...selectedMembers],
      participantIds: [userProfile.id, ...memberIds],
      unreadCount: 0,
      createdAt: new Date().toISOString()
    };

    setChatGroups([newGroup, ...chatGroups]);
    setActiveChatId(newGroup.id);
    setActiveTab('chats');
  };

  const handleStartChatWithContact = (contact: GoogleContact) => {
    const existing = chatGroups.find(
      (g) => g.type === 'direct' && g.name.toLowerCase() === contact.name.toLowerCase()
    );
    if (existing) {
      setActiveChatId(existing.id);
      setActiveTab('chats');
      return;
    }

    const newDm: ChatGroup = {
      id: `chat_${Date.now()}`,
      name: contact.name,
      type: 'direct',
      avatarUrl: contact.photoUrl,
      participants: [
        userProfile,
        {
          id: `usr_${contact.id}`,
          name: contact.name,
          username: contact.name.toLowerCase().replace(/\s+/g, '_'),
          email: contact.email,
          avatarUrl: contact.photoUrl,
          isOnline: true
        }
      ],
      participantIds: [userProfile.id, `usr_${contact.id}`],
      unreadCount: 0,
      createdAt: new Date().toISOString()
    };

    setChatGroups([newDm, ...chatGroups]);
    setActiveChatId(newDm.id);
    setActiveTab('chats');
  };

  const handleShareDriveFile = (file: GoogleDriveFile) => {
    handleSendMessage(`Attached file: ${file.name}`, 'file', {
      attachments: [
        {
          id: file.id,
          name: file.name,
          size: 1024 * 1024 * 2,
          type: 'document',
          url: '#'
        }
      ]
    });
    setActiveTab('chats');
  };

  const filteredChats = chatGroups.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      
      {/* 1. Global Left Icon Navigation Rail */}
      <div className="w-16 sm:w-18 bg-zinc-900/90 border-r border-white/5 flex flex-col items-center py-4 justify-between shrink-0 z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand Logo */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            <button
              onClick={() => setActiveTab('chats')}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === 'chats'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Chats & Channels"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('ai_hub')}
              className={`p-3 rounded-2xl transition-all relative ${
                activeTab === 'ai_hub'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="RYNOX Intelligence Suite"
            >
              <Bot className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === 'contacts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Google Contacts"
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('drive')}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === 'drive'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Google Drive"
            >
              <HardDrive className="w-5 h-5" />
            </button>
          </nav>
        </div>

        {/* Bottom Rail User & Settings */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`p-1 rounded-full border-2 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-500 shadow-md shadow-indigo-500/30'
                : 'border-transparent hover:border-zinc-600'
            }`}
            title="Profile & Settings"
          >
            <img
              src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={userProfile.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover"
            />
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Middle Sidebar (Chat List when in 'chats' mode) */}
      {activeTab === 'chats' && (
        <div className="w-80 sm:w-88 bg-zinc-900/60 border-r border-white/5 flex flex-col h-full shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h1 className="text-base font-bold text-white tracking-tight">Conversations</h1>
            <button
              onClick={() => setIsNewGroupOpen(true)}
              className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages or channels..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {filteredChats.map((chat) => {
              const isSelected = chat.id === activeChatId;
              const lastMsg = chat.lastMessage || messagesMap[chat.id]?.[messagesMap[chat.id]?.length - 1];

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm'
                      : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={
                        chat.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={chat.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border border-white/10"
                    />
                    {chat.type === 'ai' && (
                      <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-indigo-600 text-white shadow">
                        <Sparkles className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-bold text-white truncate flex items-center gap-1">
                        {chat.name}
                        {chat.isPinned && <Pin className="w-2.5 h-2.5 text-indigo-400 rotate-45" />}
                      </h3>
                      {lastMsg && (
                        <span className="text-[10px] text-zinc-500">
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 truncate">
                      {lastMsg ? lastMsg.content : chat.description || 'No messages yet'}
                    </p>
                  </div>

                  {chat.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeTab === 'chats' && (
          <ChatArea
            chat={activeChat}
            currentUser={userProfile}
            messages={activeMessages}
            onSendMessage={handleSendMessage}
            onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
            onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
            onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
          />
        )}

        {activeTab === 'ai_hub' && (
          <AiHubView
            onStartLiveVoice={() => setIsLiveVoiceOpen(true)}
            onOpenAiChat={() => {
              setActiveChatId('chat_ai');
              setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'contacts' && (
          <GoogleContactsView
            contacts={contacts}
            onStartChatWithContact={handleStartChatWithContact}
            onAddContact={(c) => setContacts([...contacts, { ...c, isRynoxUser: true }])}
          />
        )}

        {activeTab === 'drive' && (
          <GoogleDriveView
            files={driveFiles}
            onShareFileToChat={handleShareDriveFile}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            currentUser={userProfile}
            onUpdateUser={(updated) => setUserProfile({ ...userProfile, ...updated })}
          />
        )}
      </div>

      {/* Global Modals */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      <NewGroupModal
        isOpen={isNewGroupOpen}
        availableUsers={INITIAL_USERS.filter((u) => u.id !== userProfile.id)}
        onClose={() => setIsNewGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      <GroupInfoModal
        isOpen={isGroupInfoOpen}
        chat={activeChat}
        onClose={() => setIsGroupInfoOpen(false)}
      />

      <GoogleDrivePickerModal
        isOpen={isDrivePickerOpen}
        files={driveFiles}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFile={handleShareDriveFile}
      />

    </div>
  );
};
