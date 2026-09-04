export type ThemeMode = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  // Appearance
  theme: ThemeMode;
  fontSize: FontSize;
  chatWallpaper: 'mesh-dark' | 'midnight' | 'emerald-subtle' | 'slate' | 'custom';
  reducedMotion: boolean;

  // Notifications
  messageNotifications: boolean;
  groupNotifications: boolean;
  callNotifications: boolean;
  soundEnabled: boolean;
  messagePreview: boolean;
  notificationsEnabled?: boolean; // legacy alias for messageNotifications

  // Privacy
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  readReceipts: boolean;
  typingIndicator: boolean;
  onlineStatusVisibility: 'everyone' | 'contacts' | 'nobody';

  // Storage
  autoDownloadMedia: boolean;
  maxCacheSizeMb: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  fontSize: 'medium',
  chatWallpaper: 'mesh-dark',
  reducedMotion: false,
  messageNotifications: true,
  groupNotifications: true,
  callNotifications: true,
  soundEnabled: true,
  messagePreview: true,
  lastSeenVisibility: 'everyone',
  readReceipts: true,
  typingIndicator: true,
  onlineStatusVisibility: 'everyone',
  autoDownloadMedia: true,
  maxCacheSizeMb: 500,
};
