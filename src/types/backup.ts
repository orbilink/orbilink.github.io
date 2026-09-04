import { Chat, Message } from './chat';
import { AppSettings } from './settings';
import { Contact } from './user';
import { VerifiedContactRecord } from './crypto';

export type CryptographicBackupAlgorithm = 'AES-256-GCM+PBKDF2-SHA256';

export interface PlaintextBackupPayload {
  backupVersion: '1.0.0';
  createdAt: number;
  userId: string;
  deviceId: string;
  deviceName?: string;
  chats: Chat[];
  messages: Message[];
  contacts: Contact[];
  settings: AppSettings;
  deviceKeyMaterial?: {
    deviceId: string;
    identityPublicJwk: JsonWebKey;
    identityPrivateJwk: JsonWebKey;
    prePublicJwk: JsonWebKey;
    prePrivateJwk: JsonWebKey;
    fingerprint: string;
    createdAt: number;
  };
  verifiedContacts?: VerifiedContactRecord[];
}

export interface EncryptedBackupEnvelope {
  backupId: string;
  backupVersion: '1.0.0';
  cryptographicVersion: CryptographicBackupAlgorithm;
  userId: string;
  deviceId: string;
  deviceName?: string;
  createdAt: number;
  salt: string; // Base64 256-bit salt
  iv: string; // Base64 96-bit IV
  iterations: number; // 100,000 PBKDF2 iterations
  aad: string; // Base64 Additional Authenticated Data
  ciphertext: string; // Base64 AES-256-GCM ciphertext with 128-bit authentication tag
  sizeBytes: number;
  messageCount: number;
  chatCount: number;
}

export interface BackupMetadataRecord {
  backupId: string;
  backupVersion: string;
  cryptographicVersion: CryptographicBackupAlgorithm;
  userId: string;
  deviceId: string;
  deviceName?: string;
  createdAt: number;
  sizeBytes: number;
  messageCount: number;
  chatCount: number;
  storagePath: string;
  downloadUrl?: string;
  isAutoBackup?: boolean;
}

export type BackupStep =
  | 'idle'
  | 'preparing'
  | 'encrypting'
  | 'uploading'
  | 'completed'
  | 'failed';

export type RestoreStep =
  | 'idle'
  | 'downloading'
  | 'decrypting'
  | 'restoring'
  | 'completed'
  | 'failed';
