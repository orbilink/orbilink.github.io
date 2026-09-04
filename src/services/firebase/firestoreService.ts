import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  limit,
} from 'firebase/firestore';
import { Chat, Message, GroupMember } from '../../types/chat';
import { Contact, UserProfile } from '../../types/user';
import { getFirebaseDb, isLiveFirebase } from './firebaseApp';
import { indexedDbService } from '../storage/indexedDbService';
import { soundEffects } from '../sound/soundEffects';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp: number;
}

export interface FirestoreConnectionState {
  status: 'connected' | 'checking' | 'unavailable' | 'idle';
  lastChecked: number;
  lastSuccessfulOperation: number | null;
  errorMessage?: string;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  if (
    errorMsg.toLowerCase().includes('client is offline') ||
    errorMsg.toLowerCase().includes('offline') ||
    errorMsg.toLowerCase().includes('unavailable')
  ) {
    // Normal offline transition or cache-first behavior - gracefully ignored
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    operationType,
    path,
    timestamp: Date.now(),
  };
  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
}

type ChatsListener = (chats: Chat[]) => void;
type MessagesListener = (messages: Message[]) => void;
type ContactsListener = (contacts: Contact[]) => void;
type ConnectionStatusListener = (state: FirestoreConnectionState) => void;

class FirestoreService {
  private chats: Chat[] = [];
  private messagesMap: Record<string, Message[]> = {};
  private contacts: Contact[] = [];
  private chatListeners: Set<ChatsListener> = new Set();
  private messageListeners: Map<string, Set<MessagesListener>> = new Map();
  private contactListeners: Set<ContactsListener> = new Set();
  private connectionListeners: Set<ConnectionStatusListener> = new Set();

  private connectionState: FirestoreConnectionState = {
    status: 'checking',
    lastChecked: Date.now(),
    lastSuccessfulOperation: null,
  };

  constructor() {
    this.initLocalData();
    // Eagerly verify real connectivity on instantiation
    this.testFirestoreConnection().catch(() => {});
  }

  // --- Real-Time Connection Status Tracking ---
  public getConnectionState(): FirestoreConnectionState {
    return { ...this.connectionState };
  }

  public subscribeConnectionStatus(callback: ConnectionStatusListener): () => void {
    this.connectionListeners.add(callback);
    callback({ ...this.connectionState });
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionState() {
    this.connectionListeners.forEach((cb) => cb({ ...this.connectionState }));
  }

  public markOperationSuccess() {
    const prevStatus = this.connectionState.status;
    this.connectionState = {
      status: 'connected',
      lastChecked: Date.now(),
      lastSuccessfulOperation: Date.now(),
      errorMessage: undefined,
    };
    if (prevStatus !== 'connected') {
      this.notifyConnectionState();
    }
  }

  public markOperationError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    this.connectionState = {
      ...this.connectionState,
      status: 'unavailable',
      lastChecked: Date.now(),
      errorMessage: msg,
    };
    this.notifyConnectionState();
  }

  public async testFirestoreConnection(): Promise<FirestoreConnectionState> {
    const db = getFirebaseDb();
    if (!isLiveFirebase() || !db) {
      this.connectionState = {
        status: 'unavailable',
        lastChecked: Date.now(),
        lastSuccessfulOperation: this.connectionState.lastSuccessfulOperation,
        errorMessage: 'Firebase app or Cloud Firestore is not initialized.',
      };
      this.notifyConnectionState();
      return this.connectionState;
    }

    this.connectionState = {
      ...this.connectionState,
      status: 'checking',
      lastChecked: Date.now(),
    };
    this.notifyConnectionState();

    try {
      // Real test: perform a lightweight query to the public usernames collection
      const testQuery = query(collection(db, 'usernames'), limit(1));
      await getDocs(testQuery);
      this.markOperationSuccess();
    } catch (err: unknown) {
      this.markOperationError(err);
    }

    return this.connectionState;
  }

  public async retryConnection(): Promise<FirestoreConnectionState> {
    return this.testFirestoreConnection();
  }

  private async initLocalData() {
    try {
      const cachedChats = await indexedDbService.getChats();
      if (cachedChats && cachedChats.length > 0) {
        this.chats = cachedChats;
        this.notifyChats();
      }
    } catch {
      this.chats = [];
    }
  }

