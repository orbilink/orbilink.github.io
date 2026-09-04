export type SymmetricAlgorithm = 'AES-GCM';
export type AsymmetricCurve = 'P-256';

export interface DevicePublicRecord {
  deviceId: string;
  deviceName: string;
  userId: string;
  identityKeyJwk: JsonWebKey;
  preKeyJwk: JsonWebKey;
  fingerprint: string;
  createdAt: number;
  lastSeen: number;
}

export interface LocalDeviceKeys {
  deviceId: string;
  deviceName: string;
  userId: string;
  identityPublicKey: CryptoKey;
  identityPrivateKey: CryptoKey;
  prePublicKey: CryptoKey;
  prePrivateKey: CryptoKey;
  fingerprint: string;
  createdAt: number;
}

export interface EncryptedPayload {
  ciphertext: string; // Base64 AES-GCM ciphertext + auth tag
  iv: string; // Base64 96-bit (12-byte) initialization vector
  algorithm: 'AES-256-GCM';
  senderDeviceId: string;
  recipientDeviceId?: string;
  counter: number;
  epoch: number;
  aad: string; // Base64-encoded Authenticated Additional Data
  version: 2;
  keyFingerprint?: string;
}

export interface EncryptedMediaPayload {
  encryptedData: string; // Base64 encoded encrypted media bytes or remote URL
  iv: string; // Base64 encoded initialization vector
  mimeType: string;
  filename: string;
  size: number;
  isStorageUrl?: boolean;
}

export interface IdentityKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyFingerprint: string;
}

export interface VerifiedContactRecord {
  userId: string;
  fingerprint: string;
  safetyNumberFormatted: string;
  isVerified: boolean;
  verifiedAt?: number;
  lastKnownKeyJwk?: JsonWebKey;
  keyChanged?: boolean;
}

export interface GroupSenderKeyEnvelope {
  senderDeviceId: string;
  recipientDeviceId: string;
  epoch: number;
  encryptedKey: string; // Base64 wrapped sender key
  iv: string;
}

export interface CryptoAuditEntry {
  property: string;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'NOT IMPLEMENTED' | 'NOT TESTED';
  evidence: string;
}
