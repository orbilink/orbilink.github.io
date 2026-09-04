import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  setLogLevel,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import {
  getFirebaseConfig,
  validateFirebaseConfig,
  FirebaseConfigValidation,
} from '../../config/firebase.config';

// Suppress internal Firestore connection warnings from being logged to console or treated as runtime uncaught errors
try {
  setLogLevel('silent');
} catch {
  // Ignore if not supported in environment
}

export interface FirebaseDiagnosticState {
  configLoaded: boolean;
  isComplete: boolean;
  missingVars: string[];
  presentVars: string[];
  appInitialized: boolean;
  authInitialized: boolean;
  firestoreInitialized: boolean;
  storageInitialized: boolean;
  initializationError: string | null;
  projectId?: string;
  authDomain?: string;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initializationError: string | null = null;

let isInitAttempted = false;

export const initFirebase = (): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  diagnostics: FirebaseDiagnosticState;
} => {
  if (isInitAttempted && app && auth && db) {
    return {
      app,
      auth,
      db,
      storage,
      diagnostics: getFirebaseDiagnostics(),
    };
  }

  isInitAttempted = true;
  initializationError = null;

  const validation = validateFirebaseConfig();

  if (!validation.isComplete) {
    initializationError = `Missing required Firebase environment variables: ${validation.missingKeys.join(', ')}`;
    console.warn(`[RYNOX Firebase] Initialization halted: ${initializationError}`);
    return {
      app: null,
      auth: null,
      db: null,
      storage: null,
      diagnostics: getFirebaseDiagnostics(),
    };
  }

  try {
    const config = getFirebaseConfig();

    // 1. Initialize Firebase App (Singleton check)
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(config as Record<string, string>);
    }

    // 2. Initialize Firebase Auth
    if (app) {
      auth = getAuth(app);
    }

    // 3. Initialize Cloud Firestore with multi-tab persistent cache and connection resilience
    if (app) {
      try {
        db = initializeFirestore(app, {
          experimentalAutoDetectLongPolling: true,
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        try {
          db = initializeFirestore(app, {
            experimentalForceLongPolling: true,
          });
        } catch {
          db = getFirestore(app);
        }
      }
    }

    // 4. Initialize Firebase Storage
    if (app) {
      try {
        storage = getStorage(app);
      } catch (storageErr) {
        console.warn('[RYNOX Firebase] Storage initialization error:', storageErr);
      }
    }

    console.log('[RYNOX Firebase] Successfully initialized Firebase backend services.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    initializationError = message;
    console.error('[RYNOX Firebase] Fatal initialization error:', err);
  }

  return {
    app,
    auth,
    db,
    storage,
    diagnostics: getFirebaseDiagnostics(),
  };
};

export const getFirebaseDiagnostics = (): FirebaseDiagnosticState => {
  const validation: FirebaseConfigValidation = validateFirebaseConfig();
  return {
    configLoaded: validation.presentKeys.length > 0,
    isComplete: validation.isComplete,
    missingVars: validation.missingKeys,
    presentVars: validation.presentKeys,
    appInitialized: Boolean(app),
    authInitialized: Boolean(auth),
    firestoreInitialized: Boolean(db),
    storageInitialized: Boolean(storage),
    initializationError,
    projectId: validation.config.projectId,
    authDomain: validation.config.authDomain,
  };
};

// Auto-initialize eagerly on module load
try {
  initFirebase();
} catch (e) {
  console.warn('[RYNOX Firebase] Top-level initialization caught:', e);
}

export const getFirebaseAuth = (): Auth | null => {
  if (!auth) {
    initFirebase();
  }
  return auth;
};

export const getFirebaseDb = (): Firestore | null => {
  if (!db) {
    initFirebase();
  }
  return db;
};

export const getFirebaseStorage = (): FirebaseStorage | null => {
  if (!storage) {
    initFirebase();
  }
  return storage;
};

export const isLiveFirebase = (): boolean => {
  return Boolean(app && auth && db);
};
