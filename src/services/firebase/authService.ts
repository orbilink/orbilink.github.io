import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { UserProfile } from '../../types/user';
import {
  getFirebaseAuth,
  getFirebaseDb,
  isLiveFirebase,
  getFirebaseDiagnostics,
} from './firebaseApp';
import { cryptoService } from '../crypto/cryptoService';
import { indexedDbService } from '../storage/indexedDbService';
import { firestoreService } from './firestoreService';

export const GOOGLE_WORKSPACE_SCOPES = [
  // Google Contacts (People API)
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  // Google Drive API
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
  // Gmail API
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

export const GOOGLE_CONTACTS_SCOPES = GOOGLE_WORKSPACE_SCOPES;

type AuthCallback = (user: UserProfile | null) => void;

export function normalizeUsername(raw: string): string {
  return raw.toLowerCase().trim().replace(/^@+/, '').replace(/[^a-z0-9_]/g, '');
}

export function formatFirebaseError(err: unknown): string {
  if (!err) return 'An unknown error occurred.';
  
  let code = '';
  let msg = '';
  
  if (typeof err === 'object' && err !== null) {
    if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
      code = (err as { code: string }).code;
    }
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      msg = (err as { message: string }).message;
    }
  } else if (typeof err === 'string') {
    msg = err;
  }

  // Exact Firebase Authentication error codes
  if (code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential')) {
    return 'Incorrect password or credentials. Please check your password and try again.';
  }
  if (code === 'auth/wrong-password' || msg.includes('auth/wrong-password')) {
    return 'Incorrect password. Please verify your password or use "Forgot password?".';
  }
  if (code === 'auth/user-not-found' || msg.includes('auth/user-not-found')) {
    return 'No account found with this email or username. Please check your spelling or register.';
  }
  if (code === 'auth/invalid-email' || msg.includes('auth/invalid-email')) {
    return 'The email address format is invalid. Please enter a valid email address (e.g. user@example.com).';
  }
  if (code === 'auth/user-disabled' || msg.includes('auth/user-disabled')) {
    return 'This user account has been disabled. Please contact support.';
  }
  if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
    return 'This email address is already in use by another account. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not enabled in Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Enable Email/Password.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    return 'This app domain is not authorized in Firebase Console. Add this domain under Authentication -> Settings -> Authorized domains.';
  }
  if (code === 'auth/too-many-requests' || msg.includes('auth/too-many-requests')) {
    return 'Access temporarily blocked due to multiple failed login attempts. Please wait a few moments or reset your password.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('auth/network-request-failed')) {
    return 'Network connection error. Unable to reach Firebase Authentication. Please check your internet connection.';
  }
  if (
    msg.includes('Cloud Firestore API has not been used') ||
    msg.includes('firestore.googleapis.com') ||
    msg.includes('API has not been used in project')
  ) {
    const pid = getFirebaseDiagnostics().projectId || 'Firebase';
    return `Cloud Firestore is not yet enabled for project "${pid}". Please enable Firestore Database in the Firebase Console (Firebase Console -> Firestore Database -> Create database).`;
  }
  if (msg.includes('unavailable') || msg.includes('Could not reach Cloud Firestore')) {
    return 'Unable to reach Firebase backend. Operating in local offline mode.';
  }
  if (code === 'permission-denied' || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Firestore security rules blocked access. Please check firestore.rules.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('auth/popup-closed-by-user')) {
    return 'The sign-in window was closed before completing authentication.';
  }
  if (code === 'auth/cancelled-popup-request' || msg.includes('auth/cancelled-popup-request')) {
    return 'The sign-in request was cancelled. Only one sign-in window can be open at a time.';
  }
  if (code === 'auth/popup-blocked' || msg.includes('auth/popup-blocked')) {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this site or try again.';
  }
  if (code === 'auth/account-exists-with-different-credential' || msg.includes('auth/account-exists-with-different-credential')) {
    return 'An account already exists with this email address using another sign-in method. Please sign in with your email and password.';
  }
  if (code === 'auth/credential-already-in-use' || msg.includes('auth/credential-already-in-use')) {
    return 'This Google account credential is already linked to another user.';
  }
  if (code === 'auth/internal-error' || msg.includes('auth/internal-error')) {
    return 'An internal authentication error occurred. Please check your connection and try again.';
  }

  // Clean Firebase prefix if raw message
  const cleaned = msg.replace(/^Firebase:\s*/, '').replace(/\s*\([^)]*\)\.?$/, '');
  return cleaned || 'Authentication failed. Please try again.';
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<AuthCallback> = new Set();
  private isInitialized: boolean = false;
  private presenceInterval: number | null = null;
  private cachedGoogleAccessToken: string | null = null;

  constructor() {
    this.init();
    this.setupPresenceHandlers();
  }

  private async init() {
    // 1. Try to load user from LocalStorage for instant UI hydration
    const savedUserJson = localStorage.getItem('orbilink_active_user') || localStorage.getItem('rynox_active_user');
    if (savedUserJson) {
      try {
        this.currentUser = JSON.parse(savedUserJson);
      } catch {
        this.currentUser = null;
        localStorage.removeItem('orbilink_active_user');
        localStorage.removeItem('rynox_active_user');
      }
    } else {
      this.currentUser = null;
    }

    const auth = getFirebaseAuth();
    if (auth) {
      // Check for redirect result from Google redirect sign-in
      getRedirectResult(auth)
        .then(async (result) => {
          if (result?.user) {
            const profile = await this.fetchOrCreateProfile(result.user);
            this.currentUser = profile;
            localStorage.setItem('orbilink_active_user', JSON.stringify(profile));
            await indexedDbService.saveUser(profile).catch(() => {});
            await this.setOnlinePresence(true);
            this.notify();
          }
        })
        .catch((err) => {
          console.warn('[ORBILINK Auth] getRedirectResult check:', err);
        });

      onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const profile = await this.fetchOrCreateProfile(fbUser);
            this.currentUser = profile;
            localStorage.setItem('orbilink_active_user', JSON.stringify(profile));
            await indexedDbService.saveUser(profile).catch(() => {});
            await this.setOnlinePresence(true);
          } catch (err) {
            console.error('[ORBILINK Auth] Error syncing profile for auth user:', err);
          }
        } else {
          this.currentUser = null;
          this.cachedGoogleAccessToken = null;
          localStorage.removeItem('orbilink_active_user');
          localStorage.removeItem('rynox_active_user');
        }
        this.isInitialized = true;
        this.notify();
      });
    } else {
      const diag = getFirebaseDiagnostics();
      console.warn('[ORBILINK Auth] Firebase Auth not available on startup:', diag.initializationError);
      this.isInitialized = true;
      this.notify();
    }
  }

  private setupPresenceHandlers() {
    if (typeof window === 'undefined') return;

    // Window visibility changes
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.setOnlinePresence(true);
      } else {
        this.setOnlinePresence(false);
      }
    });

    // Window unload
    window.addEventListener('beforeunload', () => {
      this.setOnlinePresence(false);
    });

    // Periodic presence ping every 60s
    this.presenceInterval = window.setInterval(() => {
      if (this.currentUser && document.visibilityState === 'visible') {
        this.setOnlinePresence(true);
      }
    }, 60000);
  }

  public onAuthChange(callback: AuthCallback): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public async setOnlinePresence(isOnline: boolean): Promise<void> {
    if (!this.currentUser) return;
    const now = Date.now();
    this.currentUser.isOnline = isOnline;
    this.currentUser.lastSeen = now;

    const db = getFirebaseDb();
    if (isLiveFirebase() && db && this.currentUser.id) {
      try {
        const userRef = doc(db, 'users', this.currentUser.id);
        await updateDoc(userRef, {
          isOnline,
          lastSeen: now,
          updatedAt: now,
        });
      } catch {
        // Silently catch in case user document was not yet created or connection is offline
      }
    }
  }

  /**
   * Check if a username is available in the atomic usernames collection
   */
  public async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const clean = normalizeUsername(username);
    if (clean.length < 2 || clean.length > 30) return false;

    const db = getFirebaseDb();
    if (!db) return true;

    try {
      const snap = await getDoc(doc(db, 'usernames', clean));
      if (!snap.exists()) return true;
      const data = snap.data();
      if (excludeUserId && data && data.uid === excludeUserId) {
        return true;
      }
      return false;
    } catch {
      // Fallback check against users collection without generating loud console warnings when offline
      try {
        const q = query(collection(db, 'users'), where('username', '==', clean));
        const userSnap = await getDocs(q);
        if (userSnap.empty) return true;
        if (excludeUserId && userSnap.docs.length === 1 && userSnap.docs[0].id === excludeUserId) {
          return true;
        }
        return false;
      } catch {
        return true;
      }
    }
  }

  public async signIn(emailOrUsername: string, password: string): Promise<UserProfile> {
    const input = emailOrUsername.trim();
    if (!input) {
      throw new Error('Please enter your email or username.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    if (!auth) {
      const diag = getFirebaseDiagnostics();
      throw new Error(
        `Firebase Authentication is not initialized. ${diag.initializationError || 'Check your environment variables.'}`
      );
    }

    let emailToUse = input;

    // Check if input is an email address
    if (input.includes('@')) {
      emailToUse = input.toLowerCase();
    } else {
      // Input is a username: clean it and resolve via Firestore usernames collection
      const cleanUser = normalizeUsername(input);
      if (!cleanUser) {
        throw new Error('Please enter a valid email or username.');
      }

      if (!db) {
        throw new Error('Database is unavailable to resolve username. Please sign in using your email address.');
      }

      try {
        const unameSnap = await getDoc(doc(db, 'usernames', cleanUser));
        if (unameSnap.exists()) {
          const unameData = unameSnap.data();
          if (unameData?.email) {
            emailToUse = unameData.email.trim().toLowerCase();
          } else if (unameData?.uid) {
            const userSnap = await getDoc(doc(db, 'users', unameData.uid));
            if (userSnap.exists() && userSnap.data()?.email) {
              emailToUse = userSnap.data().email.trim().toLowerCase();
            } else {
              throw new Error(`Account email not found for username @${cleanUser}. Please sign in using your email.`);
            }
          } else {
            throw new Error(`Account details missing for username @${cleanUser}. Please sign in using your email.`);
          }
        } else {
          // If not found in usernames collection, check users collection
          const q = query(collection(db, 'users'), where('username', '==', cleanUser));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const userData = snap.docs[0].data() as UserProfile;
            if (userData.email) {
              emailToUse = userData.email.trim().toLowerCase();
            } else {
              throw new Error(`Account email not found for username @${cleanUser}. Please sign in using your email.`);
            }
          } else {
            throw new Error(`No account found with username @${cleanUser}. Please check your username or sign in with your email.`);
          }
        }
      } catch (lookupErr: unknown) {
        if (lookupErr instanceof Error) {
          if (
            lookupErr.message.includes('No account found with username') ||
            lookupErr.message.includes('Account email not found') ||
            lookupErr.message.includes('Account details missing')
          ) {
            throw lookupErr;
          }
        }
        console.warn('[ORBILINK Auth] Could not resolve username to email:', lookupErr);
        throw new Error(`Could not resolve username @${cleanUser}. Please try signing in with your email address.`);
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
      const profile = await this.fetchOrCreateProfile(cred.user);
      this.currentUser = profile;
      localStorage.setItem('orbilink_active_user', JSON.stringify(profile));
      await indexedDbService.saveUser(profile).catch(() => {});
      await this.setOnlinePresence(true);
      this.notify();
      return profile;
    } catch (err: unknown) {
      throw new Error(formatFirebaseError(err));
    }
  }

  public getGoogleAccessToken(): string | null {
    return this.cachedGoogleAccessToken;
  }

  public setGoogleAccessToken(token: string | null): void {
    this.cachedGoogleAccessToken = token;
  }

  public async requestGoogleWorkspaceAccess(): Promise<string> {
    return this.requestGoogleContactsAccess();
  }

  public async requestGoogleContactsAccess(): Promise<string> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized.');
    }

    const provider = new GoogleAuthProvider();
    GOOGLE_CONTACTS_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'consent select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        this.cachedGoogleAccessToken = credential.accessToken;
        return credential.accessToken;
      }
      throw new Error('No access token returned from Google. Please grant permission.');
    } catch (err: unknown) {
      throw new Error(formatFirebaseError(err));
    }
  }

  public async signInWithGoogle(): Promise<UserProfile> {
    const auth = getFirebaseAuth();
    if (!auth) {
      const diag = getFirebaseDiagnostics();
      throw new Error(
        `Firebase Authentication is not initialized. ${diag.initializationError || 'Check your environment variables.'}`
      );
    }

    const provider = new GoogleAuthProvider();
    GOOGLE_CONTACTS_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      let fbUser: FirebaseUser;
      try {
        const result = await signInWithPopup(auth, provider);
        fbUser = result.user;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          this.cachedGoogleAccessToken = credential.accessToken;
        }
      } catch (popupErr: unknown) {
        const errCode = (popupErr as { code?: string })?.code || '';
        if (errCode === 'auth/popup-blocked' || errCode === 'auth/cancelled-popup-request') {
          // If popup is blocked by browser, try redirect flow
          await signInWithRedirect(auth, provider);
          throw new Error('Redirecting to Google Sign-In...');
        } else {
          throw popupErr;
        }
      }

      const profile = await this.fetchOrCreateProfile(fbUser);
      this.currentUser = profile;
      localStorage.setItem('orbilink_active_user', JSON.stringify(profile));
      await indexedDbService.saveUser(profile).catch(() => {});
      await this.setOnlinePresence(true);
      this.notify();
      return profile;
    } catch (err: unknown) {
      throw new Error(formatFirebaseError(err));
    }
  }

  public async signUp(
    displayName: string,
    username: string,
    email: string,
    password: string
  ): Promise<UserProfile> {
    const cleanUsername = normalizeUsername(username);
    const cleanDisplayName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanDisplayName) {
      throw new Error('Display Name is required.');
    }
    if (cleanDisplayName.length > 60) {
      throw new Error('Display Name must be 60 characters or fewer.');
    }
    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      throw new Error('Username must be between 2 and 30 characters.');
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      throw new Error('Username can only contain lowercase letters, numbers, and underscores.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const auth = getFirebaseAuth();
    const db = getFirebaseDb();

    if (!auth) {
      const diag = getFirebaseDiagnostics();
      throw new Error(
        `Firebase Authentication is not initialized. ${diag.initializationError || 'Check your environment variables.'}`
      );
    }

    // Pre-check availability
    const available = await this.isUsernameAvailable(cleanUsername);
    if (!available) {
      throw new Error(`Username @${cleanUsername} is already taken. Please choose another.`);
    }

    const fingerprint = await cryptoService.computeFingerprint(cleanEmail + cleanUsername);

    try {
      // 1. Create user in Firebase Authentication
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await fbUpdateProfile(cred.user, { displayName: cleanDisplayName });

      const uid = cred.user.uid;
      const now = Date.now();

      const newProfile: UserProfile = {
        id: uid,
        uid: uid,
        email: cleanEmail,
        displayName: cleanDisplayName,
        username: cleanUsername,
        photoURL: '',
        avatarUrl: '',
        avatarColor: 'from-emerald-500 to-teal-700',
        about: 'Hey there! I am using ORBILINK.',
        isOnline: true,
        lastSeen: now,
        createdAt: now,
        updatedAt: now,
        publicKeyFingerprint: fingerprint,
      };

      // 2. Transactionally reserve username with email and create user document in Firestore
      if (db) {
        try {
          await runTransaction(db, async (transaction) => {
            const usernameRef = doc(db, 'usernames', cleanUsername);
            const usernameSnap = await transaction.get(usernameRef);

            if (usernameSnap.exists() && usernameSnap.data()?.uid !== uid) {
              throw new Error(`Username @${cleanUsername} is already taken.`);
            }

            const userRef = doc(db, 'users', uid);
            transaction.set(usernameRef, {
              uid: uid,
              email: cleanEmail,
              createdAt: now,
            });
            transaction.set(userRef, newProfile);
          });
          firestoreService.markOperationSuccess();
        } catch (dbErr) {
          console.warn('[ORBILINK Auth] Firestore transaction error, attempting direct doc write:', dbErr);
          await setDoc(doc(db, 'users', uid), newProfile);
          await setDoc(doc(db, 'usernames', cleanUsername), { uid, email: cleanEmail, createdAt: now });
          firestoreService.markOperationSuccess();
        }

        // 3. Verify user profile document can be read back from Firestore
        try {
          const userDocSnap = await getDoc(doc(db, 'users', uid));
          if (userDocSnap.exists()) {
            firestoreService.markOperationSuccess();
          }
        } catch {
          // Document written locally or sync pending
        }
      }

      this.currentUser = newProfile;
      localStorage.setItem('orbilink_active_user', JSON.stringify(newProfile));
      await indexedDbService.saveUser(newProfile).catch(() => {});
      this.notify();
      return newProfile;
    } catch (err: unknown) {
      throw new Error(formatFirebaseError(err));
    }
  }

  public async resetPassword(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not initialized.');
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      throw new Error(formatFirebaseError(err));
    }
  }

  public async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.currentUser) throw new Error('No authenticated user');

    const uid = this.currentUser.id;
    const db = getFirebaseDb();
    const now = Date.now();
    const oldUsername = this.currentUser.username;
    let newUsername = this.currentUser.username;

    if (updates.username && updates.username !== this.currentUser.username) {
      newUsername = normalizeUsername(updates.username);
      if (newUsername.length < 2 || newUsername.length > 30) {
        throw new Error('Username must be between 2 and 30 characters.');
      }
      if (!/^[a-z0-9_]+$/.test(newUsername)) {
        throw new Error('Username can only contain lowercase letters, numbers, and underscores.');
      }

      const available = await this.isUsernameAvailable(newUsername, uid);
      if (!available) {
        throw new Error(`Username @${newUsername} is already taken.`);
      }
    }

    const updatedProfile: UserProfile = {
      ...this.currentUser,
      ...updates,
      id: uid,
      username: newUsername,
      updatedAt: now,
    };

    // Clean undefined fields to avoid Firestore SDK serialization crashes
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatedProfile)) {
      if (v !== undefined) {
        cleanPayload[k] = v;
      }
    }
    // Ensure essential fields exist
    cleanPayload.id = uid;
    cleanPayload.uid = uid;
    if (typeof cleanPayload.displayName !== 'string' || !cleanPayload.displayName.trim()) {
      cleanPayload.displayName = this.currentUser.displayName || 'ORBILINK User';
    }

    if (isLiveFirebase() && db) {
      try {
        if (newUsername !== oldUsername) {
          // Transaction to atomically swap username reservation
          await runTransaction(db, async (transaction) => {
            const newUnameRef = doc(db, 'usernames', newUsername);
            const newUnameSnap = await transaction.get(newUnameRef);
            if (newUnameSnap.exists() && newUnameSnap.data()?.uid !== uid) {
              throw new Error(`Username @${newUsername} is already in use.`);
            }

            const oldUnameRef = doc(db, 'usernames', oldUsername);
            const userRef = doc(db, 'users', uid);

            transaction.set(newUnameRef, { uid, email: this.currentUser?.email || '', createdAt: now });
            if (oldUsername) {
              transaction.delete(oldUnameRef);
            }
            transaction.set(userRef, cleanPayload, { merge: true });
          });
        } else {
          await setDoc(doc(db, 'users', uid), cleanPayload, { merge: true });
        }
      } catch (err: unknown) {
        console.warn('[ORBILINK Auth] Cloud Firestore profile update notice:', err);
        // If Firestore write fails, we continue to save locally so user is not blocked
      }
    }

    this.currentUser = updatedProfile;
    localStorage.setItem('orbilink_active_user', JSON.stringify(updatedProfile));
    await indexedDbService.saveUser(updatedProfile).catch(() => {});
    this.notify();
    return updatedProfile;
  }

  public async switchAccount(profile: UserProfile): Promise<void> {
    this.currentUser = profile;
    localStorage.setItem('orbilink_active_user', JSON.stringify(profile));
    await indexedDbService.saveUser(profile).catch(() => {});
    this.notify();
  }

  public async signOut(): Promise<void> {
    try {
      await this.setOnlinePresence(false).catch(() => {});
    } catch {
      // Ignore presence update error during logout
    }

    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch {
        // Continue clean local signout
      }
    }

    // Force clear all local states and caches
    this.currentUser = null;
    this.cachedGoogleAccessToken = null;
    try {
      localStorage.removeItem('orbilink_active_user');
      localStorage.removeItem('rynox_active_user');
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }

    this.notify();
  }

  private async fetchOrCreateProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    // 1. Check local memory & persistent storage cache first for instant hydration & offline support
    if (this.currentUser && (this.currentUser.uid === fbUser.uid || this.currentUser.id === fbUser.uid)) {
      return this.currentUser;
    }
    const savedUserJson = localStorage.getItem('orbilink_active_user') || localStorage.getItem('rynox_active_user');
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson) as UserProfile;
        if (parsed.uid === fbUser.uid || parsed.id === fbUser.uid) {
          return parsed;
        }
      } catch {
        // Continue
      }
    }
    const idbProfile = await indexedDbService.getUser(fbUser.uid).catch(() => null);
    if (idbProfile) {
      return idbProfile;
    }

    const db = getFirebaseDb();
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          return {
            ...data,
            id: fbUser.uid,
            uid: fbUser.uid,
          } as UserProfile;
        }
      } catch {
        // If offline or document does not exist yet, build initial profile
      }
    }

    const email = fbUser.email || '';
    let baseUsername = (email.split('@')[0] || `user_${fbUser.uid.substring(0, 6)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
    if (baseUsername.length < 2) {
      baseUsername = `user_${fbUser.uid.substring(0, 6).toLowerCase()}`;
    }
    if (baseUsername.length > 25) {
      baseUsername = baseUsername.substring(0, 25);
    }

    let chosenUsername = baseUsername;
    const isAvail = await this.isUsernameAvailable(chosenUsername, fbUser.uid);
    if (!isAvail) {
      chosenUsername = `${baseUsername.substring(0, 20)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const fingerprint = await cryptoService.computeFingerprint(email || fbUser.uid);
    const now = Date.now();

    const newProfile: UserProfile = {
      id: fbUser.uid,
      uid: fbUser.uid,
      email,
      displayName: fbUser.displayName || chosenUsername,
      username: chosenUsername,
      photoURL: fbUser.photoURL || '',
      avatarUrl: fbUser.photoURL || '',
      avatarColor: 'from-emerald-500 to-teal-700',
      about: 'Hey there! I am using ORBILINK.',
      isOnline: true,
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
      publicKeyFingerprint: fingerprint,
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), newProfile);
        await setDoc(doc(db, 'usernames', chosenUsername), { uid: fbUser.uid, email, createdAt: now }).catch(() => {});
        firestoreService.markOperationSuccess();
      } catch {
        // Document will be synced automatically when client is online
      }
    }

    return newProfile;
  }
}

export const authService = new AuthService();

