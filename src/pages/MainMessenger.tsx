import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  HardDrive,
  Sparkles,
  User as UserIcon,
  Plus,
  Search,
  Settings,
  LogOut,
  Bot,
  Hash,
  X,
  UserPlus,
  Loader2,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { ChatGroup, Message, User, GoogleContact, GoogleDriveFile } from '../types';
import { firestoreService } from '../services/firebase/firestoreService';
import { authService } from '../services/firebase/authService';
import { UserProfile, Contact } from '../types/user';
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
  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [userProfile, setUserProfile] = useState<User>(currentUser);

  // Modals
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // User Search State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Chat filter
  const [searchQuery, setSearchQuery] = useState('');

  const getUserProfile = (): UserProfile => ({
    id: userProfile.id,
    uid: userProfile.id,
    displayName: userProfile.name,
    username: userProfile.username,
    email: userProfile.email,
    avatarUrl: userProfile.avatarUrl,
    about: userProfile.bio || '',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // 1. Subscribe to real Firestore chats for the logged in user
  useEffect(() => {
    if (!currentUser.id) return;

    const unsubscribe = firestoreService.subscribeToChats(currentUser.id, (realChats) => {
      const mappedChats: ChatGroup[] = realChats.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        avatarUrl: c.avatarUrl,
        type: c.type,
        participants: (c.participants || []).map((uid) => {
          const prof = c.participantProfiles?.[uid];
          return {
            id: uid,
            name: prof?.displayName || prof?.username || 'User',
            username: prof?.username || '',
            email: '',
            avatarUrl: prof?.avatarUrl,
            isOnline: prof?.isOnline,
          };
        }),
        participantIds: c.participants,
        lastMessage: c.lastMessage
          ? {
              id: `last_${c.id}`,
              chatId: c.id,
              senderId: c.lastMessage.senderId,
              senderName: c.lastMessage.senderName,
              content: c.lastMessage.text || '',
              timestamp: new Date(c.lastMessage.timestamp || Date.now()).toISOString(),
              type: (c.lastMessage.type === 'video' || c.lastMessage.type === 'document' || c.lastMessage.type === 'location' ? 'file' : c.lastMessage.type) as Message['type'],
              status: (c.lastMessage.status === 'failed' ? 'sent' : c.lastMessage.status) as Message['status']
            }
          : undefined,
        unreadCount: c.unreadCount || 0,
        isPinned: c.isPinned,
        isArchived: c.isArchived,
        createdAt: new Date(c.createdAt || Date.now()).toISOString(),
        createdBy: c.createdBy
      }));

      setChatGroups(mappedChats);

      // Auto-select first chat if no active chat
      setActiveChatId((prev) => {
        if (prev && mappedChats.some((c) => c.id === prev)) return prev;
        return mappedChats.length > 0 ? mappedChats[0].id : null;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.id]);

  // 2. Subscribe to real Firestore messages for the active conversation
  useEffect(() => {
    if (!activeChatId) {
      setActiveMessages([]);
      return;
    }

    const unsubscribe = firestoreService.subscribeToMessages(activeChatId, (rawMsgs) => {
      const mapped: Message[] = rawMsgs.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar,
        content: m.text || '',
        timestamp:
          typeof m.timestamp === 'number'
            ? new Date(m.timestamp).toISOString()
            : String(m.timestamp || new Date().toISOString()),
        type: (m.type === 'video' || m.type === 'document' || m.type === 'location' ? 'file' : m.type) as Message['type'],
        attachments: m.attachments?.map((a) => ({
          id: a.id,
          name: a.name,
          size: typeof a.size === 'number' ? a.size : Number(a.size) || 0,
          type: (a.type === 'video' ? 'video' : a.type === 'audio' ? 'audio' : a.type === 'image' ? 'image' : 'file') as any,
          url: a.url,
          thumbnailUrl: a.thumbnailUrl,
          mimeType: a.mimeType
        })),
        reactions: (m.reactions || []).map((r) => ({
          emoji: r.emoji,
          count: 1,
          users: [r.userId]
        })),
        replyTo: m.replyTo
          ? {
              id: m.replyTo.id,
              senderName: m.replyTo.senderName,
              content: m.replyTo.text || ''
            }
          : undefined,
        status: (m.status === 'failed' ? 'sent' : m.status) as Message['status']
      }));

      setActiveMessages(mapped);
    }, currentUser.id);

    return () => {
      unsubscribe();
    };
  }, [activeChatId, currentUser.id]);

  // Search users across Firestore
  useEffect(() => {
    if (!isNewChatModalOpen) {
      setSearchResults([]);
      setUserSearchQuery('');
      return;
    }

    const timer = setTimeout(async () => {
      if (!userSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await firestoreService.searchUsers(userSearchQuery, currentUser.id);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, isNewChatModalOpen, currentUser.id]);

  const activeChat = chatGroups.find((g) => g.id === activeChatId) || null;

  const handleSendMessage = async (
    content: string,
    type: Message['type'] = 'text',
    extra: Partial<Message> = {}
  ) => {
    if (!activeChatId) return;

    await firestoreService.sendMessage(
      activeChatId,
      getUserProfile(),
      content,
      type as any,
      extra.attachments as any,
      extra.replyTo
        ? {
            id: extra.replyTo.id,
            text: extra.replyTo.content,
            senderName: extra.replyTo.senderName
          }
        : undefined
    );
  };

  const handleStartDirectChat = async (targetContact: Contact) => {
    const currentProfile = getUserProfile();
    const newChat = await firestoreService.createDirectChat(currentProfile, targetContact);
    setActiveChatId(newChat.id);
    setIsNewChatModalOpen(false);
    setActiveTab('chats');
  };

  const handleCreateGroup = async (name: string, description: string, memberIds: string[]) => {
    const currentProfile = getUserProfile();

    const memberContacts: Contact[] = memberIds.map((mid) => ({
      id: mid,
      userId: mid,
      displayName: 'Member',
      username: '',
      avatarColor: '#6366f1',
      about: '',
      isOnline: false,
      lastSeen: 0
    }));

    const newChat = await firestoreService.createGroupChat(
      currentProfile,
      name,
      description,
      memberContacts
    );

    setActiveChatId(newChat.id);
    setIsNewGroupOpen(false);
  };

  const filteredChats = chatGroups.filter((g) =>
    (g.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden antialiased">
      {/* 1. Left Primary Rail Navigation */}
      <div className="w-16 sm:w-20 bg-zinc-900/90 border-r border-white/5 flex flex-col items-center justify-between py-5 shrink-0 z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Brand Icon */}
          <div className="w-10 h-10 rounded-2xl bg-[#25D366] flex items-center justify-center text-black shadow-lg shadow-[#25D366]/30">
            <Sparkles className="w-5 h-5 text-black" />
          </div>

          {/* Nav Items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            <button
              onClick={() => setActiveTab('chats')}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === 'chats'
                  ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Conversations"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('ai_hub')}
              className={`p-3 rounded-2xl transition-all relative ${
                activeTab === 'ai_hub'
                  ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="AI Intelligence Hub"
            >
              <Bot className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`p-3 rounded-2xl transition-all ${
                activeTab === 'contacts'
                  ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/30'
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
                  ? 'bg-[#25D366] text-black shadow-md shadow-[#25D366]/30'
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
                ? 'border-[#25D366] shadow-md shadow-[#25D366]/30'
                : 'border-transparent hover:border-zinc-600'
            }`}
            title="Profile & Settings"
          >
            <div className="w-8 h-8 rounded-full bg-[#128C7E] text-white flex items-center justify-center text-xs font-bold uppercase">
              {userProfile.name ? userProfile.name.charAt(0) : 'U'}
            </div>
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="p-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-black font-semibold shadow-md shadow-[#25D366]/20 transition-all flex items-center gap-1 text-xs"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={() => setIsNewGroupOpen(true)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all text-xs font-semibold"
                title="Create Group"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>
          </div>

          {/* Chat List Items */}
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {filteredChats.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
                <p className="font-medium text-zinc-400 mb-1">No conversations yet</p>
                <p className="text-[11px] text-zinc-500 mb-3">
                  Click "New Chat" to search for registered users and start messaging.
                </p>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-black text-xs font-bold transition-all"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === activeChatId;
                const lastMsg = chat.lastMessage;

                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#25D366]/15 border border-[#25D366]/40 text-white shadow-sm'
                        : 'hover:bg-zinc-800/50 border border-transparent text-zinc-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-sm font-bold text-zinc-200 uppercase">
                        {chat.name ? chat.name.charAt(0) : '#'}
                      </div>
                      {chat.type === 'ai' && (
                        <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#25D366] text-black">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h2 className="text-xs font-semibold truncate text-zinc-100">{chat.name}</h2>
                        {lastMsg && (
                          <span className="text-[10px] text-zinc-500 shrink-0">
                            {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {lastMsg ? lastMsg.content : 'No messages yet'}
                      </p>
                    </div>

                    {chat.unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#25D366] text-black text-[10px] font-bold">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {activeTab === 'chats' && (
          activeChat ? (
            <ChatArea
              chat={activeChat}
              currentUser={userProfile}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
              onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
              onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
              onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-[#25D366]" />
              </div>
              <h2 className="text-base font-bold text-white mb-1">Select or start a conversation</h2>
              <p className="text-xs max-w-sm text-zinc-400 mb-4">
                Connect with any user registered in Firebase Firestore in real-time.
              </p>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-black text-xs font-bold shadow-lg shadow-[#25D366]/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Search Users</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'ai_hub' && (
          <AiHubView
            onStartLiveVoice={() => setIsLiveVoiceOpen(true)}
            onOpenAiChat={() => setActiveTab('chats')}
          />
        )}
        {activeTab === 'contacts' && (
          <GoogleContactsView
            onStartChatWithContact={(gc) => {
              handleStartDirectChat({
                id: gc.id,
                userId: gc.id,
                displayName: gc.name,
                username: '',
                avatarColor: '#25D366',
                about: '',
                isOnline: false,
                lastSeen: 0
              });
            }}
          />
        )}
        {activeTab === 'drive' && (
          <GoogleDriveView
            onShareFileToChat={(file) => {
              if (activeChatId) {
                handleSendMessage(`Shared file: ${file.name} (${file.size})`, 'file');
                setActiveTab('chats');
              }
            }}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={userProfile}
            onUpdateUser={(updated) => {
              setUserProfile((prev) => ({ ...prev, ...updated }));
            }}
          />
        )}
      </div>

      {/* New Chat / User Search Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#25D366]" />
                <h3 className="text-sm font-bold text-white">Start New Conversation</h3>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                autoFocus
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search registered users by username or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {isSearching ? (
                <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#25D366]" />
                  <span>Searching Firestore...</span>
                </div>
              ) : userSearchQuery.trim() && searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No registered users found matching "{userSearchQuery}".
                </div>
              ) : !userSearchQuery.trim() ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Type a username or email to find real users in the network.
                </div>
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartDirectChat(user)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 hover:bg-[#25D366]/10 border border-white/5 hover:border-[#25D366]/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200 uppercase">
                        {user.displayName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{user.displayName}</h4>
                        <p className="text-[11px] text-zinc-400">@{user.username || 'user'}</p>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-[#25D366] hover:bg-[#128C7E] text-black rounded-lg text-xs font-bold transition-colors">
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Voice Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={isNewGroupOpen}
        availableUsers={[]}
        onClose={() => setIsNewGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Group Info Modal */}
      {activeChat && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          chat={activeChat}
          onClose={() => setIsGroupInfoOpen(false)}
        />
      )}

      {/* Drive Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelectFile={(file) => {
          handleSendMessage(`Attached file: ${file.name} (${file.size})`, 'file');
          setIsDrivePickerOpen(false);
        }}
      />
    </div>
  );
};
