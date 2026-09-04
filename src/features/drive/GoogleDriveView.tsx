import React, { useState } from 'react';
import {
  HardDrive,
  Search,
  File,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Share2,
  Download,
  FolderPlus
} from 'lucide-react';
import { GoogleDriveFile } from '../../types';

interface GoogleDriveViewProps {
  files: GoogleDriveFile[];
  onShareFileToChat: (file: GoogleDriveFile) => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  files,
  onShareFileToChat
}) => {
  const [search, setSearch] = useState('');
  const [fileList, setFileList] = useState<GoogleDriveFile[]>(files);

  const handleUploadSimulate = () => {
    const newDoc: GoogleDriveFile = {
      id: `drv_${Date.now()}`,
      name: `Document_${Date.now().toString().slice(-4)}.pdf`,
      mimeType: 'application/pdf',
      size: '2.1 MB',
      modifiedTime: 'Just now'
    };
    setFileList([newDoc, ...fileList]);
  };

  const filtered = fileList.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <h1 className="text-xl font-bold text-white">Google Drive Integration</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Browse, upload, and attach cloud documents and media directly into your messages
            </p>
          </div>

          <button
            onClick={handleUploadSimulate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Google Drive files and attachments..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((file) => {
            const isImage = file.mimeType.includes('image');
            const isPdf = file.mimeType.includes('pdf');

            return (
              <div
                key={file.id}
                className="p-4 rounded-2xl bg-zinc-900/70 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                    {isImage ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : isPdf ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <File className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {file.size} • Modified {file.modifiedTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onShareFileToChat(file)}
                    className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                    title="Send file to active chat"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
