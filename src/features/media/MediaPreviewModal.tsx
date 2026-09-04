import React, { useState, useEffect } from 'react';
import { X, Send, Film, FileText, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';
import { storageService } from '../../services/firebase/storageService';
import { Attachment } from '../../types/chat';

interface MediaPreviewModalProps {
  file: File | null;
  mediaType: 'image' | 'video' | 'document';
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (caption: string, type: 'image' | 'video' | 'document', attachments: Attachment[]) => Promise<void>;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  file,
  mediaType,
  chatId,
  isOpen,
  onClose,
  onSendMedia,
}) => {
  const [caption, setCaption] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCaption('');
      setUploadError(null);
      setIsUploading(false);
      setUploadProgress(0);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  if (!isOpen || !file) return null;

  const handleSend = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // 1. Upload the real binary file to Firebase Storage
      const { downloadUrl, storagePath } = await storageService.uploadChatMedia(
        chatId,
        file,
        file.name,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // 2. Prepare Attachment metadata
      const attachment: Attachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: mediaType === 'document' ? 'document' : mediaType,
        url: downloadUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      };

      // 3. Send message through parent handler
      await onSendMedia(caption.trim(), mediaType, [attachment]);

      // 4. Close modal on success
      setIsUploading(false);
      onClose();
    } catch (err: unknown) {
      console.error('[RYNOX] Media upload error:', err);
      const errMsg = err instanceof Error ? err.message : 'Upload failed. Please check your connection and Firebase Storage setup.';
      setUploadError(errMsg);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2">
            {mediaType === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
            {mediaType === 'video' && <Film className="w-4 h-4 text-cyan-400" />}
            {mediaType === 'document' && <FileText className="w-4 h-4 text-violet-400" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Preview {mediaType}
            </span>
          </div>
          {!isUploading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center min-h-[220px] max-h-[50vh] bg-neutral-950/80">
          {mediaType === 'image' && previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[42vh] max-w-full object-contain rounded-xl shadow-lg"
            />
          )}

          {mediaType === 'video' && previewUrl && (
            <video
              src={previewUrl}
              controls
              className="max-h-[42vh] max-w-full rounded-xl shadow-lg bg-black"
            />
          )}

          {mediaType === 'document' && (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-emerald-400 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-100 break-all max-w-md">{file.name}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {formatFileSize(file.size)} • {file.type || 'Document'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File Details Bar */}
        <div className="px-4 py-2 bg-neutral-950/40 border-t border-neutral-800/50 flex items-center justify-between text-xs text-neutral-400">
          <span className="truncate max-w-[280px]">{file.name}</span>
          <span className="font-mono">{formatFileSize(file.size)}</span>
        </div>

        {/* Upload Progress & Error Feedback */}
        {isUploading && (
          <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-300 mb-1.5">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                Uploading to Firebase Storage...
              </span>
              <span className="font-mono text-emerald-400">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {uploadError && (
          <div className="p-3 mx-4 my-2 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Footer / Caption Input */}
        <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex items-center gap-2">
          <input
            type="text"
            disabled={isUploading}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isUploading) {
                handleSend();
              }
            }}
            placeholder="Add a caption (optional)..."
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={handleSend}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isUploading ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
