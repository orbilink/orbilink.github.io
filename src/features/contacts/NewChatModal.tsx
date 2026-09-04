import React, { useState, useEffect } from 'react';
import { X, Search, MessageSquarePlus, Users, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { Contact, UserProfile } from '../../types/user';
import { getInitials } from '../../utils/mediaUtils';
import { firestoreService } from '../../services/firebase/firestoreService';

interface NewChatModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentUser: UserProfile | null;
  onSelectContact: (contact: Contact) => void;
  onOpenNewGroup: () => void;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  contacts,
  currentUser,
  onSelectContact,
  onOpenNewGroup,
  onClose,
}) => {
  const [search, setSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Contact[]>(contacts);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSearchResults(contacts);
      return;
    }

    if (!search.trim()) {
      setSearchResults(contacts);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await firestoreService.searchUsers(search, currentUser?.id || '');
        setSearchResults(results);
      } catch {
        setSearchResults(
          contacts.filter(
            (c) =>
              c.displayName.toLowerCase().includes(search.toLowerCase()) ||
              c.username.toLowerCase().includes(search.toLowerCase())
          )
        );
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, isOpen, contacts, currentUser?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150" id="orbilink-new-chat-modal">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100">Start Real Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-neutral-800/80">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            )}
            <input
              type="text"
              autoFocus
              placeholder="Search by exact username or display name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Action: Create Group option */}
        <div className="p-2 border-b border-neutral-800/60">
          <button
            onClick={() => {
              onClose();
              onOpenNewGroup();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold block">Create New Group</span>
              <span className="text-xs opacity-80">Multi-user group messaging</span>
            </div>
          </button>
        </div>

        {/* Contacts & Search Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              {search.trim() ? 'Search Results' : 'Known Network Users'}
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'}
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8 px-4 text-neutral-500">
              <p className="text-xs">No users found matching "{search}"</p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Ask your friend for their exact @username to start chatting.
              </p>
            </div>
          ) : (
            searchResults.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  onSelectContact(contact);
                  onClose();
                }}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-neutral-800/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt={contact.displayName}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                          contact.avatarColor || 'from-emerald-500 to-teal-700'
                        } flex items-center justify-center text-xs font-bold text-white shadow-xs`}
                      >
                        {getInitials(contact.displayName)}
                      </div>
                    )}
                    {contact.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-neutral-200 truncate group-hover:text-emerald-300 transition-colors">
                        {contact.displayName}
                      </h4>
                      {contact.isOnline && (
                        <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.2 rounded-full bg-emerald-500/10">
                          online
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400 block truncate">@{contact.username}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-neutral-500 group-hover:text-emerald-400 transition-colors">
                  <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                    Chat
                  </span>
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
