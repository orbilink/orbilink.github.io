import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { GoogleContact } from '../../types';
import { GoogleContactsService } from '../../services/googleContactsService';
import { authService } from '../../services/firebase/authService';

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

const contactsService = new GoogleContactsService();

export const GoogleContactsView: React.FC<GoogleContactsViewProps> = ({
  onStartChatWithContact,
  onStartDirectChat,
  onAddContact
}) => {
  const [hasToken, setHasToken] = useState<boolean>(contactsService.hasAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [realContacts, setRealContacts] = useState<GoogleContact[]>([]);
  const [search, setSearch] = useState('');
  const [filterOrbilinkOnly, setFilterOrbilinkOnly] = useState(false);

  useEffect(() => {
    if (hasToken) {
      loadContacts();
    }
  }, [hasToken]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactsService.fetchConnections();
      const mapped: GoogleContact[] = data.map((c) => ({
        id: c.resourceName,
        name: c.displayName,
        email: c.primaryEmail || c.emails?.[0] || '',
        phone: c.primaryPhone || c.phoneNumbers?.[0] || '',
        photoUrl: c.photoUrl,
        isOrbilinkUser: !!c.matchedOrbilinkUser || !!c.isOrbilinkUser
      }));
      setRealContacts(mapped);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Google Contacts');
      setHasToken(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.requestGoogleContactsAccess();
      setHasToken(contactsService.hasAccessToken());
      await loadContacts();
    } catch (err: any) {
      setError(err?.message || 'Google Contacts authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex-1 h-full flex items-center justify-center p-6 bg-zinc-950/60">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4 border border-white/5">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Google Contacts integration not configured</h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Real Google People API OAuth requires connecting your authorized Google account to synchronize your real address book.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#128C7E] text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-[#25D366]/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Connect Google Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const filtered = realContacts.filter((c) => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    if (filterOrbilinkOnly) return matchesSearch && c.isOrbilinkUser;
    return matchesSearch;
  });

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#25D366]" />
              <h1 className="text-xl font-bold text-white">Google Contacts Directory</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Synchronize your workspace address book and start conversations instantly
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              Connected to Google People API
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
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
            />
          </div>

          <button
            onClick={() => setFilterOrbilinkOnly(!filterOrbilinkOnly)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-colors border ${
              filterOrbilinkOnly
                ? 'bg-[#25D366] border-[#25D366] text-black font-bold'
                : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {filterOrbilinkOnly ? 'Showing ORBILINK Users' : 'Filter ORBILINK Users'}
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
            <span>Loading Google Contacts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            No contacts found in your connected Google account.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((contact) => (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-[#25D366]/30 transition-all flex items-center justify-between gap-3 shadow-sm"
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
                      {contact.isOrbilinkUser && (
                        <span title="ORBILINK User">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
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
                  {contact.isOrbilinkUser ? (
                    <button
                      onClick={() => {
                        if (onStartChatWithContact) onStartChatWithContact(contact);
                        else if (onStartDirectChat) onStartDirectChat(contact);
                      }}
                      className="p-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 transition-all font-bold"
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
                      title="Invite to ORBILINK"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
