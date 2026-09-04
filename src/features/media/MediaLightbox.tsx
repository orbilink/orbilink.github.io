import React from 'react';
import { X, Download, ZoomIn, ZoomOut, FileText, Film } from 'lucide-react';
import { Attachment } from '../../types/chat';

interface MediaLightboxProps {
  attachment: Attachment | null;
  caption?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  attachment,
  caption,
  onClose,
}) => {
  const [zoom, setZoom] = React.useState<number>(1);

  if (!attachment) return null;

  const handleDownload = () => {
    if (!attachment.url) return;
    const a = document.createElement('a');
    a.href = attachment.url;
    a.download = attachment.name || 'vault_mesh_media';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Lightbox Header */}
      <div className="flex items-center justify-between p-4 bg-neutral-950/80 border-b border-neutral-800/60 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-900 text-neutral-300">
            {attachment.type === 'video' ? <Film className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-100 truncate max-w-xs sm:max-w-md">{attachment.name}</h4>
            <span className="text-xs text-neutral-400 uppercase tracking-wider">{attachment.type}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attachment.type === 'image' && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-medium border border-neutral-700/60 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-900 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lightbox Body */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {attachment.type === 'image' && (
          <div className="flex flex-col items-center">
            <img
              src={attachment.url}
              alt={attachment.name}
              referrerPolicy="no-referrer"
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease' }}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}

        {attachment.type === 'video' && (
          <div className="max-w-4xl w-full flex flex-col items-center">
            <video
              src={attachment.url}
              controls
              autoPlay
              className="max-h-[80vh] w-full rounded-xl bg-black shadow-2xl border border-neutral-800"
            />
          </div>
        )}

        {attachment.type === 'document' && (
          <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-center max-w-md space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-emerald-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-neutral-100">{attachment.name}</h3>
            <p className="text-xs text-neutral-400">Preview not supported in-line. Download to view.</p>
            <button
              onClick={handleDownload}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30"
            >
              <Download className="w-4 h-4" /> Download File
            </button>
          </div>
        )}
      </div>

      {caption && (
        <div className="p-4 text-center bg-neutral-950/90 border-t border-neutral-800/60 text-sm text-neutral-200">
          {caption}
        </div>
      )}
    </div>
  );
};
