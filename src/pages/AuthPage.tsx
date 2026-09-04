import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  AtSign,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { User } from '../types';
import { authService, formatFirebaseError } from '../services/firebase/authService';
import { UserProfile } from '../types/user';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

function mapProfileToUser(p: UserProfile): User {
  return {
    id: p.id,
    name: p.displayName || p.username || 'User',
    username: p.username || '',
    email: p.email || '',
    avatarUrl: p.avatarUrl || p.photoURL || '',
    status: p.about || '',
    isOnline: true,
    bio: p.about || ''
  };
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);

  // Form Fields (Empty by default - NO fake/demo prefill)
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isResetPassword) {
        if (!email.trim()) {
          throw new Error('Please enter your email address to reset password.');
        }
        await authService.resetPassword(email.trim());
        setSuccessMsg('Password reset email sent! Check your inbox.');
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (!displayName.trim()) throw new Error('Display Name is required.');
        if (!username.trim()) throw new Error('Username is required.');
        if (!email.trim()) throw new Error('Email is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');

        const profile = await authService.signUp(
          displayName.trim(),
          username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
          email.trim().toLowerCase(),
          password
        );
        onLogin(mapProfileToUser(profile));
      } else {
        if (!emailOrUsername.trim()) throw new Error('Please enter your email or username.');
        if (!password) throw new Error('Please enter your password.');

        const profile = await authService.signIn(emailOrUsername.trim(), password);
        onLogin(mapProfileToUser(profile));
      }
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const profile = await authService.signInWithGoogle();
      onLogin(mapProfileToUser(profile));
    } catch (err: unknown) {
      setErrorMsg(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950 relative overflow-hidden">
      {/* Subtle Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#128C7E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#25D366] shadow-lg shadow-[#25D366]/30 text-black mb-3">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">ORBILINK</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-Time Multimodal Communication Platform
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Reset Password View */}
        {isResetPassword ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-black font-bold rounded-xl text-xs shadow-lg shadow-[#25D366]/20 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetPassword(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          /* Sign In / Sign Up Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Unique Username
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. alex_dev"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="email@domain.com or @username"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">Password</label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(true);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-[#25D366]"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#25D366]/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 text-black rounded-xl text-xs font-bold shadow-lg shadow-[#25D366]/30 transition-all hover:scale-[1.01]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In to ORBILINK'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        {!isResetPassword && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-zinc-950 hover:bg-zinc-800 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9c-.2-.8-.4-1.6-.4-2.4z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-zinc-400 hover:text-[#25D366] transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected to Firebase Authentication</span>
        </div>

      </div>
    </div>
  );
};
