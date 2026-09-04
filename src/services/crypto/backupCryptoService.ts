import {
  PlaintextBackupPayload,
  EncryptedBackupEnvelope,
  CryptographicBackupAlgorithm,
} from '../../types/backup';
import { cryptoService } from './cryptoService';

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTE_LENGTH = 32; // 256-bit random salt
const IV_BYTE_LENGTH = 12; // 96-bit AES-GCM IV

export class BackupCryptoService {
  /**
   * Derive a 256-bit AES-GCM key from a user-supplied recovery password / passphrase
   * using PBKDF2-HMAC-SHA256 with 100,000 iterations and a unique salt.
   */
  public async deriveBackupKey(
    password: string,
    salt: Uint8Array,
    iterations: number = PBKDF2_ITERATIONS
  ): Promise<CryptoKey> {
    if (!password || password.trim().length === 0) {
      throw new Error('Recovery secret / password is required.');
    }

    const subtle = cryptoService.ensureSubtle();
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password.normalize('NFKC'));

    // 1. Import raw passphrase as a key derivation base
    const baseKey = await subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // 2. Derive 256-bit AES-GCM key
    return await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable from memory
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts the entire plaintext backup payload locally on the user's device.
   * Generates a fresh 256-bit salt, fresh 96-bit IV, binds AAD, and applies AES-256-GCM.
   */
  public async encryptBackupPayload(
    payload: PlaintextBackupPayload,
    recoverySecret: string
  ): Promise<EncryptedBackupEnvelope> {
    const subtle = cryptoService.ensureSubtle();
    const backupId = `bkp_${Date.now()}_${cryptoService.generateDeviceId().substring(0, 8)}`;
    const createdAt = Date.now();

    // 1. Generate fresh random 256-bit salt and 96-bit IV
    const salt = new Uint8Array(SALT_BYTE_LENGTH);
    window.crypto.getRandomValues(salt);

    const iv = new Uint8Array(IV_BYTE_LENGTH);
    window.crypto.getRandomValues(iv);

    // 2. Derive AES-GCM key locally
    const aesKey = await this.deriveBackupKey(recoverySecret, salt, PBKDF2_ITERATIONS);

    // 3. Serialize payload and create bound AAD
    const jsonString = JSON.stringify(payload);
    const plaintextBytes = new TextEncoder().encode(jsonString);

    const aadString = `RYNOX-BACKUP-V1:${payload.userId}:${backupId}:${createdAt}`;
    const aadBytes = new TextEncoder().encode(aadString);

    // 4. Encrypt with AES-GCM (128-bit authentication tag appended automatically)
    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: aadBytes,
        tagLength: 128,
      },
      aesKey,
      plaintextBytes
    );

    const ciphertext = cryptoService.arrayBufferToBase64(ciphertextBuffer);
    const saltBase64 = cryptoService.arrayBufferToBase64(salt);
    const ivBase64 = cryptoService.arrayBufferToBase64(iv);
    const aadBase64 = cryptoService.arrayBufferToBase64(aadBytes);

    const envelope: EncryptedBackupEnvelope = {
      backupId,
      backupVersion: '1.0.0',
      cryptographicVersion: 'AES-256-GCM+PBKDF2-SHA256',
      userId: payload.userId,
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      createdAt,
      salt: saltBase64,
      iv: ivBase64,
      iterations: PBKDF2_ITERATIONS,
      aad: aadBase64,
      ciphertext,
      sizeBytes: ciphertextBuffer.byteLength,
      messageCount: payload.messages ? payload.messages.length : 0,
      chatCount: payload.chats ? payload.chats.length : 0,
    };

    return envelope;
  }

  /**
   * Decrypts an encrypted backup envelope locally using the user's recovery secret.
   * Enforces integrity verification: wrong secret or modified ciphertext will reject safely.
   */
  public async decryptBackupPayload(
    envelope: EncryptedBackupEnvelope,
    recoverySecret: string
  ): Promise<PlaintextBackupPayload> {
    if (!envelope || !envelope.ciphertext || !envelope.salt || !envelope.iv) {
      throw new Error('Invalid or corrupted backup envelope.');
    }

    const subtle = cryptoService.ensureSubtle();

    // 1. Decode salt, IV, AAD, and ciphertext
    const salt = new Uint8Array(cryptoService.base64ToArrayBuffer(envelope.salt));
    const iv = new Uint8Array(cryptoService.base64ToArrayBuffer(envelope.iv));
    const aadBytes = envelope.aad
      ? new Uint8Array(cryptoService.base64ToArrayBuffer(envelope.aad))
      : undefined;
    const ciphertextBuffer = cryptoService.base64ToArrayBuffer(envelope.ciphertext);

    // 2. Derive the key using the envelope's iteration count and salt
    const iterations = envelope.iterations || PBKDF2_ITERATIONS;
    const aesKey = await this.deriveBackupKey(recoverySecret, salt, iterations);

    // 3. Attempt authenticated AES-GCM decryption
    try {
      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: aadBytes,
          tagLength: 128,
        },
        aesKey,
        ciphertextBuffer
      );

      const jsonString = new TextDecoder().decode(decryptedBuffer);
      const parsed = JSON.parse(jsonString) as PlaintextBackupPayload;

      // Basic payload structure validation
      if (!parsed || !Array.isArray(parsed.chats) || !Array.isArray(parsed.messages)) {
        throw new Error('Backup payload structure verification failed.');
      }

      return parsed;
    } catch (err: unknown) {
      // Any error during subtle.decrypt represents an authentication tag mismatch
      // (wrong password, altered ciphertext, or corrupted bytes)
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('structure verification')) {
        throw new Error('Backup payload structure verification failed.');
      }
      throw new Error(
        'Unable to decrypt backup. The recovery password or passphrase is incorrect, or the backup data has been tampered with.'
      );
    }
  }

  /**
   * Generates a downloadable `.rybox-enc` zero-knowledge backup file
   */
  public createEncryptedBackupBlob(envelope: EncryptedBackupEnvelope): Blob {
    const json = JSON.stringify(envelope, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Parses an imported `.rybox-enc` or JSON backup file
   */
  public parseEncryptedBackupJson(jsonString: string): EncryptedBackupEnvelope {
    try {
      const envelope = JSON.parse(jsonString) as EncryptedBackupEnvelope;
      if (
        !envelope.ciphertext ||
        !envelope.salt ||
        !envelope.iv ||
        !envelope.backupId ||
        !envelope.userId
      ) {
        throw new Error('File does not match the RYNOX encrypted backup format.');
      }
      return envelope;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON file';
      throw new Error(`Failed to parse backup file: ${msg}`);
    }
  }
}

export const backupCryptoService = new BackupCryptoService();
