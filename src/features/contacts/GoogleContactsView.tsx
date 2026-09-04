import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { GoogleContact } from '../../types';

interface GoogleContactsViewProps {
  contacts?: GoogleContact[];
  existingContacts?: any[];
  currentUser?: any;
  onStartChatWithContact?: (contact: GoogleContact) => void;
  onStartDirectChat?: (contact: any) => void;
  onViewProfile?: (contact: any) => void;
  onAddContact?: (contact: GoogleContact) => void;
  onClose?: () => void;
}

export const GoogleContactsView: React.FC<GoogleContactsViewProps> = ({
  contacts = [],
  existingContacts = [],
  currentUser,
  onStartChatWithContact,
  onStartDirectChat,
  onViewProfile,
  onAddContact,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const [filterRynoxOnly, setFilterRynoxOnly] = useState(false);

  const displayContacts = contacts.length > 0 ? contacts : (existingContacts as GoogleContact[]);

  const filtered = displayContacts.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    if (filterRynoxOnly) return matchesSearch && c.isRynoxUser;
    return matchesSearch;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h1 className="text-xl font-bold text-white">Google Contacts Directory</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Synchronize your workspace address book and start conversations instantly
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              Connected & Synced
            </span>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or team..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <button
            onClick={() => setFilterRynoxOnly(!filterRynoxOnly)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-colors border ${
              filterRynoxOnly
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {filterRynoxOnly ? 'Showing RYNOX Users' : 'Filter RYNOX Users'}
          </button>
        </div>

        {/* Contacts List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    contact.photoUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={contact.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-white/10"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-white truncate">{contact.name}</h3>
                    {contact.isRynoxUser && (
                      <span title="RYNOX User">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {contact.email}
                  </p>
                  {contact.phone && (
                    <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {contact.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                {contact.isRynoxUser ? (
                  <button
                    onClick={() => {
                      if (onStartChatWithContact) onStartChatWithContact(contact);
                      else if (onStartDirectChat) onStartDirectChat(contact);
                    }}
                    className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                    title="Direct Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onAddContact) onAddContact(contact);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-white/10 transition-all"
                    title="Invite to RYNOX"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
