import React, { useState } from 'react';
import { X, Users, Check, Sparkles } from 'lucide-react';
import { Contact, UserProfile } from '../../types/user';
import { getInitials, AVATAR_PALETTES } from '../../utils/mediaUtils';
import { toast } from '../../components/ToastContainer';

interface CreateGroupModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentUser: UserProfile;
  onCreateGroup: (name: string, description: string, members: Contact[], color: string) => void;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  contacts,
  currentUser,
  onCreateGroup,
  onClose,
}) => {
  const [groupName, setGroupName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_PALETTES[0]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      toast.show('Please enter a group name', 'error');
      return;
    }

    const selectedMembers = contacts.filter((c) => selectedContactIds.includes(c.id));
    onCreateGroup(trimmed, description.trim(), selectedMembers, selectedColor);
    toast.show(`Group "${trimmed}" created`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-100">Create New Group</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Avatar & Name Input */}
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedColor} flex items-center justify-center text-white flex-shrink-0 shadow-md`}
            >
              <Users className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder="Group Subject / Name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-sm font-semibold text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Color Palettes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
              Avatar Color Theme
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {AVATAR_PALETTES.map((pal, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedColor(pal)}
                  className={`w-7 h-7 rounded-xl bg-gradient-to-br ${pal} flex items-center justify-center flex-shrink-0 transition-transform ${
                    selectedColor === pal ? 'ring-2 ring-emerald-400 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {selectedColor === pal && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Select Members */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              <span>Select Members</span>
              <span className="text-emerald-400">{selectedContactIds.length} chosen</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {contacts.map((contact) => {
                const isSelected = selectedContactIds.includes(contact.id);
                return (
                  <div
                    key={contact.id}
                    onClick={() => toggleSelect(contact.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-neutral-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                          contact.avatarColor || 'from-emerald-500 to-teal-700'
                        } flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}
                      >
                        {getInitials(contact.displayName)}
                      </div>
                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {contact.displayName}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-2 bg-neutral-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};
