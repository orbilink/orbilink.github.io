import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquarePlus,
  Users,
  Pin,
  Archive,
  Filter,
  Plus,
  RefreshCw,
  AlertTriangle,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Chat } from '../../types/chat';
import { UserProfile } from '../../types/user';
import { ChatListItem } from './ChatListItem';
import {
  firestoreService,
  FirestoreConnectionState,
} from '../../services/firebase/firestoreService';

interface ChatListProps {
  chats: Chat[];
  activeChatId?: string | null;
  currentUser: UserProfile;
  onSelectChat: (chatId: string) => void;
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onPinToggle: (chatId: string) => void;
  onMuteToggle: (chatId: string) => void;
  onArchiveToggle: (chatId: string) => void;
  onMarkReadToggle: (chatId: string, currentUnread: number) => void;
  onDeleteChat: (chatId: string) => void;
}

type FilterType = 'all' | 'unread' | 'groups' | 'direct' | 'archived';

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChatId,
  currentUser,
  onSelectChat,
  onOpenNewChat,
  onOpenNewGroup,
  onPinToggle,
  onMuteToggle,
  onArchiveToggle,
  onMarkReadToggle,
  onDeleteChat,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [connState, setConnState] = useState<FirestoreConnectionState>(
    firestoreService.getConnectionState()
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const filterScrollRef = useRef<HTMLDivElement | null>(null);

  const checkScrollability = () => {
    const el = filterScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, []);

  const handleScrollPills = (direction: 'left' | 'right') => {
    const el = filterScrollRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -120 : 120;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const unsub = firestoreService.subscribeConnectionStatus((state) => {
      setConnState(state);
    });
    return () => unsub();
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    try {
      await firestoreService.retryConnection();
    } finally {
      setTimeout(() => setIsRetrying(false), 300);
    }
  };

  // Filter Logic
  const filteredChats = chats.filter((c) => {
    // Search query match
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter tabs
    if (activeFilter === 'archived') {
      return c.isArchived;
    }
    if (c.isArchived) return false; // Hide archived from normal tabs

    if (activeFilter === 'unread') return c.unreadCount > 0;
    if (activeFilter === 'groups') return c.type === 'group';
    if (activeFilter === 'direct') return c.type === 'direct';

    return true;
  });

  const pinnedChats = filteredChats.filter((c) => c.isPinned && !c.isArchived);
  const unpinnedChats = filteredChats.filter((c) => !c.isPinned || c.isArchived);

  return (
    <div className="flex flex-col h-full bg-neutral-950/60 border-r border-neutral-800/80 select-none overflow-hidden" id="vault-mesh-chatlist">
      {/* Header & Quick Action Buttons */}
      <div className="p-3.5 space-y-3 border-b border-neutral-800/80 bg-neutral-950/90">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-100 tracking-tight">Messages</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenNewGroup}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 border border-neutral-800 transition-colors"
              title="Create New Group"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenNewChat}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-950/40 transition-colors"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conversations, messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-900/90 border border-neutral-800/80 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Filter Pills with Horizontal Mouse Wheel and Scroll Controls */}
        <div className="relative flex items-center group">
          {canScrollLeft && (
            <button
              onClick={() => handleScrollPills('left')}
              className="absolute left-0 z-10 p-1 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 shadow-md backdrop-blur -translate-x-1.5 transition-all"
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            ref={filterScrollRef}
            onScroll={checkScrollability}
            onWheel={(e) => {
              if (e.deltaY !== 0 && filterScrollRef.current) {
                filterScrollRef.current.scrollLeft += e.deltaY;
                checkScrollability();
              }
            }}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-0.5 w-full scroll-smooth cursor-grab active:cursor-grabbing touch-pan-x"
          >
            {(['all', 'unread', 'direct', 'groups', 'archived'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all select-none flex-shrink-0 ${
                  activeFilter === f
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/30'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80 hover:bg-neutral-850'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => handleScrollPills('right')}
              className="absolute right-0 z-10 p-1 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 shadow-md backdrop-blur translate-x-1.5 transition-all"
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Database Connection Alert Banner if Unavailable */}
        {connState.status === 'unavailable' && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-between gap-2 text-rose-200 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="font-semibold text-[11px] truncate">Firestore unavailable</span>
            </div>
            <button
              type="button"
              onClick={handleRetryConnection}
              disabled={isRetrying}
              className="px-2 py-0.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-[10px] font-semibold flex items-center gap-1 border border-rose-700 transition-colors flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Pinned Section */}
        {pinnedChats.length > 0 && activeFilter !== 'archived' && (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <Pin className="w-3 h-3 text-emerald-500/80" />
              <span>Pinned Conversations</span>
            </div>
            {pinnedChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                currentUser={currentUser}
                onClick={() => onSelectChat(chat.id)}
                onPinToggle={onPinToggle}
                onMuteToggle={onMuteToggle}
                onArchiveToggle={onArchiveToggle}
                onMarkReadToggle={onMarkReadToggle}
                onDeleteChat={onDeleteChat}
              />
            ))}
          </div>
        )}

        {/* All/Filtered Chats */}
        <div className="space-y-1">
          {pinnedChats.length > 0 && unpinnedChats.length > 0 && activeFilter !== 'archived' && (
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              <span>All Messages</span>
            </div>
          )}

          {unpinnedChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              currentUser={currentUser}
              onClick={() => onSelectChat(chat.id)}
              onPinToggle={onPinToggle}
              onMuteToggle={onMuteToggle}
              onArchiveToggle={onArchiveToggle}
              onMarkReadToggle={onMarkReadToggle}
              onDeleteChat={onDeleteChat}
            />
          ))}

          {filteredChats.length === 0 && (
            <div className="py-16 text-center text-xs text-neutral-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <p className="font-medium text-neutral-400">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-neutral-500">
                {searchQuery
                  ? 'Try modifying your search keywords'
                  : 'Start a new chat or search for a user to begin messaging.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Database Connection Status Footer */}
      <div className="px-3.5 py-2 border-t border-neutral-900 bg-neutral-950/90 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
        <div className="flex items-center gap-1.5">
          {connState.status === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400/90 font-semibold text-[10px]">Firestore connected</span>
            </>
          ) : connState.status === 'checking' ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-amber-400/90 font-semibold text-[10px]">Connecting...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span className="text-rose-400/90 font-semibold text-[10px]">Firestore unavailable</span>
            </>
          )}
        </div>
        <span className="text-[10px] text-neutral-600">E2EE End-to-End</span>
      </div>
    </div>
  );
};
