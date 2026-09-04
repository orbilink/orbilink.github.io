import React, { useState } from 'react';
import {
  Search,
  UserPlus,
  Shield,
  Trash2,
  UserCheck,
  Globe,
  Loader2,
} from 'lucide-react';
import { Contact, UserProfile } from '../../types/user';
import { getInitials } from '../../utils/mediaUtils';
import { firestoreService } from '../../services/firebase/firestoreService';
import { toast } from '../../components/ToastContainer';
import { GoogleContactsView } from './GoogleContactsView';

interface ContactsListProps {
  contacts: Contact[];
  currentUser: UserProfile;
  onSelectContact: (contact: Contact) => void;
  onViewProfile: (contact: Contact) => void;
  onOpenNewChat: () => void;
}

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  currentUser,
  onSelectContact,
  onViewProfile,
  onOpenNewChat,
}) => {
  const [contactsSource, setContactsSource] = useState<'vault' | 'google'>('vault');
  const [search, setSearch] = useState<string>('');
  const [showNetworkSearch, setShowNetworkSearch] = useState<boolean>(false);
  const [networkQuery, setNetworkQuery] = useState<string>('');
  const [networkResults, setNetworkResults] = useState<Contact[]>([]);
  const [isSearchingNetwork, setIsSearchingNetwork] = useState<boolean>(false);

  const filtered = contacts.filter(
    (c) =>
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      (c.about && c.about.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSearchNetwork = async (q: string) => {
    setNetworkQuery(q);
    if (!q.trim()) {
      setNetworkResults([]);
      setIsSearchingNetwork(false);
      return;
    }

    setIsSearchingNetwork(true);
    try {
      const results = await firestoreService.searchUsers(q, currentUser.id);
      setNetworkResults(results);
    } catch {
      setNetworkResults([]);
    } finally {
      setIsSearchingNetwork(false);
    }
  };

  const handleAddContact = async (user: Contact) => {
    try {
      await firestoreService.addContact(currentUser.id, user);
      toast.show(`Added ${user.displayName} to contacts`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add contact';
      toast.show(msg, 'error');
    }
  };

  const handleRemoveContact = async (contactId: string, contactName: string) => {
    try {
      await firestoreService.removeContact(currentUser.id, contactId);
      toast.show(`Removed ${contactName} from contacts`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove contact';
      toast.show(msg, 'error');
    }
  };

  if (contactsSource === 'google') {
    return (
      <GoogleContactsView
        currentUser={currentUser}
        existingContacts={contacts}
        onStartDirectChat={onSelectContact}
        onViewProfile={onViewProfile}
        onClose={() => setContactsSource('vault')}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950/60 border-r border-neutral-800/80 select-none overflow-hidden" id="vault-contacts-list">
      {/* Header */}
      <div className="p-3.5 space-y-3 border-b border-neutral-800/80 bg-neutral-950/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-100 tracking-tight">Contacts</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800">
              {contacts.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setContactsSource('google')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 hover:border-neutral-600 transition-all shadow-sm group"
              title="View and sync Google Contacts"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              onClick={() => setShowNetworkSearch(!showNetworkSearch)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                showNetworkSearch
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
              title="Search network for new contacts"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showNetworkSearch ? 'Close' : 'Add'}</span>
            </button>
          </div>
        </div>

        {/* Network User Search Drawer */}
        {showNetworkSearch ? (
          <div className="space-y-2 p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl animate-in fade-in duration-100">
            <div className="relative">
              {isSearchingNetwork ? (
                <Loader2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              )}
              <input
                type="text"
                autoFocus
                placeholder="Search registered user by @username..."
                value={networkQuery}
                onChange={(e) => handleSearchNetwork(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Network Results List */}
            {networkQuery.trim() && (
              <div className="space-y-1 max-h-48 overflow-y-auto pt-1">
                {networkResults.length === 0 && !isSearchingNetwork && (
                  <p className="text-[11px] text-neutral-500 text-center py-2">
                    No registered user matching "{networkQuery}"
                  </p>
                )}

                {networkResults.map((u) => {
                  const isAlreadyContact = firestoreService.isContact(u.userId);
                  return (
                    <div
                      key={u.userId}
                      className="flex items-center justify-between p-2 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:bg-neutral-950 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                            u.avatarColor || 'from-emerald-500 to-teal-700'
                          } flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}
                        >
                          {getInitials(u.displayName)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-neutral-200 block truncate">
                            {u.displayName}
                          </span>
                          <span className="text-[10px] text-neutral-400">@{u.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isAlreadyContact ? (
                          <span className="text-[10px] text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded-lg flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Saved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddContact(u)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <UserPlus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Filter saved contacts */
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter your contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-900/90 border border-neutral-800/80 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className="group flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-900/80 cursor-pointer border border-transparent hover:border-neutral-800/80 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                    contact.avatarColor || 'from-emerald-500 to-teal-700'
                  } flex items-center justify-center text-xs font-bold text-white shadow-sm`}
                >
                  {getInitials(contact.displayName)}
                </div>
                {contact.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
                )}
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-neutral-100 truncate group-hover:text-emerald-300 transition-colors">
                  {contact.displayName}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate">
                  <span className="font-mono text-[11px] text-emerald-400/90">@{contact.username}</span>
                  {contact.about && (
                    <>
                      <span>·</span>
                      <span className="truncate">{contact.about}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(contact);
                }}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="View Profile"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveContact(contact.userId, contact.displayName);
                }}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition-colors"
                title="Remove Contact"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-xs text-neutral-500 space-y-3">
            <p>
              {search
                ? `No contacts match "${search}"`
                : 'Your contacts list is empty.'}
            </p>
            <button
              onClick={() => setShowNetworkSearch(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Find & Add Registered Users</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
