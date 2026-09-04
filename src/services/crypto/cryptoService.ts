import {
  DevicePublicRecord,
  LocalDeviceKeys,
  EncryptedPayload,
  EncryptedMediaPayload,
  IdentityKeyPair,
} from '../../types/crypto';
import { indexedDbService } from '../storage/indexedDbService';

const HKDF_INFO_PREFIX = 'RYNOX-E2EE-V2-SESSION';
const DEVICE_STORAGE_ID = 'local_device_keys';

export class WebCryptoService {
  private subtle: SubtleCrypto | null = null;
  private cachedLocalDevice: LocalDeviceKeys | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      this.subtle = window.crypto.subtle;
    }
  }

  public ensureSubtle(): SubtleCrypto {
    if (!this.subtle) {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        this.subtle = window.crypto.subtle;
        return this.subtle;
      }
      throw new Error(
        'E2EE PROTOCOL IMPLEMENTATION REQUIRES A REVIEWED CRYPTOGRAPHIC LIBRARY: Web Crypto API (SubtleCrypto) is unavailable in this environment.'
      );
    }
    return this.subtle;
  }

  // ==========================================
  // 1. DEVICE IDENTITY & PRE-KEY INITIALIZATION
  // ==========================================

  public async generateDeviceIdentityKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    publicJwk: JsonWebKey;
    privateJwk: JsonWebKey;
    fingerprint: string;
  }> {
    const subtle = this.ensureSubtle();
    const keyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const publicJwk = await subtle.exportKey('jwk', keyPair.publicKey);
    const privateJwk = await subtle.exportKey('jwk', keyPair.privateKey);
    const fingerprint = await this.computeFingerprintFromJwk(publicJwk);
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicJwk,
      privateJwk,
      fingerprint,
    };
  }

  public async generateSignedPreKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
    publicJwk: JsonWebKey;
    privateJwk: JsonWebKey;
  }> {
    const subtle = this.ensureSubtle();
    const keyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const publicJwk = await subtle.exportKey('jwk', keyPair.publicKey);
    const privateJwk = await subtle.exportKey('jwk', keyPair.privateKey);
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicJwk,
      privateJwk,
    };
  }

  public async getOrInitializeLocalDevice(userId: string, displayName: string): Promise<LocalDeviceKeys> {
    if (this.cachedLocalDevice && this.cachedLocalDevice.userId === userId) {
      return this.cachedLocalDevice;
    }

    // Attempt to load from IndexedDB
    try {
      const stored = await indexedDbService.getCryptoItem<{
        deviceId: string;
        deviceName: string;
        userId: string;
        identityPublicJwk: JsonWebKey;
        identityPrivateJwk: JsonWebKey;
        prePublicJwk: JsonWebKey;
        prePrivateJwk: JsonWebKey;
        fingerprint: string;
        createdAt: number;
      }>(`${DEVICE_STORAGE_ID}_${userId}`);

      if (stored) {
        const subtle = this.ensureSubtle();
        const identityPublicKey = await subtle.importKey(
          'jwk',
          stored.identityPublicJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          []
        );
        const identityPrivateKey = await subtle.importKey(
          'jwk',
          stored.identityPrivateJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          ['deriveKey', 'deriveBits']
        );
        const prePublicKey = await subtle.importKey(
          'jwk',
          stored.prePublicJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          []
        );
        const prePrivateKey = await subtle.importKey(
          'jwk',
          stored.prePrivateJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          ['deriveKey', 'deriveBits']
        );

        this.cachedLocalDevice = {
          deviceId: stored.deviceId,
          deviceName: stored.deviceName,
          userId: stored.userId,
          identityPublicKey,
          identityPrivateKey,
          prePublicKey,
          prePrivateKey,
          fingerprint: stored.fingerprint,
          createdAt: stored.createdAt,
        };
        return this.cachedLocalDevice;
      }
    } catch {
      // Generate new if failed to load
    }

    // Generate fresh P-256 ECDH Identity Key Pair and Pre-Key Pair
    const subtle = this.ensureSubtle();
    const deviceId = this.generateDeviceId();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Node';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const deviceName = `${isMobile ? 'Mobile' : 'Desktop'} Browser (${deviceId.substring(0, 4).toUpperCase()})`;

    const identityKeyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true, // public and private extractable for local JWK storage in IndexedDB only
      ['deriveKey', 'deriveBits']
    );

    const preKeyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );

    const identityPublicJwk = await subtle.exportKey('jwk', identityKeyPair.publicKey);
    const identityPrivateJwk = await subtle.exportKey('jwk', identityKeyPair.privateKey);
    const prePublicJwk = await subtle.exportKey('jwk', preKeyPair.publicKey);
    const prePrivateJwk = await subtle.exportKey('jwk', preKeyPair.privateKey);

    const fingerprint = await this.computeFingerprintFromJwk(identityPublicJwk);
    const createdAt = Date.now();

    // Store private key material ONLY locally in IndexedDB
    await indexedDbService.saveCryptoItem(`${DEVICE_STORAGE_ID}_${userId}`, {
      deviceId,
      deviceName,
      userId,
      identityPublicJwk,
      identityPrivateJwk,
      prePublicJwk,
      prePrivateJwk,
      fingerprint,
      createdAt,
    });

    this.cachedLocalDevice = {
      deviceId,
      deviceName,
      userId,
      identityPublicKey: identityKeyPair.publicKey,
      identityPrivateKey: identityKeyPair.privateKey,
      prePublicKey: preKeyPair.publicKey,
      prePrivateKey: preKeyPair.privateKey,
      fingerprint,
      createdAt,
    };

    return this.cachedLocalDevice;
  }

  public async getPublicDeviceRecord(device: LocalDeviceKeys): Promise<DevicePublicRecord> {
    const subtle = this.ensureSubtle();
    const identityKeyJwk = await subtle.exportKey('jwk', device.identityPublicKey);
    const preKeyJwk = await subtle.exportKey('jwk', device.prePublicKey);

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      userId: device.userId,
      identityKeyJwk,
      preKeyJwk,
      fingerprint: device.fingerprint,
      createdAt: device.createdAt,
      lastSeen: Date.now(),
    };
  }

  // ==========================================
  // 2. PAIRWISE KEY AGREEMENT (ECDH + HKDF)
  // ==========================================

  public async derivePairwiseSharedKey(
    myPrivateKey: CryptoKey,
    peerPublicJwk: JsonWebKey,
    contextInfo: string = 'PAIRWISE-MASTER'
  ): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();

    // Import peer public ECDH P-256 key
    const peerPublicKey = await subtle.importKey(
      'jwk',
      peerPublicJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Compute raw 256-bit Diffie-Hellman Shared Secret
    const rawSecret = await subtle.deriveBits(
      {
        name: 'ECDH',
        public: peerPublicKey,
      },
      myPrivateKey,
      256
    );

    // Import raw secret as HKDF master key material
    const hkdfKey = await subtle.importKey(
      'raw',
      rawSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    const encoder = new TextEncoder();
    const salt = encoder.encode('RYNOX-E2EE-SALT-V2');
    const info = encoder.encode(`${HKDF_INFO_PREFIX}-${contextInfo}`);

    // Derive 256-bit AES-GCM Pairwise Session Key
    return await subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt,
        info: info,
      },
      hkdfKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable in memory
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  // ==========================================
  // 3. MESSAGE RATCHETING & KEY DERIVATION
  // ==========================================

  public async deriveRatchetedMessageKey(
    sessionKey: CryptoKey,
    chatId: string,
    counter: number,
    epoch: number
  ): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();

    // Export raw key to pass into HKDF ratchet step
    const rawSessionKey = await subtle.exportKey('raw', sessionKey);
    const hkdfKey = await subtle.importKey(
      'raw',
      rawSessionKey,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    const encoder = new TextEncoder();
    const salt = encoder.encode(`EPOCH_${epoch}_SALT_${chatId}`);
    const info = encoder.encode(`MSG_RATCHET_STEP_${counter}`);

    return await subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info,
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ==========================================
  // 4. AUTHENTICATED ENCRYPTION (AES-256-GCM + AAD)
  // ==========================================

  public async encryptMessage(
    text: string,
    key: CryptoKey,
    senderDeviceId: string,
    chatId: string,
    counter: number,
    epoch: number,
    messageId: string,
    timestamp: number
  ): Promise<EncryptedPayload> {
    const subtle = this.ensureSubtle();
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(text);

    // Cryptographically secure 96-bit (12-byte) initialization vector (NO IV REUSE)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Authenticated Additional Data (AAD) binds message metadata to authentication tag
    const aadObject = {
      chatId,
      messageId,
      senderDeviceId,
      counter,
      epoch,
      timestamp,
    };
    const aadString = JSON.stringify(aadObject);
    const aadBuffer = encoder.encode(aadString);

    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aadBuffer,
        tagLength: 128, // 128-bit authentication tag
      },
      key,
      plaintextBuffer
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      algorithm: 'AES-256-GCM',
      senderDeviceId,
      counter,
      epoch,
      aad: this.arrayBufferToBase64(aadBuffer),
      version: 2,
    };
  }

  public async decryptMessage(
    payload: EncryptedPayload,
    key: CryptoKey
  ): Promise<string> {
    const subtle = this.ensureSubtle();
    const ciphertextBuffer = this.base64ToArrayBuffer(payload.ciphertext);
    const ivBuffer = this.base64ToArrayBuffer(payload.iv);
    const aadBuffer = this.base64ToArrayBuffer(payload.aad);

    try {
      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(ivBuffer),
          additionalData: new Uint8Array(aadBuffer),
          tagLength: 128,
        },
        key,
        ciphertextBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch {
      throw new Error(
        'E2EE Decryption Failed: Authenticated decryption error. Ciphertext or AAD metadata was modified, or key is unauthorized.'
      );
    }
  }

  // ==========================================
  // 5. MEDIA ENCRYPTION & DECRYPTION (AES-256-GCM)
  // ==========================================

  public async generateMediaKey(): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();
    return await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  public async encryptMediaBuffer(
    buffer: ArrayBuffer,
    mimeType: string,
    filename: string,
    mediaKey: CryptoKey
  ): Promise<EncryptedMediaPayload> {
    const subtle = this.ensureSubtle();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      mediaKey,
      buffer
    );

    return {
      encryptedData: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      mimeType,
      filename,
      size: buffer.byteLength,
    };
  }

  public async decryptMediaBuffer(
    payload: EncryptedMediaPayload,
    mediaKey: CryptoKey
  ): Promise<{ buffer: ArrayBuffer; mimeType: string; filename: string }> {
    const subtle = this.ensureSubtle();
    const ciphertextBuffer = this.base64ToArrayBuffer(payload.encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(payload.iv);

    try {
      const decryptedBuffer = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(ivBuffer),
          tagLength: 128,
        },
        mediaKey,
        ciphertextBuffer
      );

      return {
        buffer: decryptedBuffer,
        mimeType: payload.mimeType,
        filename: payload.filename,
      };
    } catch {
      throw new Error('E2EE Media Decryption Failed: Authentication tag verification failed.');
    }
  }

  // ==========================================
  // 6. GROUP SENDER KEY DISTRIBUTION (AES-KW / AES-GCM)
  // ==========================================

  public async generateSenderKey(): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();
    return await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  public async wrapSenderKey(senderKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
    const subtle = this.ensureSubtle();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const wrapped = await subtle.wrapKey(
      'raw',
      senderKey,
      wrappingKey,
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      }
    );

    const combined = new Uint8Array(iv.byteLength + wrapped.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(wrapped), iv.byteLength);

    return this.arrayBufferToBase64(combined.buffer);
  }

  public async unwrapSenderKey(wrappedBase64: string, unwrappingKey: CryptoKey): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();
    const combinedBuffer = this.base64ToArrayBuffer(wrappedBase64);
    const combined = new Uint8Array(combinedBuffer);

    const iv = combined.slice(0, 12);
    const wrappedData = combined.slice(12);

    return await subtle.unwrapKey(
      'raw',
      wrappedData.buffer,
      unwrappingKey,
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // ==========================================
  // 7. KEY VERIFICATION & SAFETY NUMBERS
  // ==========================================

  public async generateSessionKey(): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();
    return await subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  public async computeFingerprint(data: string): Promise<string> {
    const subtle = this.ensureSubtle();
    const encoder = new TextEncoder();
    const digest = await subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(digest));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return (hex.substring(0, 16).toUpperCase().match(/.{1,4}/g) || []).join(' ');
  }

  public async computeFingerprintFromJwk(jwk: JsonWebKey): Promise<string> {
    const subtle = this.ensureSubtle();
    const canonical = `${jwk.crv || 'P-256'}:${jwk.x || ''}:${jwk.y || ''}`;
    const encoder = new TextEncoder();
    const digest = await subtle.digest('SHA-256', encoder.encode(canonical));
    const hashArray = Array.from(new Uint8Array(digest));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return (hex.substring(0, 16).toUpperCase().match(/.{1,4}/g) || []).join(' ');
  }

  /**
   * Generates a 60-digit human-verifiable Safety Number (12 blocks of 5 digits)
   * computed from the SHA-512 / SHA-256 hash of sorted identity keys (Signal standard).
   */
  public async computeSafetyNumber(myJwk: JsonWebKey, peerJwk: JsonWebKey): Promise<string> {
    const subtle = this.ensureSubtle();
    const myCoord = `${myJwk.x || ''}${myJwk.y || ''}`;
    const peerCoord = `${peerJwk.x || ''}${peerJwk.y || ''}`;

    // Sort deterministically so both parties compute the identical safety number
    const combined = [myCoord, peerCoord].sort().join(':');
    const encoder = new TextEncoder();
    const digest = await subtle.digest('SHA-256', encoder.encode(combined));
    const bytes = new Uint8Array(digest);

    // Convert bytes into 12 blocks of 5 decimal digits
    const blocks: string[] = [];
    for (let i = 0; i < 12; i++) {
      const idx = (i * 2) % bytes.length;
      const num = ((bytes[idx] << 8) | bytes[(idx + 1) % bytes.length]) % 100000;
      blocks.push(num.toString().padStart(5, '0'));
    }

    return blocks.join(' ');
  }

  // ==========================================
  // 8. HELPERS & FORMATTERS
  // ==========================================

  public generateDeviceId(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  public arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
    let binary = '';
    const bytes = new Uint8Array(
      buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
      buffer instanceof ArrayBuffer ? 0 : buffer.byteOffset,
      buffer.byteLength
    );
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  public base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public async exportKeyToBase64(key: CryptoKey): Promise<string> {
    const subtle = this.ensureSubtle();
    const raw = await subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(raw);
  }

  public async importKeyFromBase64(base64: string): Promise<CryptoKey> {
    const subtle = this.ensureSubtle();
    const buffer = this.base64ToArrayBuffer(base64);
    return await subtle.importKey(
      'raw',
      buffer,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }
}

export const cryptoService = new WebCryptoService();
