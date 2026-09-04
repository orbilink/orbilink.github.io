import React, { useState } from 'react';
import {
  X,
  Sliders,
  Moon,
  Sun,
  Volume2,
  Database,
  Shield,
  Trash2,
  Download,
  Command,
  Info,
  LogOut,
} from 'lucide-react';
import { AppSettings } from '../types/settings';
import { UserProfile } from '../types/user';
import { useTheme } from '../hooks/useTheme';
import { toast } from '../components/ToastContainer';
import { soundEffects } from '../services/sound/soundEffects';
import { notificationService } from '../services/notifications/notificationService';
import { indexedDbService } from '../services/storage/indexedDbService';
import { FirebaseDiagnosticBanner } from '../components/FirebaseDiagnosticBanner';

export interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  currentUser?: UserProfile;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenKeyboardShortcuts: () => void;
  onLogout?: () => void;
  onClose: () => void;
  onDataRestored?: () => void;
}

type TabType = 'general' | 'notifications' | 'privacy' | 'storage' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  currentUser,
  onUpdateSettings,
  onOpenKeyboardShortcuts,
  onLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const handleClearCache = async () => {
    try {
      await indexedDbService.clearAll();
      toast.show('Offline cache cleared successfully', 'success');
    } catch {
      toast.show('Failed to clear cache', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const chats = await indexedDbService.getChats();
      const messages = await indexedDbService.getAllMessages();
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        chats,
        messages,
        settings,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rynox_chat_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show('Chat history export generated', 'info');
    } catch {
      toast.show('Failed to export data', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-56 bg-neutral-950 p-4 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-row md:flex-col justify-between">
          <div className="space-y-1 w-full flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold w-full transition-colors ${
                activeTab === 'general'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold w-full transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>Notifications</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold w-full transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Privacy</span>
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold w-full transition-colors ${
                activeTab === 'storage'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Storage & Data</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold w-full transition-colors ${
                activeTab === 'about'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </button>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 space-y-1">
            <button
              onClick={onOpenKeyboardShortcuts}
              className="hidden md:flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 px-3 py-2 rounded-xl hover:bg-neutral-900 w-full transition-colors"
            >
              <Command className="w-4 h-4 text-emerald-400" />
              <span>Shortcuts</span>
            </button>

            {onLogout && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-2 text-xs text-rose-400 hover:text-rose-200 px-3 py-2 rounded-xl hover:bg-rose-950/30 w-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-900">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-100 capitalize">
              {activeTab} Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-neutral-300">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Theme</span>
                    <span className="text-[11px] text-neutral-400">
                      Switch between dark and light appearance
                    </span>
                  </div>
                  <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors ${
                        theme === 'light'
                          ? 'bg-neutral-800 text-emerald-400 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-1.5 rounded-lg flex items-center gap-1 text-xs transition-colors ${
                        theme === 'dark'
                          ? 'bg-neutral-800 text-emerald-400 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Reduced Motion</span>
                    <span className="text-[11px] text-neutral-400">
                      Minimize transition effects and UI animations
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Media Auto-Download</span>
                    <span className="text-[11px] text-neutral-400">
                      Automatically load images and voice recordings
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoDownloadMedia}
                    onChange={(e) => onUpdateSettings({ autoDownloadMedia: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Sound Effects</span>
                    <span className="text-[11px] text-neutral-400">
                      Play audio cues for sent, received, and call events
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => {
                      onUpdateSettings({ soundEnabled: e.target.checked });
                      soundEffects.setEnabled(e.target.checked);
                    }}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Desktop Notifications</span>
                    <span className="text-[11px] text-neutral-400">
                      Display push alerts when you receive a message in background
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const permission = await notificationService.requestPermission();
                      const isGranted = permission === 'granted';
                      onUpdateSettings({ messageNotifications: isGranted });
                      if (isGranted) {
                        toast.show('Browser notifications enabled', 'success');
                      } else {
                        toast.show('Notification permission not granted', 'info');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition-colors ${
                      settings.messageNotifications
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                    }`}
                  >
                    {settings.messageNotifications ? 'Enabled' : 'Enable'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Incoming Call Alerts</span>
                    <span className="text-[11px] text-neutral-400">
                      Receive full-screen notifications for voice and video calls
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.callNotifications !== false}
                    onChange={(e) => onUpdateSettings({ callNotifications: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Read Receipts (Blue Ticks)</span>
                    <span className="text-[11px] text-neutral-400">
                      Let contacts know when you have read their messages
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.readReceipts}
                    onChange={(e) => onUpdateSettings({ readReceipts: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-2xl">
                  <div>
                    <span className="font-semibold text-neutral-200 block">Online Presence Indicator</span>
                    <span className="text-[11px] text-neutral-400">
                      Broadcast real-time online status and typing activity
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.typingIndicator}
                    onChange={(e) => onUpdateSettings({ typingIndicator: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700"
                  />
                </div>
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <FirebaseDiagnosticBanner />

                <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-neutral-200 font-semibold">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>IndexedDB Local Storage</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Messages, conversation states, and media metadata are cached in browser IndexedDB for instant offline-first availability.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleClearCache}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-rose-400 border border-neutral-800 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Cache</span>
                    </button>

                    <button
                      onClick={handleExportBackup}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Chat JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-3">
                <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-2">
                  <span className="font-bold text-neutral-100 text-sm block">RYNOX Real-Time Messenger</span>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    RYNOX is a complete, real-time messaging application powered by Firebase Authentication, Cloud Firestore, Firebase Cloud Storage, and WebRTC audio/video calling.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Version 1.0.0 • Connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
