export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  avatarUrl?: string;
  avatarColor?: string;
  about: string;
  phone?: string;
  isOnline: boolean;
  lastSeen: number;
  customStatus?: string;
  createdAt: number;
  updatedAt: number;
  publicKeyFingerprint?: string;
}

export interface Contact {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  avatarColor: string;
  about: string;
  isOnline: boolean;
  lastSeen: number;
  phone?: string;
}
