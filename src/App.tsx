import React, { useState, useEffect } from 'react';
import { User } from './types';
import { MainMessenger } from './pages/MainMessenger';
import { AuthPage } from './pages/AuthPage';
import { authService } from './services/firebase/authService';
import { UserProfile } from './types/user';
import { Sparkles } from 'lucide-react';

function mapProfileToUser(p: UserProfile): User {
  return {
    id: p.id,
    name: p.displayName || p.username || 'User',
    username: p.username || '',
    email: p.email || '',
    avatarUrl: p.avatarUrl || p.photoURL || '',
    status: p.about || '',
    isOnline: p.isOnline ?? true,
    bio: p.about || ''
  };
}

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const existing = authService.getCurrentUser();
    return existing ? mapProfileToUser(existing) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((profile) => {
      if (profile) {
        setCurrentUser(mapProfileToUser(profile));
      } else {
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white">
        <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-black shadow-lg shadow-[#25D366]/30 animate-pulse mb-4">
          <Sparkles className="w-6 h-6 text-black" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">ORBILINK</h1>
        <p className="text-xs text-zinc-500 mt-1">Connecting to Firebase services...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onLogin={(u) => {
          setCurrentUser(u);
        }}
      />
    );
  }

  return (
    <MainMessenger
      currentUser={currentUser}
      onLogout={async () => {
        await authService.signOut();
        setCurrentUser(null);
      }}
    />
  );
}

export default App;
