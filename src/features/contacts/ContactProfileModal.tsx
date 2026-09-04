import React from 'react';
import { X, MessageSquare, Phone, Video, Shield, UserPlus, UserCheck, Trash2 } from 'lucide-react';
import { Contact, UserProfile } from '../../types/user';
import { CallType } from '../../types/call';
import { getInitials } from '../../utils/mediaUtils';
import { formatLastSeen } from '../../utils/formatters';
import { firestoreService } from '../../services/firebase/firestoreService';
import { toast } from '../../components/ToastContainer';

interface ContactProfileModalProps {
  contact: Contact | null;
  currentUser?: UserProfile | null;
  onStartChat: (contact: Contact) => void;
  onStartCall?: (
    peer: { id: string; displayName: string; username: string; avatarUrl?: string; avatarColor?: string },
    type: CallType
  ) => void;
  onClose: () => void;
}

export const ContactProfileModal: React.FC<ContactProfileModalProps> = ({
  contact,
  currentUser,
  onStartChat,
  onStartCall,
  onClose,
}) => {
  if (!contact) return null;

  const isSavedContact = firestoreService.isContact(contact.userId);

  const handleToggleContact = async () => {
    if (!currentUser) return;
    try {
      if (isSavedContact) {
        await firestoreService.removeContact(currentUser.id, contact.userId);
        toast.show(`Removed ${contact.displayName} from contacts`, 'info');
      } else {
        await firestoreService.addContact(currentUser.id, contact);
        toast.show(`Added ${contact.displayName} to contacts`, 'success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      toast.show(msg, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Header & Close */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">User Profile</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar & Main Info */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${
                contact.avatarColor || 'from-emerald-500 to-teal-700'
              } flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-emerald-950/20`}
            >
              {getInitials(contact.displayName)}
            </div>
            {contact.isOnline && (
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-neutral-900" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-neutral-100">{contact.displayName}</h3>
            <p className="text-xs font-mono text-emerald-400">@{contact.username}</p>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-4 space-y-3 text-xs">
          <div>
            <span className="text-neutral-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
              About
            </span>
            <p className="text-neutral-200 leading-relaxed">{contact.about || 'ORBILINK verified account'}</p>
          </div>

          <div className="h-px bg-neutral-800" />

          <div className="flex justify-between items-center">
            <span className="text-neutral-500">Status</span>
            <span className="font-semibold text-neutral-300">
              {contact.isOnline ? 'Online' : formatLastSeen(contact.lastSeen)}
            </span>
          </div>

          {contact.phone && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Phone</span>
              <span className="font-mono text-neutral-300">{contact.phone}</span>
            </div>
          )}
        </div>

        {/* Quick Call Row */}
        {onStartCall && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onStartCall(
                  {
                    id: contact.userId,
                    displayName: contact.displayName,
                    username: contact.username,
                    avatarUrl: contact.avatarUrl,
                    avatarColor: contact.avatarColor,
                  },
                  'voice'
                );
                onClose();
              }}
              className="py-2.5 px-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-emerald-400 hover:text-emerald-300 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Voice Call</span>
            </button>

            <button
              onClick={() => {
                onStartCall(
                  {
                    id: contact.userId,
                    displayName: contact.displayName,
                    username: contact.username,
                    avatarUrl: contact.avatarUrl,
                    avatarColor: contact.avatarColor,
                  },
                  'video'
                );
                onClose();
              }}
              className="py-2.5 px-3 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-teal-400 hover:text-teal-300 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Call</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onStartChat(contact);
              onClose();
            }}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send Direct Message</span>
          </button>

          {currentUser && currentUser.id !== contact.userId && (
            <button
              onClick={handleToggleContact}
              className={`w-full py-2.5 px-4 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 border ${
                isSavedContact
                  ? 'bg-neutral-950 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 border-neutral-800 hover:border-rose-800/40'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-emerald-400 border-neutral-800'
              }`}
            >
              {isSavedContact ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Contacts</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save to Contacts</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
