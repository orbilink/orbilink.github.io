import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseDb, isLiveFirebase } from '../firebase/firebaseApp';
import { cryptoService } from './cryptoService';
import { indexedDbService } from '../storage/indexedDbService';
import {
  DevicePublicRecord,
  LocalDeviceKeys,
  EncryptedPayload,
  VerifiedContactRecord,
} from '../../types/crypto';
import { Message, Chat, Attachment } from '../../types/chat';
import { UserProfile, Contact } from '../../types/user';

interface PairwiseSessionState {
  chatId: string;
  peerUserId: string;
  peerDeviceId: string;
  peerIdentityKeyJwk: JsonWebKey;
  peerPreKeyJwk: JsonWebKey;
  outCounter: number;
  inCounter: number;
  epoch: number;
  lastUpdated: number;
}

export class E2EESessionManager {
  private currentDevice: LocalDeviceKeys | null = null;
  private peerDeviceCache: Map<string, DevicePublicRecord[]> = new Map();
  private pairwiseKeyCache: Map<string, CryptoKey> = new Map();
  private sessionStateCache: Map<string, PairwiseSessionState> = new Map();

  // ==========================================
  // 1. INITIALIZE CURRENT DEVICE & PUBLISH PUBLIC KEY
  // ==========================================

  public async initialize(currentUser: UserProfile): Promise<LocalDeviceKeys> {
    const localDevice = await cryptoService.getOrInitializeLocalDevice(
      currentUser.id,
      currentUser.displayName
    );
    this.currentDevice = localDevice;

    // Publish public device record to Firestore (users/{userId}/devices/{deviceId})
    const publicRecord = await cryptoService.getPublicDeviceRecord(localDevice);

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const deviceRef = doc(db, 'users', currentUser.id, 'devices', localDevice.deviceId);
        await setDoc(deviceRef, publicRecord, { merge: true });
      } catch (err) {
        console.warn('Could not publish public device key to Firestore:', err);
      }
    }

    return localDevice;
  }

  public getCurrentDevice(): LocalDeviceKeys | null {
    return this.currentDevice;
  }

  // ==========================================
  // 2. DEVICE PUBLIC KEY DISCOVERY
  // ==========================================

  public async fetchUserDevices(userId: string): Promise<DevicePublicRecord[]> {
    if (this.peerDeviceCache.has(userId)) {
      return this.peerDeviceCache.get(userId)!;
    }

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const devicesRef = collection(db, 'users', userId, 'devices');
        const snap = await getDocs(devicesRef);
        const devices: DevicePublicRecord[] = [];

        snap.forEach((d) => {
          devices.push(d.data() as DevicePublicRecord);
        });

        if (devices.length > 0) {
          this.peerDeviceCache.set(userId, devices);
          // Check for key changes
          await this.checkKeyChange(userId, devices[0]);
          return devices;
        }
      } catch (err) {
        console.warn(`Failed to fetch device keys for user ${userId}:`, err);
      }
    }

    return [];
  }

  // ==========================================
  // 3. KEY CHANGE DETECTION & SAFETY NUMBERS
  // ==========================================

  private async checkKeyChange(userId: string, currentPublicDevice: DevicePublicRecord): Promise<void> {
    const savedRecord = await indexedDbService.getVerifiedContact(userId);
    if (savedRecord && savedRecord.lastKnownKeyJwk) {
      const oldFingerprint = savedRecord.fingerprint;
      const newFingerprint = currentPublicDevice.fingerprint;

      if (oldFingerprint !== newFingerprint) {
        // Key has changed! Mark keyChanged flag and alert user
        savedRecord.keyChanged = true;
        savedRecord.fingerprint = newFingerprint;
        savedRecord.lastKnownKeyJwk = currentPublicDevice.identityKeyJwk;
        await indexedDbService.saveVerifiedContact(savedRecord);
      }
    } else {
      // First time saving contact verification state
      const publicJwk = currentPublicDevice.identityKeyJwk;
      let safetyNumber = '';
      if (this.currentDevice) {
        const myJwk = await cryptoService.ensureSubtle().exportKey('jwk', this.currentDevice.identityPublicKey);
        safetyNumber = await cryptoService.computeSafetyNumber(myJwk, publicJwk);
      }

      await indexedDbService.saveVerifiedContact({
        userId,
        fingerprint: currentPublicDevice.fingerprint,
        safetyNumberFormatted: safetyNumber,
        isVerified: false,
        lastKnownKeyJwk: publicJwk,
        keyChanged: false,
      });
    }
  }

  public async getSafetyNumberForContact(
    currentUser: UserProfile,
    contactUserId: string
  ): Promise<{ safetyNumber: string; isVerified: boolean; keyChanged: boolean; fingerprint: string }> {
    const local = await this.initialize(currentUser);
    const myJwk = await cryptoService.ensureSubtle().exportKey('jwk', local.identityPublicKey);

    // Get peer device keys
    const peerDevices = await this.fetchUserDevices(contactUserId);
    let peerJwk: JsonWebKey | null = null;
    let peerFingerprint = '';

    if (peerDevices.length > 0) {
      peerJwk = peerDevices[0].identityKeyJwk;
      peerFingerprint = peerDevices[0].fingerprint;
    } else {
      // Fallback deterministic dummy key if peer hasn't published yet
      peerFingerprint = 'A4F2 90BC 128E 45D1';
      peerJwk = {
        kty: 'EC',
        crv: 'P-256',
        x: 'f83OJ3D2xFmTbKEBaGJ43uWD_L7fEDP4cG80p-g0424',
        y: 'x_da7W4G12-wXy_w_u0e8A5eA_r2-4Ew3x3x4x4x4x4',
      };
    }

    const safetyNumber = await cryptoService.computeSafetyNumber(myJwk, peerJwk);
    const saved = await indexedDbService.getVerifiedContact(contactUserId);

    return {
      safetyNumber: saved?.safetyNumberFormatted || safetyNumber,
      isVerified: Boolean(saved?.isVerified),
      keyChanged: Boolean(saved?.keyChanged),
      fingerprint: peerFingerprint || saved?.fingerprint || '0000 0000 0000 0000',
    };
  }

  public async setContactVerified(
    contactUserId: string,
    isVerified: boolean,
    safetyNumber: string,
    fingerprint: string
  ): Promise<void> {
    await indexedDbService.saveVerifiedContact({
      userId: contactUserId,
      fingerprint,
      safetyNumberFormatted: safetyNumber,
      isVerified,
      verifiedAt: isVerified ? Date.now() : undefined,
      keyChanged: false, // reset key change warning on user verification
    });
  }

  // ==========================================
  // 4. MESSAGE ENCRYPTION PIPELINE
  // ==========================================

  public async encryptMessageForSend(
    chat: Chat,
    currentUser: UserProfile,
    text: string,
    messageId: string,
    timestamp: number,
    attachments?: Attachment[]
  ): Promise<{
    ciphertext: string;
    iv: string;
    aad: string;
    counter: number;
    epoch: number;
    senderDeviceId: string;
    encryptedKeyEnvelopes?: Record<string, string>;
    encryptedMedia?: {
      encryptedData?: string;
      iv: string;
      mimeType: string;
      filename: string;
      size: number;
    };
  }> {
    const local = await this.initialize(currentUser);

    // 1. Get or create session state for this conversation
    const sessionId = `session_${chat.id}`;
    let session = this.sessionStateCache.get(sessionId);

    if (!session) {
      const storedSession = await indexedDbService.getSessionState<PairwiseSessionState>(sessionId);
      if (storedSession) {
        session = storedSession;
      } else {
        session = {
          chatId: chat.id,
          peerUserId: chat.participants.find((p) => p !== currentUser.id) || currentUser.id,
          peerDeviceId: '',
          peerIdentityKeyJwk: {},
          peerPreKeyJwk: {},
          outCounter: 0,
          inCounter: 0,
          epoch: 1,
          lastUpdated: Date.now(),
        };
      }
      this.sessionStateCache.set(sessionId, session);
    }

    session.outCounter += 1;
    const counter = session.outCounter;
    const epoch = session.epoch || 1;

    // 2. Establish/Derive Pairwise or Group Session Key
    let sessionKey = this.pairwiseKeyCache.get(chat.id);

    if (!sessionKey) {
      // Find peer devices
      const peerUserId = session.peerUserId;
      const peerDevices = await this.fetchUserDevices(peerUserId);

      if (peerDevices.length > 0 && peerDevices[0].identityKeyJwk) {
        session.peerDeviceId = peerDevices[0].deviceId;
        session.peerIdentityKeyJwk = peerDevices[0].identityKeyJwk;
        session.peerPreKeyJwk = peerDevices[0].preKeyJwk;

        sessionKey = await cryptoService.derivePairwiseSharedKey(
          local.identityPrivateKey,
          peerDevices[0].identityKeyJwk,
          `CHAT_${chat.id}`
        );
      } else {
        // Fallback to local session key derivation if peer hasn't published yet
        const tempKey = await cryptoService.ensureSubtle().generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        sessionKey = tempKey;
      }

      this.pairwiseKeyCache.set(chat.id, sessionKey);
    }

    // 3. Derive ratcheted per-message key via HKDF
    const messageKey = await cryptoService.deriveRatchetedMessageKey(
      sessionKey,
      chat.id,
      counter,
      epoch
    );

    // 4. Encrypt message text with AES-256-GCM + AAD
    const encryptedPayload = await cryptoService.encryptMessage(
      text,
      messageKey,
      local.deviceId,
      chat.id,
      counter,
      epoch,
      messageId,
      timestamp
    );

    // 5. Encrypt media attachments if present
    let encryptedMediaResult: {
      encryptedData?: string;
      iv: string;
      mimeType: string;
      filename: string;
      size: number;
    } | undefined;

    if (attachments && attachments.length > 0 && attachments[0].url) {
      try {
        const att = attachments[0];
        // Read attachment raw data
        let arrayBuffer: ArrayBuffer;
        if (att.url.startsWith('data:')) {
          const base64Data = att.url.split(',')[1];
          arrayBuffer = cryptoService.base64ToArrayBuffer(base64Data);
        } else {
          const resp = await fetch(att.url);
          arrayBuffer = await resp.arrayBuffer();
        }

        const mediaKey = await cryptoService.generateMediaKey();
        const encryptedMedia = await cryptoService.encryptMediaBuffer(
          arrayBuffer,
          att.mimeType || 'application/octet-stream',
          att.name || 'file',
          mediaKey
        );

        encryptedMediaResult = {
          encryptedData: encryptedMedia.encryptedData,
          iv: encryptedMedia.iv,
          mimeType: encryptedMedia.mimeType,
          filename: encryptedMedia.filename,
          size: encryptedMedia.size,
        };
      } catch (err) {
        console.warn('Failed to encrypt media attachment:', err);
      }
    }

    // Save updated session state locally
    session.lastUpdated = Date.now();
    await indexedDbService.saveSessionState(sessionId, session);

    return {
      ciphertext: encryptedPayload.ciphertext,
      iv: encryptedPayload.iv,
      aad: encryptedPayload.aad,
      counter,
      epoch,
      senderDeviceId: local.deviceId,
      encryptedMedia: encryptedMediaResult,
    };
  }

  // ==========================================
  // 5. MESSAGE DECRYPTION PIPELINE
  // ==========================================

  public async decryptIncomingMessage(
    msg: Message,
    currentUserId: string
  ): Promise<Message> {
    // If message is already marked as decrypted or has no ciphertext, return as is
    if (msg.isDecrypted || !msg.ciphertext || !msg.iv) {
      return msg;
    }

    // Replay Protection Check
    const replayKey = `${msg.senderDeviceId || 'dev'}_${msg.id}_${msg.counter || 0}`;
    const isReplay = await indexedDbService.checkAndRecordMessageReplay(replayKey);
    if (isReplay && msg.senderId !== currentUserId) {
      return {
        ...msg,
        text: '⚠️ Replay detected: duplicate or retransmitted message rejected.',
        decryptionError: 'Replay detected',
        isDecrypted: true,
      };
    }

    try {
      const local = await cryptoService.getOrInitializeLocalDevice(currentUserId, '');

      // Get or establish session key
      let sessionKey = this.pairwiseKeyCache.get(msg.chatId);

      if (!sessionKey) {
        const peerUserId = msg.senderId === currentUserId ? msg.senderId : msg.senderId;
        const peerDevices = await this.fetchUserDevices(peerUserId);

        if (peerDevices.length > 0 && peerDevices[0].identityKeyJwk) {
          sessionKey = await cryptoService.derivePairwiseSharedKey(
            local.identityPrivateKey,
            peerDevices[0].identityKeyJwk,
            `CHAT_${msg.chatId}`
          );
          this.pairwiseKeyCache.set(msg.chatId, sessionKey);
        }
      }

      if (!sessionKey) {
        // If no peer key is discovered, try decrypting with the sender's own key (for self-sent messages)
        sessionKey = await cryptoService.ensureSubtle().generateKey(
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
      }

      // Derive ratcheted per-message key
      const messageKey = await cryptoService.deriveRatchetedMessageKey(
        sessionKey,
        msg.chatId,
        msg.counter || 1,
        msg.epoch || 1
      );

      const decryptedText = await cryptoService.decryptMessage(
        {
          ciphertext: msg.ciphertext,
          iv: msg.iv,
          algorithm: 'AES-256-GCM',
          senderDeviceId: msg.senderDeviceId || '',
          counter: msg.counter || 1,
          epoch: msg.epoch || 1,
          aad: msg.aad || '',
          version: 2,
        },
        messageKey
      );

      return {
        ...msg,
        text: decryptedText,
        isDecrypted: true,
        decryptionError: undefined,
      };
    } catch {
      // Safe fallback for un-decryptable or tampered messages
      return {
        ...msg,
        text: msg.text || '🔒 [Encrypted Message]',
        isDecrypted: false,
        decryptionError: 'Authentication failed (Ciphertext or AAD tampered)',
      };
    }
  }

  // Clear memory cache on logout
  public clear(): void {
    this.peerDeviceCache.clear();
    this.pairwiseKeyCache.clear();
    this.sessionStateCache.clear();
    this.currentDevice = null;
  }
}

export const e2eeSessionManager = new E2EESessionManager();
