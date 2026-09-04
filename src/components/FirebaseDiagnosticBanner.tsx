import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Database,
  Cpu,
} from 'lucide-react';
import {
  firestoreService,
  FirestoreConnectionState,
} from '../services/firebase/firestoreService';
import {
  getFirebaseDiagnostics,
  FirebaseDiagnosticState,
  initFirebase,
} from '../services/firebase/firebaseApp';

export const FirebaseDiagnosticBanner: React.FC = () => {
  const [connState, setConnState] = useState<FirestoreConnectionState>(
    firestoreService.getConnectionState()
  );
  const [diagnostics, setDiagnostics] = useState<FirebaseDiagnosticState>(
    getFirebaseDiagnostics()
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    const unsub = firestoreService.subscribeConnectionStatus((state) => {
      setConnState(state);
    });
    setDiagnostics(getFirebaseDiagnostics());
    return () => {
      unsub();
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      initFirebase();
      setDiagnostics(getFirebaseDiagnostics());
      await firestoreService.retryConnection();
    } finally {
      setTimeout(() => setIsRetrying(false), 300);
    }
  };

  // If configuration is missing or app initialization completely failed
  if (!diagnostics.configLoaded || !diagnostics.appInitialized || diagnostics.initializationError) {
    return (
      <div
        id="firestore-status-error"
        className="w-full p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs space-y-2.5 shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-bold text-rose-300">Firebase Initialization Error</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-2.5 py-1 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-semibold text-[11px] flex items-center gap-1 border border-rose-700 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
        <p className="text-[11px] text-rose-300 font-mono break-all leading-relaxed">
          {diagnostics.initializationError || 'Required Firebase configuration keys are missing.'}
        </p>
      </div>
    );
  }

  // If Firestore is verified & active
  if (connState.status === 'connected') {
    return (
      <div
        id="firestore-status-connected"
        className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono mx-auto transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-[11px]">Firestore connected</span>
      </div>
    );
  }

  // If Firestore is currently testing/probing connection
  if (connState.status === 'checking') {
    return (
      <div
        id="firestore-status-checking"
        className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono mx-auto transition-all"
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
        <span className="font-semibold text-[11px]">Verifying Firestore connection...</span>
      </div>
    );
  }

  // If Firestore is unavailable / error encountered
  return (
    <div
      id="firestore-status-unavailable"
      className="w-full p-3.5 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs space-y-2 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="font-bold text-rose-300">Firestore unavailable</span>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-2.5 py-1 rounded-xl bg-rose-900 hover:bg-rose-800 text-white font-semibold text-[11px] flex items-center gap-1 border border-rose-700 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>Retry</span>
        </button>
      </div>
      <p className="text-[11px] text-rose-300/90 font-mono break-all leading-relaxed">
        {connState.errorMessage || 'Cloud Firestore could not be reached. Please check your internet connection or console configuration.'}
      </p>
    </div>
  );
};
