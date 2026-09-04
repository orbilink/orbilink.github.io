import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Check, X, Copy, QrCode, RefreshCw, Key } from 'lucide-react';
import { UserProfile } from '../../types/user';
import { e2eeSessionManager } from '../../services/crypto/e2eeSessionManager';
import { toast } from '../../components/ToastContainer';

interface SafetyNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  contactUserId: string;
  contactDisplayName: string;
}

export const SafetyNumberModal: React.FC<SafetyNumberModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  contactUserId,
  contactDisplayName,
}) => {
  const [safetyNumber, setSafetyNumber] = useState<string>('Loading...');
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [keyChanged, setKeyChanged] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && contactUserId) {
      loadSafetyNumber();
    }
  }, [isOpen, contactUserId]);

  const loadSafetyNumber = async () => {
    setLoading(true);
    try {
      const data = await e2eeSessionManager.getSafetyNumberForContact(currentUser, contactUserId);
      setSafetyNumber(data.safetyNumber);
      setFingerprint(data.fingerprint);
      setIsVerified(data.isVerified);
      setKeyChanged(data.keyChanged);
    } catch (err) {
      console.error('Failed to load safety number:', err);
      setSafetyNumber('00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000 00000');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerified = async () => {
    const nextState = !isVerified;
    setIsVerified(nextState);
    await e2eeSessionManager.setContactVerified(contactUserId, nextState, safetyNumber, fingerprint);
    toast.show(
      nextState ? `Marked ${contactDisplayName} as verified` : `Unmarked ${contactDisplayName}`,
      nextState ? 'success' : 'info'
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(safetyNumber);
    toast.show('Safety number copied to clipboard', 'success');
  };

  if (!isOpen) return null;

  // Format 60 digits into 12 blocks of 5 digits (3 rows of 4 blocks)
  const blocks = safetyNumber.split(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'}`}>
              {isVerified ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Verify Safety Number</h2>
              <p className="text-xs text-slate-400">End-to-End Encryption with {contactDisplayName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Change Warning Banner */}
        {keyChanged && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-3 text-amber-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Safety Number Changed</p>
              <p className="mt-0.5 text-slate-300">
                {contactDisplayName}&apos;s cryptographic identity key changed. This typically happens when they reinstall RYNOX or register a new device.
              </p>
            </div>
          </div>
        )}

        {/* Explanation */}
        <p className="text-xs text-slate-400 leading-relaxed">
          To verify that messages and calls are encrypted end-to-end with {contactDisplayName}, compare these numbers with their device or scan each other&apos;s screen.
        </p>

        {/* Safety Number Display Grid */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono select-all">
          {loading ? (
            <div className="py-6 flex items-center justify-center space-x-2 text-slate-500 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Deriving ECDH safety number...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold tracking-wider text-slate-200">
              {blocks.map((block, idx) => (
                <div key={idx} className="bg-slate-900/90 py-2 px-1.5 rounded-lg border border-slate-800/80 hover:border-brand-500/40 transition-colors">
                  {block}
                </div>
              ))}
            </div>
          )}

          {fingerprint && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-sans">
              <span className="flex items-center space-x-1">
                <Key className="w-3.5 h-3.5" />
                <span>Identity Fingerprint:</span>
              </span>
              <span className="font-mono text-slate-400">{fingerprint}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition-colors border border-slate-700"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Number</span>
          </button>

          <button
            onClick={handleToggleVerified}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 transition-colors ${
              isVerified
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/30'
            }`}
          >
            {isVerified ? (
              <>
                <Check className="w-4 h-4" />
                <span>Verified</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Mark as Verified</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
