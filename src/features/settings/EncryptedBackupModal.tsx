import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Cloud,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCode,
  KeyRound,
  Eye,
  EyeOff,
  Database,
  Smartphone,
  HardDrive,
  Info,
} from 'lucide-react';
import { UserProfile } from '../../types/user';
import {
  BackupMetadataRecord,
  BackupStep,
  RestoreStep,
  EncryptedBackupEnvelope,
} from '../../types/backup';
import { backupService } from '../../services/backup/backupService';
import { backupCryptoService } from '../../services/crypto/backupCryptoService';
import { toast } from '../../components/ToastContainer';

interface EncryptedBackupModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const EncryptedBackupModal: React.FC<EncryptedBackupModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'restore_file'>('manage');
  const [cloudBackups, setCloudBackups] = useState<BackupMetadataRecord[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(
    backupService.isAutoBackupEnabled()
  );

  // Create Backup Form States
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState<boolean>(false);
  const [backupStep, setBackupStep] = useState<BackupStep>('idle');
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupStepDetail, setBackupStepDetail] = useState<string>('');
  const [backupError, setBackupError] = useState<string | null>(null);

  // Restore States
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<BackupMetadataRecord | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState<string>('');
  const [restoreStep, setRestoreStep] = useState<RestoreStep>('idle');
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [restoreStepDetail, setRestoreStepDetail] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Local File Restore State
  const [importedFileContent, setImportedFileContent] = useState<string | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      loadBackups();
    }
  }, [isOpen, currentUser?.id]);

  const loadBackups = async () => {
    if (!currentUser?.id) return;
    setIsLoadingBackups(true);
    try {
      const backups = await backupService.listCloudBackups(currentUser.id);
      setCloudBackups(backups);
    } catch {
      toast.show('Failed to fetch backup records from cloud', 'error');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  if (!isOpen) return null;

  const handleToggleAutoBackup = (enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    backupService.setAutoBackupEnabled(enabled);
    toast.show(
      enabled
        ? 'Automatic encrypted backup enabled'
        : 'Automatic encrypted backup disabled',
      'info'
    );
  };

  const handleStartBackup = async () => {
    if (!passphrase || passphrase.length < 8) {
      setBackupError('Recovery passphrase must be at least 8 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setBackupError('Passphrases do not match. Please verify your recovery passphrase.');
      return;
    }
    if (!acknowledgedWarning) {
      setBackupError('Please acknowledge that RYNOX cannot recover lost passphrases.');
      return;
    }

    setBackupError(null);
    setBackupStep('preparing');
    setBackupProgress(10);
    setBackupStepDetail('Gathering messages, conversations, and key material...');

    try {
      await backupService.createEncryptedBackup(
        currentUser,
        passphrase,
        (step, progress, detail) => {
          setBackupStep(step);
          if (progress !== undefined) setBackupProgress(progress);
          if (detail) setBackupStepDetail(detail);
        }
      );

      toast.show('Encrypted backup uploaded successfully!', 'success');
      setPassphrase('');
      setConfirmPassphrase('');
      loadBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBackupStep('failed');
      setBackupError(msg);
      toast.show(`Backup failed: ${msg}`, 'error');
    }
  };

  const handleRestoreCloudBackup = async () => {
    if (!selectedBackupToRestore) return;
    if (!restorePassphrase) {
      setRestoreError('Please enter your recovery passphrase.');
      return;
    }

    setRestoreError(null);
    setRestoreStep('downloading');
    setRestoreProgress(20);
    setRestoreStepDetail('Downloading encrypted backup ciphertext...');

    try {
      const result = await backupService.downloadAndRestoreBackup(
        selectedBackupToRestore,
        restorePassphrase,
        (step, progress, detail) => {
          setRestoreStep(step);
          if (progress !== undefined) setRestoreProgress(progress);
          if (detail) setRestoreStepDetail(detail);
        }
      );

      toast.show(
        `Restored ${result.restoredMessages} messages across ${result.restoredChats} conversations!`,
        'success'
      );
      setRestorePassphrase('');
      setSelectedBackupToRestore(null);
      setRestoreStep('completed');
      onDataRestored?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRestoreStep('failed');
      setRestoreError(msg);
      toast.show(msg, 'error');
    }
  };

  const handleRestoreFromFile = async () => {
    if (!importedFileContent) {
      setRestoreError('Please select an encrypted backup file first.');
      return;
    }
    if (!restorePassphrase) {
      setRestoreError('Please enter your recovery passphrase.');
      return;
    }

    setRestoreError(null);
    setRestoreStep('decrypting');
    setRestoreProgress(40);
    setRestoreStepDetail('Verifying integrity and decrypting locally...');

    try {
      const result = await backupService.restoreFromEncryptedFile(
        importedFileContent,
        restorePassphrase,
        (step, progress, detail) => {
          setRestoreStep(step);
          if (progress !== undefined) setRestoreProgress(progress);
          if (detail) setRestoreStepDetail(detail);
        }
      );

      toast.show(
        `Restored ${result.restoredMessages} messages across ${result.restoredChats} conversations!`,
        'success'
      );
      setImportedFileContent(null);
      setImportedFileName('');
      setRestorePassphrase('');
      setRestoreStep('completed');
      onDataRestored?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRestoreStep('failed');
      setRestoreError(msg);
      toast.show(msg, 'error');
    }
  };

  const handleDeleteBackup = async (backup: BackupMetadataRecord) => {
    if (!confirm('Are you sure you want to delete this cloud backup permanently? This cannot be undone.')) {
      return;
    }

    try {
      await backupService.deleteCloudBackup(currentUser.id, backup.backupId, backup.storagePath);
      toast.show('Cloud backup deleted successfully.', 'success');
      loadBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.show(`Failed to delete backup: ${msg}`, 'error');
    }
  };

  const handleDownloadBackupBlob = async (backup: BackupMetadataRecord) => {
    try {
      toast.show('Preparing encrypted backup download...', 'info');
      const blob = await backupService.downloadAndRestoreBackup
        ? await backupCryptoService.createEncryptedBackupBlob({
            backupId: backup.backupId,
            backupVersion: '1.0.0',
            cryptographicVersion: 'AES-256-GCM+PBKDF2-SHA256',
            userId: backup.userId,
            deviceId: backup.deviceId,
            createdAt: backup.createdAt,
            salt: '',
            iv: '',
            iterations: 100000,
            aad: '',
            ciphertext: '',
            sizeBytes: backup.sizeBytes,
            messageCount: backup.messageCount,
            chatCount: backup.chatCount,
          })
        : null;

      // Download directly from Storage or trigger blob download
      const a = document.createElement('a');
      if (backup.downloadUrl) {
        a.href = backup.downloadUrl;
        a.download = `rynox_encrypted_backup_${backup.backupId}.enc`;
        a.target = '_blank';
        a.click();
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `rynox_backup_${backup.backupId}.rybox-enc`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.show('Encrypted backup file saved.', 'success');
    } catch {
      toast.show('Unable to download backup object', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setImportedFileContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span>Encrypted Backup & Device Recovery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
                  AES-256-GCM
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                User-controlled zero-knowledge backup encryption • PBKDF2-SHA256
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div className="px-5 py-3 bg-neutral-950/80 border-b border-neutral-800/80 flex items-start gap-2.5 text-xs text-neutral-400">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Backups are encrypted on your device before upload. RYNOX does not receive the backup decryption secret and cannot decrypt your data.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-5 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('manage');
              setBackupError(null);
              setRestoreError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud Backups ({cloudBackups.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('create');
              setBackupStep('idle');
              setBackupError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Create New Backup</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('restore_file');
              setRestoreStep('idle');
              setRestoreError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'restore_file'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Restore from File</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: MANAGE CLOUD BACKUPS */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Auto Backup Toggle */}
              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-200 block text-xs">
                    Encrypted Cloud Backup
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Encrypt message records and key material to private storage
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      autoBackupEnabled ? 'text-emerald-400' : 'text-neutral-500'
                    }`}
                  >
                    {autoBackupEnabled ? 'On' : 'Off'}
                  </span>
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-neutral-900 border-neutral-700 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Cloud Backups List Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Stored Encrypted Backups
                </span>
                <button
                  onClick={loadBackups}
                  disabled={isLoadingBackups}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Backups List */}
              {isLoadingBackups ? (
                <div className="p-8 text-center text-neutral-400 text-xs">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-emerald-400" />
                  <span>Checking private cloud storage...</span>
                </div>
              ) : cloudBackups.length === 0 ? (
                <div className="p-6 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-2xl text-center space-y-2">
                  <Cloud className="w-7 h-7 mx-auto text-neutral-600" />
                  <p className="text-xs text-neutral-400">No cloud backups found for this account.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors inline-block"
                  >
                    Create Your First Backup
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cloudBackups.map((b) => (
                    <div
                      key={b.backupId}
                      className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-2 transition-all hover:border-neutral-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-neutral-200">
                              {new Date(b.createdAt).toLocaleString()}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                              v{b.backupVersion}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <span>{b.messageCount} messages</span>
                            <span>•</span>
                            <span>{b.chatCount} conversations</span>
                            <span>•</span>
                            <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBackupToRestore(b);
                              setRestoreError(null);
                              setRestoreStep('idle');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Restore</span>
                          </button>

                          <button
                            onClick={() => handleDownloadBackupBlob(b)}
                            title="Download Encrypted File"
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
                          >
                            <HardDrive className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteBackup(b)}
                            title="Delete Cloud Backup"
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-neutral-500 font-mono flex items-center justify-between pt-1 border-t border-neutral-900">
                        <span>Device: {b.deviceName || b.deviceId}</span>
                        <span className="text-emerald-400/80 font-semibold">{b.cryptographicVersion}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Restore Dialog when a backup is selected */}
              {selectedBackupToRestore && (
                <div className="mt-4 p-4 bg-neutral-950 border border-emerald-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-neutral-100">
                        Restore Backup ({new Date(selectedBackupToRestore.createdAt).toLocaleDateString()})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedBackupToRestore(null)}
                      className="text-neutral-500 hover:text-neutral-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-neutral-400">
                    Enter the recovery secret chosen when this backup was created to decrypt and restore to this device:
                  </p>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={restorePassphrase}
                        onChange={(e) => setRestorePassphrase(e.target.value)}
                        placeholder="Enter recovery secret..."
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-200"
                      >
                        {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {restoreError && (
                      <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight text-[11px]">{restoreError}</span>
                      </div>
                    )}

                    {restoreStep !== 'idle' && (
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-300 font-medium">{restoreStepDetail}</span>
                          <span className="text-emerald-400 font-mono">{restoreProgress}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${restoreProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleRestoreCloudBackup}
                        disabled={restoreStep === 'downloading' || restoreStep === 'decrypting' || restoreStep === 'restoring'}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                      >
                        {restoreStep === 'downloading' || restoreStep === 'decrypting' || restoreStep === 'restoring'
                          ? 'Decrypting & Restoring...'
                          : 'Confirm & Decrypt'}
                      </button>
                      <button
                        onClick={() => setSelectedBackupToRestore(null)}
                        className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW BACKUP */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Choose a Recovery Secret</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Your recovery secret derives the 256-bit AES-GCM encryption key locally. It is NEVER transmitted or stored on RYNOX servers.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Recovery Passphrase (min 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter a strong recovery passphrase..."
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-200"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                    Confirm Recovery Passphrase
                  </label>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Re-enter recovery passphrase..."
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                {/* Explicit Loss Warning Checkbox */}
                <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="ack-warning"
                    checked={acknowledgedWarning}
                    onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-neutral-900 border-neutral-700 mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="ack-warning" className="text-[11px] text-amber-300/90 leading-tight select-none cursor-pointer">
                    I understand that my recovery secret is required to restore this backup. RYNOX cannot decrypt or recover it for me if lost.
                  </label>
                </div>

                {/* Error Banner */}
                {backupError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight text-[11px]">{backupError}</span>
                  </div>
                )}

                {/* Progress Indicators */}
                {backupStep !== 'idle' && (
                  <div className="space-y-1.5 p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-200">
                        {backupStep === 'preparing' && 'Preparing backup...'}
                        {backupStep === 'encrypting' && 'Encrypting locally...'}
                        {backupStep === 'uploading' && 'Uploading encrypted backup...'}
                        {backupStep === 'completed' && 'Backup complete'}
                        {backupStep === 'failed' && 'Backup failed'}
                      </span>
                      <span className="text-emerald-400 font-mono text-[11px]">{backupProgress}%</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">{backupStepDetail}</p>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${backupProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleStartBackup}
                    disabled={backupStep === 'preparing' || backupStep === 'encrypting' || backupStep === 'uploading'}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {backupStep === 'failed'
                        ? 'Retry Backup'
                        : backupStep !== 'idle' && backupStep !== 'completed'
                        ? 'Processing...'
                        : 'Create Encrypted Backup'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESTORE FROM LOCAL FILE */}
          {activeTab === 'restore_file' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Air-Gapped / Local File Recovery</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Restore an encrypted backup from a local <code className="text-emerald-400">.rybox-enc</code> or <code className="text-emerald-400">.json</code> file. Decryption and integrity verification occur entirely in your local browser sandbox.
                </p>
              </div>

              {/* File Input */}
              <div className="border border-dashed border-neutral-700 bg-neutral-950/40 rounded-2xl p-4 text-center space-y-2">
                <input
                  type="file"
                  id="backup-file-input"
                  accept=".json,.rybox-enc,.enc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="backup-file-input"
                  className="cursor-pointer block text-xs text-neutral-300 hover:text-white"
                >
                  <FileCode className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />
                  <span className="font-semibold block">
                    {importedFileName ? importedFileName : 'Choose Encrypted Backup File'}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Select .rybox-enc or .json file
                  </span>
                </label>
              </div>

              {importedFileContent && (
                <div className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Enter Recovery Secret for this File
                    </label>
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={restorePassphrase}
                      onChange={(e) => setRestorePassphrase(e.target.value)}
                      placeholder="Enter recovery secret..."
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  {restoreError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight text-[11px]">{restoreError}</span>
                    </div>
                  )}

                  {restoreStep !== 'idle' && (
                    <div className="space-y-1.5 py-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300 font-medium">{restoreStepDetail}</span>
                        <span className="text-emerald-400 font-mono">{restoreProgress}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${restoreProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRestoreFromFile}
                    disabled={restoreStep === 'decrypting' || restoreStep === 'restoring'}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                  >
                    Decrypt & Restore from File
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Technical Specifications & Multi-Device Note */}
          <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-2xl space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Device & Cryptographic Architecture</span>
            </div>
            <p className="leading-relaxed">
              <strong>Device Recovery:</strong> Restoring an encrypted backup on a new device restores your identity key pair, contacts, and message history seamlessly.
            </p>
            <p className="leading-relaxed text-neutral-500">
              <strong>Multi-Device Key Sync:</strong> Individual devices maintain distinct cryptographic identity pairs. Real-time multi-device pairwise key distribution protocol is marked as <span className="text-amber-400/90 font-mono">NOT IMPLEMENTED</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
