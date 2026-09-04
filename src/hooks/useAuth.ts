import { useState, useEffect } from 'react';
import { UserProfile } from '../types/user';
import { authService } from '../services/firebase/authService';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (emailOrUsername: string, pass: string) => {
    setIsLoading(true);
    try {
      return await authService.signIn(emailOrUsername, pass);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (displayName: string, username: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      return await authService.signUp(displayName, username, email, pass);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    return await authService.updateProfile(updates);
  };

  const switchAccount = async (profile: UserProfile) => {
    await authService.switchAccount(profile);
  };

  return {
    currentUser,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    switchAccount,
    isAuthenticated: Boolean(currentUser),
  };
}
