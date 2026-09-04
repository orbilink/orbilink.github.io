import firebaseAppletConfig from '../../firebase-applet-config.json';

/**
 * Firebase Configuration for ORBILINK
 * 
 * Required Environment Variables (Vite Client):
 * - VITE_FIREBASE_API_KEY
 * - VITE_FIREBASE_AUTH_DOMAIN
 * - VITE_FIREBASE_PROJECT_ID
 * - VITE_FIREBASE_STORAGE_BUCKET
 * - VITE_FIREBASE_MESSAGING_SENDER_ID
 * - VITE_FIREBASE_APP_ID
 */

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebaseConfigValidation {
  isComplete: boolean;
  missingKeys: string[];
  presentKeys: string[];
  config: FirebaseConfig;
}

const cleanEnvVar = (val: unknown): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  // Remove wrapping quotes if present
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed.length > 0 ? trimmed : undefined;
};

// Existing project configuration fallback from firebase-applet-config.json
const fallbackAppletConfig: FirebaseConfig = {
  apiKey: cleanEnvVar(firebaseAppletConfig?.apiKey),
  authDomain: cleanEnvVar(firebaseAppletConfig?.authDomain),
  projectId: cleanEnvVar(firebaseAppletConfig?.projectId),
  storageBucket: cleanEnvVar(firebaseAppletConfig?.storageBucket),
  messagingSenderId: cleanEnvVar(firebaseAppletConfig?.messagingSenderId),
  appId: cleanEnvVar(firebaseAppletConfig?.appId),
};

export const getFirebaseConfig = (): FirebaseConfig => {
  return {
    apiKey: cleanEnvVar(import.meta.env.VITE_FIREBASE_API_KEY) || fallbackAppletConfig.apiKey,
    authDomain: cleanEnvVar(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || fallbackAppletConfig.authDomain,
    projectId: cleanEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID) || fallbackAppletConfig.projectId,
    storageBucket: cleanEnvVar(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || fallbackAppletConfig.storageBucket,
    messagingSenderId: cleanEnvVar(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || fallbackAppletConfig.messagingSenderId,
    appId: cleanEnvVar(import.meta.env.VITE_FIREBASE_APP_ID) || fallbackAppletConfig.appId,
  };
};

export const validateFirebaseConfig = (): FirebaseConfigValidation => {
  const config = getFirebaseConfig();
  const keys: Array<keyof FirebaseConfig> = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingKeys: string[] = [];
  const presentKeys: string[] = [];

  keys.forEach((key) => {
    const envName = `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    if (config[key]) {
      presentKeys.push(envName);
    } else {
      missingKeys.push(envName);
    }
  });

  return {
    isComplete: missingKeys.length === 0,
    missingKeys,
    presentKeys,
    config,
  };
};

export const isFirebaseConfigured = (): boolean => {
  const { isComplete } = validateFirebaseConfig();
  return isComplete;
};

