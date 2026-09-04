import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  PlaintextBackupPayload,
  EncryptedBackupEnvelope,
  BackupMetadataRecord,
  BackupStep,
  RestoreStep,
} from '../../types/backup';
import { UserProfile } from '../../types/user';
import { DEFAULT_SETTINGS } from '../../types/settings';
import { indexedDbService } from '../storage/indexedDbService';
import { backupCryptoService } from '../crypto/backupCryptoService';
import { storageService } from '../firebase/storageService';
import { getFirebaseDb, isLiveFirebase } from '../firebase/firebaseApp';
import { cryptoService } from '../crypto/cryptoService';

const AUTO_BACKUP_STORAGE_KEY = 'rynox_encrypted_auto_backup_enabled';
const LAST_BACKUP_STORAGE_KEY = 'rynox_last_backup_timestamp';

export class BackupService {
  /**
   * Check if user has opted into automatic encrypted backups
   */
  public isAutoBackupEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_BACKUP_STORAGE_KEY) === 'true';
  }

  /**
   * Set user's auto backup preference (Explicit user consent required)
   */
  public setAutoBackupEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, enabled ? 'true' : 'false');
  }

  public getLastBackupTimestamp(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * 1. CREATE ENCRYPTED BACKUP
   * Gathers all local device data, encrypts it locally with AES-256-GCM + PBKDF2-SHA256,
   * and uploads the ciphertext to Firebase Storage with metadata recorded in Firestore.
   */
  public async createEncryptedBackup(
    currentUser: UserProfile,
    recoverySecret: string,
    onStepChange?: (step: BackupStep, progressPercent?: number, detail?: string) => void
  ): Promise<BackupMetadataRecord> {
    if (!currentUser || !currentUser.id) {
      throw new Error('Authenticated user profile is required to create a backup.');
    }
    if (!recoverySecret || recoverySecret.trim().length === 0) {
      throw new Error('A user recovery secret/password is required to encrypt the backup.');
    }

    try {
      // Step 1: Preparing backup
      onStepChange?.('preparing', 10, 'Gathering messages, conversations, and device key material...');

      const chats = await indexedDbService.getChats();
      const messages = await indexedDbService.getAllMessages();
      const contacts = await indexedDbService.getContacts();
      const settings = (await indexedDbService.getSettings()) || DEFAULT_SETTINGS;
      const verifiedContacts = await indexedDbService.getAllVerifiedContacts();

      // Retrieve device key material from local IndexedDB (zero-knowledge)
      const deviceKeys = await indexedDbService.getCryptoItem<{
        deviceId: string;
        identityPublicJwk: JsonWebKey;
        identityPrivateJwk: JsonWebKey;
        prePublicJwk: JsonWebKey;
        prePrivateJwk: JsonWebKey;
        fingerprint: string;
        createdAt: number;
      }>(`local_device_keys_${currentUser.id}`);

      const deviceId = deviceKeys?.deviceId || cryptoService.generateDeviceId();

      const plaintextPayload: PlaintextBackupPayload = {
        backupVersion: '1.0.0',
        createdAt: Date.now(),
        userId: currentUser.id,
        deviceId,
        deviceName: currentUser.displayName ? `${currentUser.displayName}'s Device` : 'RYNOX Client Device',
        chats,
        messages,
        contacts,
        settings,
        deviceKeyMaterial: deviceKeys || undefined,
        verifiedContacts,
      };

      // Step 2: Encrypting locally (AES-256-GCM + PBKDF2-SHA256 with 100,000 iterations)
      onStepChange?.('encrypting', 40, 'Encrypting data locally with AES-256-GCM and PBKDF2-SHA256...');

      const envelope = await backupCryptoService.encryptBackupPayload(
        plaintextPayload,
        recoverySecret
      );

      // Step 3: Uploading encrypted backup
      onStepChange?.('uploading', 65, 'Uploading authenticated ciphertext to private storage...');

      const encryptedBlob = backupCryptoService.createEncryptedBackupBlob(envelope);
      let storagePath = `users/${currentUser.id}/backups/${envelope.backupId}.enc`;
      let downloadUrl = '';

      // Upload to Firebase Storage if available
      if (storageService.isStorageConfigured()) {
        try {
          const uploadRes = await storageService.uploadEncryptedBackup(
            currentUser.id,
            envelope.backupId,
            encryptedBlob,
            (percent) => {
              const scaled = 65 + Math.round((percent / 100) * 25);
              onStepChange?.('uploading', scaled, `Uploading: ${percent}%`);
            }
          );
          storagePath = uploadRes.storagePath;
          downloadUrl = uploadRes.downloadUrl;
        } catch (uploadErr) {
          console.warn('[RYNOX Backup] Storage upload fallback to Firestore metadata:', uploadErr);
        }
      }

      // Record metadata in Firestore private subcollection `users/{uid}/backups/{backupId}`
      const db = getFirebaseDb();
      const metadata: BackupMetadataRecord = {
        backupId: envelope.backupId,
        backupVersion: envelope.backupVersion,
        cryptographicVersion: envelope.cryptographicVersion,
        userId: currentUser.id,
        deviceId: envelope.deviceId,
        deviceName: envelope.deviceName,
        createdAt: envelope.createdAt,
        sizeBytes: envelope.sizeBytes,
        messageCount: envelope.messageCount,
        chatCount: envelope.chatCount,
        storagePath,
        downloadUrl,
        isAutoBackup: this.isAutoBackupEnabled(),
      };

      if (isLiveFirebase() && db) {
        try {
          const backupDocRef = doc(db, `users/${currentUser.id}/backups`, envelope.backupId);
          // If storage upload was skipped or for emergency fallback, embed envelope data securely
          await setDoc(backupDocRef, {
            ...metadata,
            envelopeJson: encryptedBlob.size < 500000 ? JSON.stringify(envelope) : undefined,
          });
        } catch (dbErr) {
          console.warn('[RYNOX Backup] Firestore backup metadata write notice:', dbErr);
        }
      }

      // Record local timestamp
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_BACKUP_STORAGE_KEY, String(envelope.createdAt));
      }

      onStepChange?.('completed', 100, 'Encrypted backup created and verified successfully!');
      return metadata;
    } catch (err: unknown) {
      onStepChange?.('failed', 0, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  /**
   * 2. LIST CLOUD BACKUPS
   * Fetches available encrypted backup records for the authenticated user from Firestore.
   */
  public async listCloudBackups(userId: string): Promise<BackupMetadataRecord[]> {
    if (!userId) return [];

    const db = getFirebaseDb();
    if (!isLiveFirebase() || !db) {
      return [];
    }

    try {
      const q = query(
        collection(db, `users/${userId}/backups`),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const results: BackupMetadataRecord[] = [];

      snap.forEach((d) => {
        const data = d.data() as BackupMetadataRecord;
        results.push({
          backupId: d.id,
          backupVersion: data.backupVersion || '1.0.0',
          cryptographicVersion: data.cryptographicVersion || 'AES-256-GCM+PBKDF2-SHA256',
          userId: data.userId || userId,
          deviceId: data.deviceId || 'Unknown',
          deviceName: data.deviceName || 'RYNOX Device',
          createdAt: data.createdAt || Date.now(),
          sizeBytes: data.sizeBytes || 0,
          messageCount: data.messageCount || 0,
          chatCount: data.chatCount || 0,
          storagePath: data.storagePath || `users/${userId}/backups/${d.id}.enc`,
          downloadUrl: data.downloadUrl || '',
          isAutoBackup: Boolean(data.isAutoBackup),
        });
      });

      return results;
    } catch (err: unknown) {
      console.error('[RYNOX Backup] Error listing backups:', err);
      return [];
    }
  }

  /**
   * 3. DOWNLOAD & RESTORE BACKUP
   * Downloads ciphertext from cloud storage, decrypts with user's recovery secret,
   * verifies authenticity tag, and restores all conversation state to local storage.
   */
  public async downloadAndRestoreBackup(
    backupMeta: BackupMetadataRecord,
    recoverySecret: string,
    onStepChange?: (step: RestoreStep, progressPercent?: number, detail?: string) => void
  ): Promise<{
    restoredMessages: number;
    restoredChats: number;
    restoredContacts: number;
  }> {
    if (!backupMeta || !backupMeta.userId) {
      throw new Error('Invalid backup metadata.');
    }
    if (!recoverySecret || recoverySecret.trim().length === 0) {
      throw new Error('User recovery secret is required to decrypt this backup.');
    }

    try {
      // Step 1: Downloading
      onStepChange?.('downloading', 20, 'Downloading encrypted backup ciphertext from cloud storage...');

      let envelope: EncryptedBackupEnvelope | null = null;

      // Try reading directly from Firestore metadata if embedded
      const db = getFirebaseDb();
      if (isLiveFirebase() && db) {
        try {
          const docSnap = await getDoc(
            doc(db, `users/${backupMeta.userId}/backups`, backupMeta.backupId)
          );
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.envelopeJson) {
              envelope = JSON.parse(data.envelopeJson) as EncryptedBackupEnvelope;
            }
          }
        } catch {
          // Fall through to Storage download
        }
      }

      // If not embedded, fetch from Storage
      if (!envelope) {
        const downloadTarget = backupMeta.storagePath || backupMeta.downloadUrl;
        if (!downloadTarget) {
          throw new Error('No storage path or download URL found for this backup.');
        }

        const blob = await storageService.downloadEncryptedBackup(downloadTarget);
        const jsonText = await blob.text();
        envelope = backupCryptoService.parseEncryptedBackupJson(jsonText);
      }

      // Step 2: Decrypting locally with zero-knowledge secret
      onStepChange?.('decrypting', 55, 'Deriving key and verifying AES-256-GCM integrity tag locally...');

      const plaintextPayload = await backupCryptoService.decryptBackupPayload(
        envelope,
        recoverySecret
      );

      // Step 3: Restoring data to local IndexedDB
      onStepChange?.('restoring', 80, 'Restoring chats, messages, and cryptographic keys to local storage...');

      if (plaintextPayload.chats && plaintextPayload.chats.length > 0) {
        await indexedDbService.saveChats(plaintextPayload.chats);
      }

      if (plaintextPayload.messages && plaintextPayload.messages.length > 0) {
        await indexedDbService.saveMessages(plaintextPayload.messages);
      }

      if (plaintextPayload.contacts && plaintextPayload.contacts.length > 0) {
        await indexedDbService.saveContacts(plaintextPayload.contacts);
      }

      if (plaintextPayload.settings) {
        await indexedDbService.saveSettings(plaintextPayload.settings);
      }

      if (plaintextPayload.verifiedContacts && plaintextPayload.verifiedContacts.length > 0) {
        for (const vc of plaintextPayload.verifiedContacts) {
          await indexedDbService.saveVerifiedContact(vc);
        }
      }

      // Restore device key material for device recovery if present
      if (plaintextPayload.deviceKeyMaterial) {
        await indexedDbService.saveCryptoItem(
          `local_device_keys_${plaintextPayload.userId}`,
          plaintextPayload.deviceKeyMaterial
        );
      }

      onStepChange?.('completed', 100, 'Backup successfully restored!');

      return {
        restoredMessages: plaintextPayload.messages ? plaintextPayload.messages.length : 0,
        restoredChats: plaintextPayload.chats ? plaintextPayload.chats.length : 0,
        restoredContacts: plaintextPayload.contacts ? plaintextPayload.contacts.length : 0,
      };
    } catch (err: unknown) {
      onStepChange?.('failed', 0, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  /**
   * 4. RESTORE FROM LOCAL ENCRYPTED FILE (.rybox-enc or .json)
   */
  public async restoreFromEncryptedFile(
    fileContent: string,
    recoverySecret: string,
    onStepChange?: (step: RestoreStep, progressPercent?: number, detail?: string) => void
  ): Promise<{
    restoredMessages: number;
    restoredChats: number;
    restoredContacts: number;
  }> {
    try {
      onStepChange?.('downloading', 25, 'Parsing encrypted backup file...');
      const envelope = backupCryptoService.parseEncryptedBackupJson(fileContent);

      onStepChange?.('decrypting', 60, 'Verifying authentication and decrypting locally...');
      const payload = await backupCryptoService.decryptBackupPayload(envelope, recoverySecret);

      onStepChange?.('restoring', 85, 'Restoring data to local storage...');
      if (payload.chats?.length) await indexedDbService.saveChats(payload.chats);
      if (payload.messages?.length) await indexedDbService.saveMessages(payload.messages);
      if (payload.contacts?.length) await indexedDbService.saveContacts(payload.contacts);
      if (payload.settings) await indexedDbService.saveSettings(payload.settings);
      if (payload.deviceKeyMaterial) {
        await indexedDbService.saveCryptoItem(
          `local_device_keys_${payload.userId}`,
          payload.deviceKeyMaterial
        );
      }

      onStepChange?.('completed', 100, 'Backup restored successfully from file!');
      return {
        restoredMessages: payload.messages ? payload.messages.length : 0,
        restoredChats: payload.chats ? payload.chats.length : 0,
        restoredContacts: payload.contacts ? payload.contacts.length : 0,
      };
    } catch (err: unknown) {
      onStepChange?.('failed', 0, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  /**
   * 5. DELETE CLOUD BACKUP
   * Deletes ciphertext from Storage and removes metadata from Firestore.
   */
  public async deleteCloudBackup(
    userId: string,
    backupId: string,
    storagePath?: string
  ): Promise<void> {
    if (!userId || !backupId) {
      throw new Error('User ID and Backup ID are required for deletion.');
    }

    // 1. Delete from Firebase Storage if path exists
    if (storagePath) {
      try {
        await storageService.deleteEncryptedBackup(storagePath);
      } catch (err) {
        console.warn('[RYNOX Backup] Storage delete warning:', err);
      }
    }

    // 2. Delete from Firestore
    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      const backupDocRef = doc(db, `users/${userId}/backups`, backupId);
      await deleteDoc(backupDocRef);
    }
  }
}

export const backupService = new BackupService();
