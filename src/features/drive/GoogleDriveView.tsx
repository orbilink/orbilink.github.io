import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Search,
  File,
  FileText,
  Image as ImageIcon,
  Share2,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { GoogleDriveFile } from '../../types';
import { GoogleDriveService } from '../../services/googleDriveService';
import { authService } from '../../services/firebase/authService';

interface GoogleDriveViewProps {
  files?: GoogleDriveFile[];
  onShareFileToChat?: (file: GoogleDriveFile) => void;
}

const driveService = new GoogleDriveService();

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  onShareFileToChat
}) => {
  const [hasToken, setHasToken] = useState<boolean>(driveService.hasAccessToken());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [realFiles, setRealFiles] = useState<GoogleDriveFile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (hasToken) {
      loadFiles();
    }
  }, [hasToken]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const files = await driveService.fetchFiles();
      const mapped: GoogleDriveFile[] = files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? `${(parseInt(f.size, 10) / (1024 * 1024)).toFixed(1)} MB` : 'Folder',
        modifiedTime: f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : 'Unknown',
        thumbnailUrl: f.thumbnailLink,
        webViewLink: f.webViewLink
      }));
      setRealFiles(mapped);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Google Drive files');
      setHasToken(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.requestGoogleWorkspaceAccess();
      setHasToken(driveService.hasAccessToken());
      await loadFiles();
    } catch (err: any) {
      setError(err?.message || 'Google Drive authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="flex-1 h-full flex items-center justify-center p-6 bg-zinc-950/60">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4 border border-white/5">
            <HardDrive className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Google Drive integration not configured</h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Real Google Drive OAuth/API requires connecting your authorized Google account to browse, attach, and collaborate on real Drive documents.
          </p>
          {error && (
            <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#1ebd5d] text-black rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-[#25D366]/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Connect Google Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const filtered = realFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-teal-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document'))
      return <FileText className="w-5 h-5 text-blue-400" />;
    return <File className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#25D366]" />
              <h1 className="text-xl font-bold text-white">Google Drive Files</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Browse and attach files from your real connected Google Drive
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              Connected to Drive API
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Drive files by name..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
          />
        </div>

        {/* File List */}
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
            <span>Loading Google Drive files...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs">
            No files found in your connected Google Drive account.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((file) => (
              <div
                key={file.id}
                className="p-3.5 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-[#25D366]/30 transition-all flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-zinc-800 border border-white/5 shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">{file.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                      <span>{file.size}</span>
                      <span>•</span>
                      <span>{file.modifiedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-white/5 transition-all"
                      title="Open in Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {onShareFileToChat && (
                    <button
                      onClick={() => onShareFileToChat(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 transition-all text-xs font-semibold"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share in Chat</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
