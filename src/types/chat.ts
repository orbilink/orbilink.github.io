import { UserProfile } from './user';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'voice' | 'location' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'voice';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number;
  waveform?: number[];
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderColor?: string;
  text: string;
  type: MessageType;
  attachments?: Attachment[];
  status: MessageStatus;
  timestamp: number;
  editedAt?: number;
  isDeleted?: boolean;
  deletedFor?: string[]; // user IDs who deleted this message for themselves
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type?: MessageType;
    previewUrl?: string;
  };
  reactions?: Reaction[];
  isForwarded?: boolean;
  isStarred?: boolean;
  encrypted?: boolean;
  senderDeviceId?: string;
  recipientDeviceIds?: string[];
  ciphertext?: string;
  iv?: string;
  counter?: number;
  epoch?: number;
  aad?: string;
  encryptedKeyEnvelopes?: Record<string, string>; // recipientDeviceId -> wrappedKeyBase64
  encryptedMedia?: {
    encryptedData?: string;
    iv: string;
    mimeType: string;
    filename: string;
    size: number;
    isStorageUrl?: boolean;
  };
  isDecrypted?: boolean;
  decryptionError?: string;
}

export type ChatType = 'direct' | 'group';

export interface GroupMember {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  avatarColor?: string;
  role: 'admin' | 'member';
  joinedAt: number;
}

export interface Chat {
  id: string;
  type: ChatType;
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
  description?: string;
  participants: string[]; // user IDs
  participantProfiles?: Record<string, Partial<UserProfile>>;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    type: MessageType;
    status?: MessageStatus;
  };
  unreadCount: number;
  unreadCountMap?: Record<string, number>;
  isPinned: boolean;
  pinnedBy?: string[];
  isMuted: boolean;
  mutedBy?: string[];
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  // Group specific
  createdBy?: string;
  admins?: string[];
  members?: GroupMember[];
  // Typing state
  typingUsers?: string[]; // Array of user IDs currently typing
  typingMap?: Record<string, { displayName: string; timestamp: number }>;
}
