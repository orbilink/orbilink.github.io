import { Chat, Message } from '../../types/chat';
import { AppSettings } from '../../types/settings';
import { UserProfile, Contact } from '../../types/user';
import { CallHistoryItem } from '../../types/call';
import { VerifiedContactRecord } from '../../types/crypto';

const DB_NAME = 'vault_mesh_db';
const DB_VERSION = 4;

export class IndexedDbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Chats Store
        if (!db.objectStoreNames.contains('chats')) {
          const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Messages Store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Users Store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // Contacts Store
        if (!db.objectStoreNames.contains('contacts')) {
          db.createObjectStore('contacts', { keyPath: 'userId' });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Media Cache Store
        if (!db.objectStoreNames.contains('media_cache')) {
          db.createObjectStore('media_cache', { keyPath: 'id' });
        }

        // Call History Store
        if (!db.objectStoreNames.contains('call_history')) {
          const callStore = db.createObjectStore('call_history', { keyPath: 'id' });
          callStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Crypto Device Keys Store (Local Private & Public Key Material)
        if (!db.objectStoreNames.contains('crypto_device_keys')) {
          db.createObjectStore('crypto_device_keys', { keyPath: 'id' });
        }

        // Crypto Sessions Store (Pairwise & Group ratchet states)
        if (!db.objectStoreNames.contains('crypto_sessions')) {
          db.createObjectStore('crypto_sessions', { keyPath: 'id' });
        }

        // Verified Contacts (Safety numbers)
        if (!db.objectStoreNames.contains('verified_contacts')) {
          db.createObjectStore('verified_contacts', { keyPath: 'userId' });
        }

        // Anti-Replay Cache
        if (!db.objectStoreNames.contains('anti_replay')) {
          const replayStore = db.createObjectStore('anti_replay', { keyPath: 'id' });
          replayStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // --- Chats ---
  public async saveChats(chats: Chat[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chats', 'readwrite');
      const store = tx.objectStore('chats');
      chats.forEach((chat) => store.put(chat));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getChats(): Promise<Chat[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chats', 'readonly');
      const store = tx.objectStore('chats');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as Chat[]) || [];
        results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Messages ---
  public async saveMessages(messages: Message[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      messages.forEach((msg) => store.put(msg));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMessagesByChatId(chatId: string): Promise<Message[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const index = store.index('chatId');
      const request = index.getAll(IDBKeyRange.only(chatId));
      request.onsuccess = () => {
        const results = (request.result as Message[]) || [];
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllMessages(): Promise<Message[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const store = tx.objectStore('messages');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as Message[]) || [];
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteMessage(messageId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      const req = store.delete(messageId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Users & Contacts ---
  public async saveUsers(users: UserProfile[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      users.forEach((user) => store.put(user));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveUser(user: UserProfile): Promise<void> {
    return this.saveUsers([user]);
  }

  public async getUser(userId: string): Promise<UserProfile | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const request = store.get(userId);
      request.onsuccess = () => resolve((request.result as UserProfile) || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async getUsers(): Promise<UserProfile[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as UserProfile[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveContacts(contacts: Contact[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contacts', 'readwrite');
      const store = tx.objectStore('contacts');
      contacts.forEach((contact) => store.put(contact));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveContact(contact: Contact): Promise<void> {
    return this.saveContacts([contact]);
  }

  public async deleteContact(userId: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contacts', 'readwrite');
      const store = tx.objectStore('contacts');
      const req = store.delete(userId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getContacts(): Promise<Contact[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contacts', 'readonly');
      const store = tx.objectStore('contacts');
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as Contact[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Settings ---
  public async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key: 'app_settings', value: settings });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSettings(): Promise<AppSettings | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get('app_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          resolve(request.result.value as AppSettings);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Media Cache ---
  public async cacheMedia(id: string, blob: Blob): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media_cache', 'readwrite');
      const store = tx.objectStore('media_cache');
      store.put({ id, blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCachedMedia(id: string): Promise<Blob | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media_cache', 'readonly');
      const store = tx.objectStore('media_cache');
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          resolve(request.result.blob as Blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Call History ---
  public async saveCallHistory(history: CallHistoryItem[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('call_history', 'readwrite');
      const store = tx.objectStore('call_history');
      store.clear();
      history.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCallHistory(): Promise<CallHistoryItem[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('call_history', 'readonly');
      const store = tx.objectStore('call_history');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as CallHistoryItem[]) || [];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Crypto Device Key Material (Private & Public Keys) ---
  public async saveCryptoItem<T>(id: string, data: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('crypto_device_keys', 'readwrite');
      const store = tx.objectStore('crypto_device_keys');
      store.put({ id, data, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCryptoItem<T>(id: string): Promise<T | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('crypto_device_keys', 'readonly');
      const store = tx.objectStore('crypto_device_keys');
      const request = store.get(id);
      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(request.result.data as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Crypto Sessions Store ---
  public async saveSessionState<T>(sessionId: string, state: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('crypto_sessions', 'readwrite');
      const store = tx.objectStore('crypto_sessions');
      store.put({ id: sessionId, state, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSessionState<T>(sessionId: string): Promise<T | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('crypto_sessions', 'readonly');
      const store = tx.objectStore('crypto_sessions');
      const request = store.get(sessionId);
      request.onsuccess = () => {
        if (request.result && request.result.state) {
          resolve(request.result.state as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Verified Contacts (Safety Numbers) ---
  public async saveVerifiedContact(record: VerifiedContactRecord): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('verified_contacts', 'readwrite');
      const store = tx.objectStore('verified_contacts');
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getVerifiedContact(userId: string): Promise<VerifiedContactRecord | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('verified_contacts', 'readonly');
      const store = tx.objectStore('verified_contacts');
      const request = store.get(userId);
      request.onsuccess = () => {
        resolve((request.result as VerifiedContactRecord) || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllVerifiedContacts(): Promise<VerifiedContactRecord[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('verified_contacts', 'readonly');
      const store = tx.objectStore('verified_contacts');
      const request = store.getAll();
      request.onsuccess = () => {
        resolve((request.result as VerifiedContactRecord[]) || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- Anti-Replay Protection Cache ---
  public async checkAndRecordMessageReplay(messageUniqueKey: string): Promise<boolean> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('anti_replay', 'readwrite');
      const store = tx.objectStore('anti_replay');
      const req = store.get(messageUniqueKey);
      req.onsuccess = () => {
        if (req.result) {
          // Message was already processed -> REPLAY DETECTED!
          resolve(true);
        } else {
          // Record message unique key
          store.put({ id: messageUniqueKey, timestamp: Date.now() });
          resolve(false);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Diagnostics and Clearing ---
  public async getStorageUsage(): Promise<{ usageBytes: number; messageCount: number; chatCount: number }> {
    try {
      const db = await this.init();
      let messageCount = 0;
      let chatCount = 0;

      const tx = db.transaction(['messages', 'chats'], 'readonly');
      messageCount = await new Promise<number>((res) => {
        const req = tx.objectStore('messages').count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      });

      chatCount = await new Promise<number>((res) => {
        const req = tx.objectStore('chats').count();
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(0);
      });

      let usageBytes = messageCount * 512 + chatCount * 1024;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          usageBytes = estimate.usage;
        }
      }

      return { usageBytes, messageCount, chatCount };
    } catch {
      return { usageBytes: 1024 * 100, messageCount: 0, chatCount: 0 };
    }
  }

  public async clearCache(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['messages', 'media_cache'], 'readwrite');
      tx.objectStore('messages').clear();
      tx.objectStore('media_cache').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ['chats', 'messages', 'media_cache', 'crypto_sessions', 'anti_replay'],
        'readwrite'
      );
      tx.objectStore('chats').clear();
      tx.objectStore('messages').clear();
      tx.objectStore('media_cache').clear();
      tx.objectStore('crypto_sessions').clear();
      tx.objectStore('anti_replay').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const indexedDbService = new IndexedDbService();
