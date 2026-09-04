import React, { useState } from 'react';
import { HardDrive, X, Search, File, FileText, Check } from 'lucide-react';
import { GoogleDriveFile } from '../../types';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  files?: GoogleDriveFile[];
  onClose: () => void;
  onSelectFile: (file: GoogleDriveFile) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  files = [],
  onClose,
  onSelectFile
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    const file = files.find((f) => f.id === selectedId);
    if (file) {
      onSelectFile(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#25D366]" />
            <h3 className="text-sm font-bold text-white">Google Drive File Picker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Drive documents..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
          />
        </div>

        {/* File items list */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((file) => {
            const isSelected = selectedId === file.id;
            return (
              <div
                key={file.id}
                onClick={() => setSelectedId(file.id)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-emerald-600/20 border-[#25D366] text-white'
                    : 'bg-zinc-950/60 border-white/5 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-[#25D366] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{file.name}</p>
                    <p className="text-[10px] text-zinc-500">{file.size} • {file.modifiedTime}</p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#25D366] shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebd5d] disabled:opacity-50 text-black text-xs font-bold shadow-md"
          >
            Attach File
          </button>
        </div>

      </div>
    </div>
  );
};