  // --- Real-Time Chats Subscription ---
  public subscribeToChats(userId: string, callback: ChatsListener): () => void {
    this.chatListeners.add(callback);
    callback([...this.chats]);

    const db = getFirebaseDb();
    if (isLiveFirebase() && db && userId) {
      try {
        // Query without composite index requirement to guarantee instant execution
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: Chat[] = [];
            snapshot.forEach((d) => {
              const data = d.data() as Chat;
              const chatObj: Chat = { ...data, id: d.id };

              // Filter out expired typing entries (older than 4 seconds)
              if (chatObj.typingMap) {
                const now = Date.now();
                const activeTyping: string[] = [];
                Object.entries(chatObj.typingMap).forEach(([uid, val]) => {
                  if (uid !== userId && val && now - (val.timestamp || 0) < 4000) {
                    activeTyping.push(val.displayName || 'User');
                  }
                });
                chatObj.typingUsers = activeTyping;
              }

              // Adjust 1-on-1 direct chat display name/avatar to match the peer
              if (chatObj.type === 'direct' && chatObj.participantProfiles) {
                const peerId = chatObj.participants.find((p) => p !== userId);
                if (peerId && chatObj.participantProfiles[peerId]) {
                  const peer = chatObj.participantProfiles[peerId];
                  chatObj.name = peer.displayName || peer.username || chatObj.name;
                  chatObj.avatarUrl = peer.avatarUrl || chatObj.avatarUrl;
                  chatObj.description = peer.about || chatObj.description;
                }
              }

              list.push(chatObj);
            });

            // Sort by most recent interaction
            list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

            this.chats = list;
            this.notifyChats();
            this.markOperationSuccess();
            indexedDbService.saveChats(list).catch(() => {});
          },
          (error) => {
            this.markOperationError(error);
            handleFirestoreError(error, OperationType.LIST, 'chats');
          }
        );

        return () => {
          this.chatListeners.delete(callback);
          unsubscribe();
        };
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'chats');
      }
    }

    return () => {
      this.chatListeners.delete(callback);
    };
  }

  private notifyChats() {
    this.chatListeners.forEach((cb) => cb([...this.chats]));
  }

  // --- Real-Time Contacts & Registered Users ---
  public subscribeToContacts(userId: string, callback: ContactsListener): () => void {
    this.contactListeners.add(callback);
    callback([...this.contacts]);

    const db = getFirebaseDb();
    if (isLiveFirebase() && db && userId) {
      try {
        const contactsRef = collection(db, 'users', userId, 'contacts');
        const unsubscribe = onSnapshot(
          contactsRef,
          (snapshot) => {
            const list: Contact[] = [];
            snapshot.forEach((d) => {
              const c = d.data() as Contact;
              list.push({
                ...c,
                id: d.id,
                userId: c.userId || d.id,
              });
            });

            this.contacts = list;
            this.notifyContacts();
            indexedDbService.saveContacts(list).catch(() => {});
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `users/${userId}/contacts`);
          }
        );

        return () => {
          this.contactListeners.delete(callback);
          unsubscribe();
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `users/${userId}/contacts`);
      }
    }

    return () => {
      this.contactListeners.delete(callback);
    };
  }

  private notifyContacts() {
    this.contactListeners.forEach((cb) => cb([...this.contacts]));
  }

  public isContact(userId: string): boolean {
    return this.contacts.some((c) => c.userId === userId || c.id === userId || c.id === `contact_${userId}`);
  }

  public async addContact(currentUserId: string, target: UserProfile | Contact): Promise<Contact> {
    const targetUid = 'userId' in target && target.userId ? target.userId : target.id;
    if (!targetUid || targetUid === currentUserId) {
      throw new Error('Cannot add yourself as a contact');
    }

    const contactData: Contact = {
      id: `contact_${targetUid}`,
      userId: targetUid,
      displayName: target.displayName || target.username || 'User',
      username: target.username || '',
      avatarUrl: target.avatarUrl || '',
      avatarColor: target.avatarColor || 'from-emerald-500 to-teal-700',
      about: target.about || 'RYNOX user',
      phone: target.phone || '',
      isOnline: Boolean(target.isOnline),
      lastSeen: target.lastSeen || Date.now(),
    };

    const existingIdx = this.contacts.findIndex((c) => c.userId === targetUid);
    if (existingIdx !== -1) {
      this.contacts[existingIdx] = contactData;
    } else {
      this.contacts.unshift(contactData);
    }
    this.notifyContacts();
    indexedDbService.saveContacts(this.contacts).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'users', currentUserId, 'contacts', targetUid), contactData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUserId}/contacts/${targetUid}`);
        throw err;
      }
    }

    return contactData;
  }

  public async removeContact(currentUserId: string, targetUid: string): Promise<void> {
    this.contacts = this.contacts.filter((c) => c.userId !== targetUid && c.id !== targetUid);
    this.notifyContacts();
    indexedDbService.deleteContact(targetUid).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'users', currentUserId, 'contacts', targetUid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUserId}/contacts/${targetUid}`);
        throw err;
      }
    }
  }

  // --- Search Users across Network ---
  public async searchUsers(queryText: string, currentUserId: string): Promise<Contact[]> {
    const q = queryText.trim().toLowerCase().replace(/^@/, '');
    if (!q) return this.contacts;

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const results: Contact[] = [];
        const seenIds = new Set<string>();

        // 1. Direct O(1) lookup in 'usernames' collection for exact username match
        try {
          const exactUsernameSnap = await getDoc(doc(db, 'usernames', q));
          if (exactUsernameSnap.exists()) {
            const data = exactUsernameSnap.data();
            const targetUid = data.uid;
            if (targetUid && targetUid !== currentUserId) {
              const userProfileSnap = await getDoc(doc(db, 'users', targetUid));
              if (userProfileSnap.exists()) {
                seenIds.add(targetUid);
                const u = userProfileSnap.data() as UserProfile;
                results.push({
                  id: `contact_${targetUid}`,
                  userId: targetUid,
                  displayName: u.displayName || u.username,
                  username: u.username,
                  avatarUrl: u.avatarUrl || '',
                  avatarColor: u.avatarColor || 'from-emerald-500 to-teal-700',
                  about: u.about || 'RYNOX user',
                  isOnline: Boolean(u.isOnline),
                  lastSeen: u.lastSeen || Date.now(),
                  phone: u.phone || '',
                });
              }
            }
          }
        } catch {
          // Fall through to prefix search
        }

        // 2. Query users collection by prefix (matching username >= q and <= q + '\uf8ff')
        const userQuery = query(
          collection(db, 'users'),
          where('username', '>=', q),
          where('username', '<=', q + '\uf8ff'),
          limit(20)
        );

        const snap = await getDocs(userQuery);
        snap.forEach((d) => {
          if (d.id !== currentUserId && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            const u = d.data() as UserProfile;
            results.push({
              id: `contact_${d.id}`,
              userId: d.id,
              displayName: u.displayName || u.username,
              username: u.username,
              avatarUrl: u.avatarUrl || '',
              avatarColor: u.avatarColor || 'from-emerald-500 to-teal-700',
              about: u.about || 'RYNOX user',
              isOnline: Boolean(u.isOnline),
              lastSeen: u.lastSeen || Date.now(),
              phone: u.phone || '',
            });
          }
        });

        // 3. Fallback: If no results found, search display names
        if (results.length === 0) {
          const generalSnap = await getDocs(query(collection(db, 'users'), limit(30)));
          generalSnap.forEach((d) => {
            if (d.id !== currentUserId && !seenIds.has(d.id)) {
              const u = d.data() as UserProfile;
              const nameMatch = u.displayName?.toLowerCase().includes(q);
              const userMatch = u.username?.toLowerCase().includes(q);
              if (nameMatch || userMatch) {
                seenIds.add(d.id);
                results.push({
                  id: `contact_${d.id}`,
                  userId: d.id,
                  displayName: u.displayName || u.username,
                  username: u.username,
                  avatarUrl: u.avatarUrl || '',
                  avatarColor: u.avatarColor || 'from-emerald-500 to-teal-700',
                  about: u.about || 'RYNOX user',
                  isOnline: Boolean(u.isOnline),
                  lastSeen: u.lastSeen || Date.now(),
                  phone: u.phone || '',
                });
              }
            }
          });
        }

        return results;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'users');
      }
    }

    return this.contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q)
    );
  }

  // --- Real-Time Messages Subscription ---
  public subscribeToMessages(chatId: string, callback: MessagesListener, _currentUserId: string = ''): () => void {
    if (!this.messageListeners.has(chatId)) {
      this.messageListeners.set(chatId, new Set());
    }
    const listeners = this.messageListeners.get(chatId)!;
    listeners.add(callback);

    const currentMsgs = this.messagesMap[chatId] || [];
    callback([...currentMsgs]);

    // Hydrate from IndexedDB cache if empty
    indexedDbService.getMessagesByChatId(chatId).then((cached) => {
      if (cached && cached.length > 0 && (!this.messagesMap[chatId] || this.messagesMap[chatId].length === 0)) {
        this.messagesMap[chatId] = cached;
        this.notifyMessages(chatId);
      }
    });

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const q = query(
          collection(db, `chats/${chatId}/messages`),
          limit(300)
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const rawList: Message[] = [];
            snapshot.forEach((d) => {
              const msg = { ...d.data(), id: d.id } as Message;
              rawList.push(msg);
            });

            // Sort chronologically
            rawList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            this.messagesMap[chatId] = rawList;
            this.notifyMessages(chatId);
            this.markOperationSuccess();
            indexedDbService.saveMessages(rawList).catch(() => {});
          },
          (error) => {
            this.markOperationError(error);
            handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
          }
        );

        return () => {
          listeners.delete(callback);
          unsubscribe();
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
      }
    }

    return () => {
      listeners.delete(callback);
    };
  }

  private notifyMessages(chatId: string) {
    const listeners = this.messageListeners.get(chatId);
    if (listeners) {
      const msgs = this.messagesMap[chatId] || [];
      listeners.forEach((cb) => cb([...msgs]));
    }
  }

  // --- Send Message ---
  public async sendMessage(
    chatId: string,
    sender: UserProfile | { id: string; displayName: string; avatarUrl?: string; avatarColor?: string },
    text: string,
    type: Message['type'] = 'text',
    attachments?: Message['attachments'],
    replyTo?: Message['replyTo']
  ): Promise<Message> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();

    // 1. Prepare chat context
    const chat = this.chats.find((c) => c.id === chatId) || {
      id: chatId,
      type: 'direct' as const,
      name: 'Chat',
      participants: [sender.id],
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 2. Real Message payload
    const newMessage: Message = {
      id: messageId,
      chatId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderAvatar: sender.avatarUrl || '',
      senderColor: sender.avatarColor || '',
      text,
      type,
      attachments: attachments || [],
      replyTo: replyTo || undefined,
      status: 'sent',
      timestamp,
    };

    // 3. Document for Firestore (clean, no undefined)
    const firestoreMessage: Record<string, any> = {
      id: messageId,
      chatId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderAvatar: sender.avatarUrl || '',
      senderColor: sender.avatarColor || '',
      text: text || '',
      type,
      status: 'sent',
      timestamp,
    };

    if (attachments && attachments.length > 0) {
      firestoreMessage.attachments = attachments;
    }
    if (replyTo) {
      firestoreMessage.replyTo = replyTo;
    }

    if (!this.messagesMap[chatId]) {
      this.messagesMap[chatId] = [];
    }
    this.messagesMap[chatId].push(newMessage);
    this.notifyMessages(chatId);

    soundEffects.playSent();

    const summaryText =
      type === 'text'
        ? text
        : type === 'image'
        ? '📷 Photo'
        : type === 'audio'
        ? '🎤 Voice message'
        : type === 'video'
        ? '🎥 Video'
        : type === 'document'
        ? `📄 ${attachments?.[0]?.name || 'Document'}`
        : text;

    const lastMessageSummary = {
      text: summaryText,
      senderId: sender.id,
      senderName: sender.displayName,
      timestamp,
      type,
      status: 'sent' as const,
    };

    const chatIndex = this.chats.findIndex((c) => c.id === chatId);
    if (chatIndex !== -1) {
      this.chats[chatIndex].lastMessage = lastMessageSummary;
      this.chats[chatIndex].updatedAt = timestamp;
      this.chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});
    }

    indexedDbService.saveMessages([newMessage]).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const chatDocRef = doc(db, 'chats', chatId);
        const chatSnap = await getDoc(chatDocRef);
        if (!chatSnap.exists() && chat) {
          await setDoc(chatDocRef, chat);
        }

        await setDoc(doc(db, `chats/${chatId}/messages`, messageId), firestoreMessage);
        await updateDoc(chatDocRef, {
          lastMessage: lastMessageSummary,
          updatedAt: timestamp,
        });
        this.markOperationSuccess();
      } catch (err) {
        this.markOperationError(err);
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${messageId}`);
        // Revert message in memory if write failed
        if (this.messagesMap[chatId]) {
          this.messagesMap[chatId] = this.messagesMap[chatId].filter((m) => m.id !== messageId);
          this.notifyMessages(chatId);
        }
        throw err;
      }
    }

    return newMessage;
  }

  // --- Mark Messages in Chat as Read ---
  public async markMessagesAsRead(chatId: string, currentUserId: string): Promise<void> {
    const msgs = this.messagesMap[chatId];
    if (msgs) {
      let changed = false;
      msgs.forEach((m) => {
        if (m.senderId !== currentUserId && m.status !== 'read') {
          m.status = 'read';
          changed = true;
        }
      });
      if (changed) {
        this.notifyMessages(chatId);
      }
    }

    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.unreadCount = 0;
      this.notifyChats();
    }

    const db = getFirebaseDb();
    if (isLiveFirebase() && db && currentUserId) {
      try {
        const unreadQ = query(
          collection(db, `chats/${chatId}/messages`),
          where('status', '!=', 'read')
        );
        const snap = await getDocs(unreadQ);
        snap.forEach(async (d) => {
          const data = d.data() as Message;
          if (data.senderId !== currentUserId) {
            await updateDoc(doc(db, `chats/${chatId}/messages`, d.id), {
              status: 'read',
            });
          }
        });
      } catch (err) {
        // Suppress unread status query exceptions
      }
    }
  }

  public async markChatAsRead(chatId: string, currentUserId: string = ''): Promise<void> {
    await this.markMessagesAsRead(chatId, currentUserId);
  }

  public async markChatAsUnread(chatId: string): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.unreadCount = (chat.unreadCount || 0) + 1;
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});
    }
  }

  // --- Real-Time Typing Indicator ---
  public async setTyping(chatId: string, user: UserProfile, isTyping: boolean): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      if (!chat.typingMap) chat.typingMap = {};
      if (isTyping) {
        chat.typingMap[user.id] = { displayName: user.displayName, timestamp: Date.now() };
      } else {
        delete chat.typingMap[user.id];
      }
      chat.typingUsers = Object.values(chat.typingMap).map((t) => t.displayName);
      this.notifyChats();
    }

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const chatRef = doc(db, 'chats', chatId);
        if (isTyping) {
          await updateDoc(chatRef, {
            [`typingMap.${user.id}`]: {
              displayName: user.displayName,
              timestamp: Date.now(),
            },
          });
        } else {
          await updateDoc(chatRef, {
            [`typingMap.${user.id}`]: null,
          });
        }
      } catch (err) {
        // Ephemeral typing errors don't disrupt the user
      }
    }
  }

  // --- Forward Message ---
  public async forwardMessage(
    targetChatId: string,
    sender: UserProfile | { id: string; displayName: string; avatarColor?: string },
    originalMessage: Message
  ): Promise<Message> {
    const forwarded: Message = {
      id: `msg_fwd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chatId: targetChatId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderColor: sender.avatarColor,
      text: originalMessage.text,
      type: originalMessage.type,
      attachments: originalMessage.attachments,
      isForwarded: true,
      status: 'sent',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[targetChatId]) {
      this.messagesMap[targetChatId] = [];
    }
    this.messagesMap[targetChatId].push(forwarded);
    this.notifyMessages(targetChatId);

    const chatIndex = this.chats.findIndex((c) => c.id === targetChatId);
    if (chatIndex !== -1) {
      this.chats[chatIndex].lastMessage = {
        text: forwarded.text,
        senderId: sender.id,
        senderName: sender.displayName,
        timestamp: forwarded.timestamp,
        type: forwarded.type,
        status: 'sent',
      };
      this.chats[chatIndex].updatedAt = forwarded.timestamp;
      this.chats.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});
    }

    indexedDbService.saveMessages([forwarded]).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, `chats/${targetChatId}/messages`, forwarded.id), forwarded);
        await updateDoc(doc(db, 'chats', targetChatId), {
          lastMessage: this.chats[chatIndex]?.lastMessage,
          updatedAt: forwarded.timestamp,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${targetChatId}/messages`);
      }
    }

    return forwarded;
  }

  // --- Reactions ---
  public async reactToMessage(
    chatId: string,
    messageId: string,
    userId: string,
    emojiOrUserName: string,
    maybeEmoji?: string
  ): Promise<void> {
    const emoji = maybeEmoji || emojiOrUserName;
    const userName = maybeEmoji ? emojiOrUserName : 'User';

    const msgs = this.messagesMap[chatId];
    if (!msgs) return;

    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];

    const existingIndex = msg.reactions.findIndex((r) => r.emoji === emoji && r.userId === userId);
    if (existingIndex !== -1) {
      msg.reactions.splice(existingIndex, 1);
    } else {
      msg.reactions.push({
        emoji,
        userId,
        userName,
        timestamp: Date.now(),
      });
    }

    this.notifyMessages(chatId);
    indexedDbService.saveMessages([msg]).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
          reactions: msg.reactions,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
      }
    }
  }

  // --- Edit Message ---
  public async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {
    const msgs = this.messagesMap[chatId];
    if (!msgs) return;
    const msg = msgs.find((m) => m.id === messageId);
    if (!msg) return;

    msg.text = newText;
    msg.editedAt = Date.now();
    this.notifyMessages(chatId);
    indexedDbService.saveMessages([msg]).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
          text: newText,
          editedAt: msg.editedAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
      }
    }
  }

  // --- Delete Message ---
  public async deleteMessage(
    chatId: string,
    messageId: string,
    currentUserId: string,
    mode: 'me' | 'everyone' | boolean = 'me'
  ): Promise<void> {
    const msgs = this.messagesMap[chatId];
    if (!msgs) return;

    const msgIndex = msgs.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const isForEveryone = mode === 'everyone' || mode === true;

    if (isForEveryone) {
      msgs[msgIndex].isDeleted = true;
      msgs[msgIndex].text = 'This message was deleted';
      msgs[msgIndex].attachments = [];
      this.notifyMessages(chatId);
      indexedDbService.saveMessages([msgs[msgIndex]]).catch(() => {});

      const db = getFirebaseDb();
      if (isLiveFirebase() && db) {
        try {
          await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
            isDeleted: true,
            text: 'This message was deleted',
            attachments: [],
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`);
        }
      }
    } else {
      const msg = msgs[msgIndex];
      if (!msg.deletedFor) msg.deletedFor = [];
      if (!msg.deletedFor.includes(currentUserId)) {
        msg.deletedFor.push(currentUserId);
      }
      msgs.splice(msgIndex, 1);
      this.notifyMessages(chatId);
      indexedDbService.deleteMessage(messageId).catch(() => {});

      const db = getFirebaseDb();
      if (isLiveFirebase() && db) {
        try {
          await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
            deletedFor: msg.deletedFor,
          });
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  public async deleteMessageForMe(chatId: string, messageId: string, currentUserId: string): Promise<void> {
    return this.deleteMessage(chatId, messageId, currentUserId, 'me');
  }

  public async deleteMessageForEveryone(chatId: string, messageId: string): Promise<void> {
    return this.deleteMessage(chatId, messageId, '', 'everyone');
  }

  // --- Chat Pin/Mute/Archive Actions ---
  public async togglePinChat(chatId: string, userId?: string): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.isPinned = !chat.isPinned;
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});

      const db = getFirebaseDb();
      if (isLiveFirebase() && db) {
        try {
          await updateDoc(doc(db, 'chats', chatId), {
            isPinned: chat.isPinned,
          });
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  public async toggleMuteChat(chatId: string, userId?: string): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.isMuted = !chat.isMuted;
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});

      const db = getFirebaseDb();
      if (isLiveFirebase() && db) {
        try {
          await updateDoc(doc(db, 'chats', chatId), {
            isMuted: chat.isMuted,
          });
        } catch (err) {
          // Ignore
        }
      }
    }
  }

  public async toggleArchiveChat(chatId: string): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.isArchived = !chat.isArchived;
      this.notifyChats();
      indexedDbService.saveChats(this.chats).catch(() => {});
    }
  }

  public async deleteChat(chatId: string): Promise<void> {
    this.chats = this.chats.filter((c) => c.id !== chatId);
    delete this.messagesMap[chatId];
    this.notifyChats();
    indexedDbService.saveChats(this.chats).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'chats', chatId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}`);
      }
    }
  }

  // --- Group Management ---
  public async createGroup(
    name: string,
    description: string,
    memberContacts: Contact[],
    creator: UserProfile,
    avatarColor: string = 'from-emerald-600 to-teal-800',
    avatarUrl?: string
  ): Promise<Chat> {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const members: GroupMember[] = [
      {
        userId: creator.id,
        displayName: creator.displayName,
        username: creator.username,
        avatarColor: creator.avatarColor,
        avatarUrl: creator.avatarUrl,
        role: 'admin',
        joinedAt: Date.now(),
      },
      ...memberContacts.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        username: c.username,
        avatarColor: c.avatarColor,
        avatarUrl: c.avatarUrl,
        role: 'member' as const,
        joinedAt: Date.now(),
      })),
    ];

    const newGroupChat: Chat = {
      id: groupId,
      type: 'group',
      name,
      description,
      avatarColor,
      avatarUrl: avatarUrl || '',
      participants: members.map((m) => m.userId),
      createdBy: creator.id,
      admins: [creator.id],
      members,
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastMessage: {
        text: `${creator.displayName} created the group "${name}"`,
        senderId: creator.id,
        senderName: creator.displayName,
        timestamp: Date.now(),
        type: 'system',
      },
    };

    this.chats.unshift(newGroupChat);
    const sysMsg: Message = {
      id: `sys_msg_${Date.now()}`,
      chatId: groupId,
      senderId: creator.id,
      senderName: 'System',
      text: `${creator.displayName} created the group "${name}"`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    this.messagesMap[groupId] = [sysMsg];
    this.notifyChats();
    indexedDbService.saveChats(this.chats).catch(() => {});
    indexedDbService.saveMessages([sysMsg]).catch(() => {});

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'chats', groupId), newGroupChat);
        await setDoc(doc(db, `chats/${groupId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${groupId}`);
      }
    }

    return newGroupChat;
  }

  public async createGroupChat(
    arg1: UserProfile | string,
    arg2: string,
    arg3: string | UserProfile,
    arg4: Contact[],
    arg5?: string,
    arg6?: string
  ): Promise<Chat> {
    if (typeof arg1 === 'string') {
      const name = arg1;
      const description = arg2;
      const creator = arg3 as UserProfile;
      const memberContacts = arg4 || [];
      const avatarUrl = arg5;
      return this.createGroup(name, description, memberContacts, creator, 'from-emerald-600 to-teal-800', avatarUrl);
    } else {
      const creator = arg1;
      const name = arg2;
      const description = arg3 as string;
      const memberContacts = arg4 || [];
      const avatarColor = arg5 || 'from-emerald-600 to-teal-800';
      const avatarUrl = arg6;
      return this.createGroup(name, description, memberContacts, creator, avatarColor, avatarUrl);
    }
  }

  public async addGroupMember(
    chatId: string,
    contact: Contact,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group' || !chat.members) return;

    if (chat.members.some((m) => m.userId === contact.userId)) return;

    const newMember: GroupMember = {
      userId: contact.userId,
      displayName: contact.displayName,
      username: contact.username,
      avatarColor: contact.avatarColor,
      avatarUrl: contact.avatarUrl,
      role: 'member',
      joinedAt: Date.now(),
    };

    chat.members.push(newMember);
    chat.participants.push(contact.userId);

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: currentUserId || 'sys',
      senderName: 'System',
      text: `${currentUserName || 'Admin'} added ${contact.displayName}`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          members: chat.members,
          participants: chat.participants,
          updatedAt: Date.now(),
          lastMessage: {
            text: sysMsg.text,
            senderId: sysMsg.senderId,
            senderName: sysMsg.senderName,
            timestamp: sysMsg.timestamp,
            type: 'system',
          },
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  public async removeGroupMember(
    chatId: string,
    memberId: string,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group' || !chat.members) return;

    const memberToRemove = chat.members.find((m) => m.userId === memberId);
    if (!memberToRemove) return;

    chat.members = chat.members.filter((m) => m.userId !== memberId);
    chat.participants = chat.participants.filter((p) => p !== memberId);
    if (chat.admins) {
      chat.admins = chat.admins.filter((a) => a !== memberId);
    }

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: currentUserId || 'sys',
      senderName: 'System',
      text: `${currentUserName || 'Admin'} removed ${memberToRemove.displayName}`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          members: chat.members,
          participants: chat.participants,
          admins: chat.admins || [],
          updatedAt: Date.now(),
          lastMessage: {
            text: sysMsg.text,
            senderId: sysMsg.senderId,
            senderName: sysMsg.senderName,
            timestamp: sysMsg.timestamp,
            type: 'system',
          },
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  public async promoteGroupAdmin(
    chatId: string,
    memberId: string,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group' || !chat.members) return;

    const member = chat.members.find((m) => m.userId === memberId);
    if (!member) return;

    member.role = 'admin';
    if (!chat.admins) chat.admins = [];
    if (!chat.admins.includes(memberId)) {
      chat.admins.push(memberId);
    }

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: currentUserId || 'sys',
      senderName: 'System',
      text: `${currentUserName || 'Admin'} promoted ${member.displayName} to Group Admin`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          members: chat.members,
          admins: chat.admins,
          updatedAt: Date.now(),
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  public async demoteGroupAdmin(
    chatId: string,
    memberId: string,
    currentUserId?: string,
    currentUserName?: string
  ): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group' || !chat.members) return;

    if (chat.admins && chat.admins.length <= 1) {
      throw new Error('Group must have at least one administrator');
    }

    const member = chat.members.find((m) => m.userId === memberId);
    if (!member) return;

    member.role = 'member';
    if (chat.admins) {
      chat.admins = chat.admins.filter((a) => a !== memberId);
    }

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: currentUserId || 'sys',
      senderName: 'System',
      text: `${currentUserName || 'Admin'} dismissed ${member.displayName} as Admin`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          members: chat.members,
          admins: chat.admins || [],
          updatedAt: Date.now(),
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  public async updateGroupInfo(
    chatId: string,
    updates: { name?: string; description?: string; avatarColor?: string; avatarUrl?: string },
    currentUserId?: string,
    currentUserName?: string
  ): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group') return;

    if (updates.name) chat.name = updates.name;
    if (updates.description !== undefined) chat.description = updates.description;
    if (updates.avatarColor) chat.avatarColor = updates.avatarColor;
    if (updates.avatarUrl !== undefined) chat.avatarUrl = updates.avatarUrl;

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: currentUserId || 'sys',
      senderName: 'System',
      text: `${currentUserName || 'Admin'} updated the group details`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          name: chat.name,
          description: chat.description || '',
          avatarColor: chat.avatarColor || '',
          avatarUrl: chat.avatarUrl || '',
          updatedAt: Date.now(),
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  public async leaveGroup(chatId: string, userId: string, userName?: string): Promise<void> {
    const chat = this.chats.find((c) => c.id === chatId);
    if (!chat || chat.type !== 'group' || !chat.members) return;

    const member = chat.members.find((m) => m.userId === userId);
    const wasAdmin = chat.admins?.includes(userId) || member?.role === 'admin';

    chat.members = chat.members.filter((m) => m.userId !== userId);
    chat.participants = chat.participants.filter((p) => p !== userId);
    if (chat.admins) {
      chat.admins = chat.admins.filter((a) => a !== userId);
    }

    // If leaving member was the sole admin and other members remain, auto-promote the oldest member
    if (wasAdmin && (!chat.admins || chat.admins.length === 0) && chat.members.length > 0) {
      chat.members[0].role = 'admin';
      chat.admins = [chat.members[0].userId];
    }

    const sysMsg: Message = {
      id: `sys_${Date.now()}`,
      chatId,
      senderId: userId,
      senderName: 'System',
      text: `${userName || member?.displayName || 'User'} left the group`,
      type: 'system',
      status: 'read',
      timestamp: Date.now(),
    };

    if (!this.messagesMap[chatId]) this.messagesMap[chatId] = [];
    this.messagesMap[chatId].push(sysMsg);
    this.notifyMessages(chatId);
    this.notifyChats();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          members: chat.members,
          participants: chat.participants,
          admins: chat.admins || [],
          updatedAt: Date.now(),
          lastMessage: {
            text: sysMsg.text,
            senderId: sysMsg.senderId,
            senderName: sysMsg.senderName,
            timestamp: sysMsg.timestamp,
            type: 'system',
          },
        });
        await setDoc(doc(db, `chats/${chatId}/messages`, sysMsg.id), sysMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}`);
      }
    }
  }

  // --- Contacts & Direct Chat ---
  public getContacts(): Contact[] {
    return this.contacts;
  }

  public async createDirectChat(currentUser: UserProfile, contact: Contact): Promise<Chat> {
    // 1. Check if direct chat between these two users already exists in memory
    const existing = this.chats.find(
      (c) =>
        c.type === 'direct' &&
        c.participants.includes(contact.userId) &&
        c.participants.includes(currentUser.id)
    );
    if (existing) {
      return existing;
    }

    // 2. Deterministic conversation ID to prevent duplicate chats between two users
    const sortedIds = [currentUser.id, contact.userId].sort();
    const chatId = `direct_${sortedIds[0].replace(/[^a-zA-Z0-9_-]/g, '')}_${sortedIds[1].replace(/[^a-zA-Z0-9_-]/g, '')}`;

    // 3. Check Firestore for this exact direct chat if live
    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        const docSnap = await getDoc(doc(db, 'chats', chatId));
        if (docSnap.exists()) {
          const foundChat = { ...docSnap.data(), id: docSnap.id } as Chat;
          if (!this.chats.some((c) => c.id === foundChat.id)) {
            this.chats.unshift(foundChat);
            this.notifyChats();
          }
          return foundChat;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `chats/${chatId}`);
      }
    }

    const newChat: Chat = {
      id: chatId,
      type: 'direct',
      name: contact.displayName,
      avatarUrl: contact.avatarUrl,
      avatarColor: contact.avatarColor || 'from-emerald-500 to-teal-700',
      description: contact.about,
      participants: [currentUser.id, contact.userId],
      participantProfiles: {
        [contact.userId]: {
          displayName: contact.displayName,
          username: contact.username,
          about: contact.about,
          avatarUrl: contact.avatarUrl,
          isOnline: contact.isOnline,
          lastSeen: contact.lastSeen,
          phone: contact.phone,
        },
        [currentUser.id]: {
          displayName: currentUser.displayName,
          username: currentUser.username,
          about: currentUser.about,
          avatarUrl: currentUser.avatarUrl,
          isOnline: currentUser.isOnline,
          lastSeen: currentUser.lastSeen,
        },
      },
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.chats.unshift(newChat);
    this.messagesMap[newChat.id] = [];
    this.notifyChats();
    indexedDbService.saveChats(this.chats).catch(() => {});

    if (isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'chats', chatId), newChat);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}`);
      }
    }

    return newChat;
  }
}

export const firestoreService = new FirestoreService();
