import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Enter', action: 'Send message' },
    { key: 'Shift + Enter', action: 'New line in composer' },
    { key: 'Cmd/Ctrl + K', action: 'Quick search / Jump to chat' },
    { key: 'Cmd/Ctrl + /', action: 'Open keyboard shortcuts' },
    { key: 'Escape', action: 'Close modal / Clear selection / Back' },
    { key: 'Cmd/Ctrl + E', action: 'Toggle emoji picker' },
    { key: 'Cmd/Ctrl + U', action: 'Attach media / file' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">Keyboard Shortcuts</h3>
              <p className="text-xs text-neutral-400">Boost your workflow in Vault Mesh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-800/80">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-neutral-300">{s.action}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-medium text-emerald-300 bg-neutral-950 border border-neutral-800 rounded-lg shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
