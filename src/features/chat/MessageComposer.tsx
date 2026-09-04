import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  Image as ImageIcon,
  Film,
  FileText,
  HardDrive,
  Globe,
  Sparkles,
  X,
} from 'lucide-react';
import { Message, Attachment } from '../../types/chat';
import { DriveFile } from '../../types/googleDrive';
import { EmojiPicker } from './EmojiPicker';
import { AudioRecorder } from './AudioRecorder';
import { validateMediaFile } from '../../utils/mediaUtils';
import { toast } from '../../components/ToastContainer';
import { MediaPreviewModal } from '../media/MediaPreviewModal';
import { GoogleDrivePickerModal } from '../drive/GoogleDrivePickerModal';
import { GoogleSearchGroundingModal } from '../ai/GoogleSearchGroundingModal';

interface MessageComposerProps {
  chatId: string;
  onSendMessage: (text: string, type?: Message['type'], attachments?: Attachment[]) => void | Promise<void>;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newText: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  chatId,
  onSendMessage,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSaveEdit,
  onTyping,
}) => {
  const [text, setText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);

  // File Preview Modal state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video' | 'document'>('image');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [showDrivePicker, setShowDrivePicker] = useState<boolean>(false);
  const [showSearchGrounding, setShowSearchGrounding] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set initial text when editing message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Adjust textarea height dynamically
  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustHeight();

    // Trigger typing indicator
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage && onSaveEdit) {
      onSaveEdit(editingMessage.id, trimmed);
      onCancelEdit?.();
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    onSendMessage(trimmed, 'text');
    setText('');
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    onCancelReply?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    adjustHeight();
  };

  // Attachments Handling with validation and preview modal
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateMediaFile(file, 'image');
    if (!validation.valid) {
      toast.show(validation.error || 'Invalid image file', 'error');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedMediaType('image');
    setIsPreviewModalOpen(true);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateMediaFile(file, 'video');
    if (!validation.valid) {
      toast.show(validation.error || 'Invalid video file', 'error');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedMediaType('video');
    setIsPreviewModalOpen(true);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateMediaFile(file, 'document');
    if (!validation.valid) {
      toast.show(validation.error || 'Invalid document file', 'error');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setSelectedMediaType('document');
    setIsPreviewModalOpen(true);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const handleSendMediaMessage = async (
    caption: string,
    type: 'image' | 'video' | 'document',
    attachments: Attachment[]
  ) => {
    await onSendMessage(caption, type, attachments);
    onCancelReply?.();
  };

  return (
    <div className="relative border-t border-neutral-800/80 bg-neutral-950 p-2 sm:p-3" id="message-composer-root">
      {/* File Preview & Real Upload Modal */}
      {isPreviewModalOpen && selectedFile && (
        <MediaPreviewModal
          file={selectedFile}
          mediaType={selectedMediaType}
          chatId={chatId}
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setSelectedFile(null);
          }}
          onSendMedia={handleSendMediaMessage}
        />
      )}

      {/* Google Drive Picker Modal */}
      {showDrivePicker && (
        <GoogleDrivePickerModal
          isOpen={showDrivePicker}
          onClose={() => setShowDrivePicker(false)}
          onSelectFile={(file: any) => {
            setShowDrivePicker(false);
            const att: Attachment = {
              id: file.id,
              type: 'document',
              url: file.webViewLink || file.webContentLink || '',
              name: file.name,
              size: file.size ? parseInt(file.size, 10) : 0,
              mimeType: file.mimeType,
            };
            onSendMessage(`Shared from Google Drive: ${file.name}`, 'document', [att]);
          }}
        />
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        onChange={handleDocUpload}
        accept=".pdf,.doc,.docx,.zip,.txt,.json,.md,.csv,.xlsx,.pptx"
        className="hidden"
      />

      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-neutral-900 border-l-4 border-emerald-500 text-xs animate-in slide-in-from-bottom-1">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-semibold text-emerald-400">Replying to {replyingTo.senderName}</span>
            <span className="text-neutral-300 truncate">{replyingTo.text || `[${replyingTo.type.toUpperCase()}]`}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-neutral-900 border-l-4 border-amber-500 text-xs animate-in slide-in-from-bottom-1">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-semibold text-amber-400">Editing Message</span>
            <span className="text-neutral-300 truncate">{editingMessage.text}</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-2 sm:left-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <EmojiPicker
            onSelectEmoji={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Attachments Menu Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-12 sm:left-16 z-40 bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl p-2 backdrop-blur-xl flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>Photo / Image</span>
          </button>

          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Film className="w-4 h-4" />
            </div>
            <span>Video</span>
          </button>

          <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
              <FileText className="w-4 h-4" />
            </div>
            <span>Document / File</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowDrivePicker(true);
            }}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <span>Google Drive</span>
          </button>

          <button
            onClick={() => {
              setShowAttachMenu(false);
              setShowSearchGrounding(true);
            }}
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span>Google Search</span>
              <span className="text-[10px] text-neutral-400">Live AI Web Grounding</span>
            </div>
          </button>
        </div>
      )}

      {/* Google Search Grounding Modal */}
      {showSearchGrounding && (
        <GoogleSearchGroundingModal
          isOpen={showSearchGrounding}
          onClose={() => setShowSearchGrounding(false)}
          onShareToChat={(content) => {
            onSendMessage(content, 'text');
            setShowSearchGrounding(false);
          }}
          chatContext={text}
        />
      )}

      {/* Main Composer Controls Bar */}
      {isRecordingAudio ? (
        <AudioRecorder
          onSendVoice={(durationSec) => {
            onSendMessage(`Voice Message (${durationSec}s)`, 'audio');
            setIsRecordingAudio(false);
          }}
          onCancel={() => setIsRecordingAudio(false)}
        />
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Emoji Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition-colors ${
              showEmojiPicker
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
            title="Choose Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-2.5 rounded-xl transition-colors ${
              showAttachMenu
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
            title="Attach Media or File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Auto-Expanding Textarea */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              className="w-full bg-neutral-900/90 border border-neutral-800/90 focus:border-emerald-500/50 rounded-2xl py-2.5 px-4 text-sm text-neutral-100 placeholder-neutral-500 resize-none overflow-y-auto leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all max-h-36 shadow-inner"
            />
          </div>

          {/* Action Button: Send or Microphone */}
          {text.trim().length > 0 || editingMessage ? (
            <button
              type="button"
              onClick={handleSend}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center justify-center flex-shrink-0"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecordingAudio(true)}
              className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-400 transition-colors flex items-center justify-center flex-shrink-0 border border-neutral-800"
              title="Record voice message"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
