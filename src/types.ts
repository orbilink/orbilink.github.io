export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  status?: string;
  isOnline?: boolean;
  lastSeen?: string;
  bio?: string;
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[]; // userIds
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'voice' | 'image' | 'file' | 'system' | 'ai';
  voiceDuration?: number; // in seconds
  voiceWaveform?: number[];
  mediaUrl?: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  isAiGenerated?: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  type: 'direct' | 'group' | 'channel' | 'ai';
  participants: User[];
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface GoogleContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  isOrbilinkUser?: boolean;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  iconUrl?: string;
  modifiedTime: string;
  thumbnailUrl?: string;
  webViewLink?: string;
}

export interface AiVoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  aiResponse: string;
  rmsLevel: number;
}
