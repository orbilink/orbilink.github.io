import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Paperclip,
  Sparkles,
  Phone,
  Info,
  X,
  Bot,
  AlertCircle
} from 'lucide-react';
import { ChatGroup, Message, User } from '../../types';
import { MessageItem } from './MessageItem';
import { AudioRecorder } from './AudioRecorder';
import { askGeminiAssistant, generateSmartReplies, checkGeminiStatus } from '../../services/geminiService';
import { storageService } from '../../services/firebase/storageService';

interface ChatAreaProps {
  chat: ChatGroup;
  currentUser: User;
  messages: Message[];
  onSendMessage: (content: string, type?: Message['type'], extra?: Partial<Message>) => void;
  onOpenLiveVoice: () => void;
  onOpenGroupInfo: () => void;
  onOpenDrivePicker: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  currentUser,
  messages,
  onSendMessage,
  onOpenLiveVoice,
  onOpenGroupInfo,
  onOpenDrivePicker
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState<boolean | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkGeminiStatus().then((status) => {
      setIsAiConfigured(status);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    if (messages.length > 0 && isAiConfigured) {
      const last = messages[messages.length - 1];
      if (last.senderId !== currentUser.id && last.type === 'text') {
        generateSmartReplies(last.content).then(setSmartReplies);
      } else {
        setSmartReplies([]);
      }
    } else {
      setSmartReplies([]);
    }
  }, [messages, currentUser.id, isAiConfigured]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');
    setAiError(null);

    const extra: Partial<Message> = {};
    if (replyTarget) {
      extra.replyTo = {
        id: replyTarget.id,
        senderName: replyTarget.senderName,
        content: replyTarget.content
      };
      setReplyTarget(null);
    }

    onSendMessage(textToSend, 'text', extra);

    // If chatting in AI Assistant channel, trigger Gemini assistant response if configured
    if (chat.type === 'ai') {
      if (isAiConfigured === false) {
        setAiError('Google GenAI backend is not configured on the server.');
        return;
      }
      setIsAiTyping(true);
      try {
        const response = await askGeminiAssistant(textToSend, messages);
        setIsAiTyping(false);
        onSendMessage(response.text, 'ai', {
          senderId: 'usr_ai',
          senderName: 'ORBILINK AI',
          senderAvatar: chat.avatarUrl,
          isAiGenerated: true
        });
        if (response.suggestedReplies && response.suggestedReplies.length > 0) {
          setSmartReplies(response.suggestedReplies);
        }
      } catch (err: any) {
        setIsAiTyping(false);
        setAiError(err?.message || 'Google GenAI backend is not configured');
      }
    }
  };

  const handleSendVoice = async (durationSec: number, waveform: number[], audioBlob?: Blob) => {
    setIsRecordingVoice(false);
    let mediaUrl: string | undefined = undefined;

    if (audioBlob && storageService.isStorageConfigured()) {
      try {
        const uploadResult = await storageService.uploadChatMedia(
          chat.id,
          audioBlob,
          `voice_${Date.now()}.webm`
        );
        mediaUrl = uploadResult.downloadUrl;
      } catch (uploadErr) {
        console.warn('[ORBILINK] Voice note media upload fallback:', uploadErr);
      }
    }

    onSendMessage(`Voice message (${durationSec}s)`, 'voice', {
      voiceDuration: durationSec,
      voiceWaveform: waveform,
      mediaUrl
    });
  };

  const handleReact = (msg: Message, emoji: string) => {
    const existingReactions = msg.reactions || [];
    const found = existingReactions.find((r) => r.emoji === emoji);

    let updated = [];
    if (found) {
      if (found.users.includes(currentUser.id)) {
        updated = existingReactions
          .map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentUser.id) }
              : r
          )
          .filter((r) => r.count > 0);
      } else {
        updated = existingReactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, users: [...r.users, currentUser.id] }
            : r
        );
      }
    } else {
      updated = [...existingReactions, { emoji, count: 1, users: [currentUser.id] }];
    }

    msg.reactions = updated;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950/60 backdrop-blur-sm relative overflow-hidden">
      {/* Top Header */}
      <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <img
              src={chat.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={chat.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border border-white/10"
            />
            {chat.type === 'ai' && (
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#25D366] text-black">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5">
              {chat.name}
            </h2>
            <p className="text-xs text-zinc-400 truncate">
              {chat.type === 'ai'
                ? isAiConfigured
                  ? 'Gemini 2.5 • Instant Reasoning & Live Voice'
                  : 'Google GenAI backend is not configured'
                : chat.type === 'group'
                ? `${chat.participants.length} members`
                : 'Active now'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {chat.type === 'ai' ? (
            <button
              onClick={isAiConfigured ? onOpenLiveVoice : undefined}
              disabled={!isAiConfigured}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/20 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#25D366]/30 border border-[#25D366]/30 text-[#25D366] hover:text-emerald-300 text-xs font-semibold transition-all duration-150 shadow-sm"
              title={isAiConfigured ? 'Start Gemini Live Voice Session' : 'AI not configured'}
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/60 border border-white/5 text-zinc-500 text-xs font-semibold cursor-not-allowed opacity-60"
              title="Calls disabled (Requires real two-device WebRTC testing)"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Call (Disabled)</span>
            </button>
          )}

          {chat.type === 'group' && (
            <button
              onClick={onOpenGroupInfo}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-xl transition-colors"
              title="Group Information"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">No messages in this conversation</h3>
            <p className="text-xs max-w-xs text-zinc-500">
              Send a message to start real-time communication.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isMe={message.senderId === currentUser.id}
              onReact={(_msgId, emoji) => handleReact(message, emoji)}
              onReply={() => setReplyTarget(message)}
            />
          ))
        )}

        {isAiTyping && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 italic">
            <Sparkles className="w-3.5 h-3.5 text-[#25D366] animate-spin" />
            <span>ORBILINK AI is analyzing and reasoning...</span>
          </div>
        )}

        {aiError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{aiError}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Tray */}
      <div className="p-4 bg-zinc-900/40 border-t border-white/5 space-y-2 shrink-0">
        
        {/* Smart Reply Pills (Real Gemini predictions only) */}
        {smartReplies.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1 shrink-0 font-medium">
              <Sparkles className="w-3 h-3 text-[#25D366]" />
              Smart Replies:
            </span>
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => {
                  onSendMessage(reply, 'text');
                  setSmartReplies([]);
                }}
                className="px-3 py-1 rounded-full bg-zinc-800/80 hover:bg-[#25D366]/20 text-xs text-zinc-300 hover:text-[#25D366] border border-white/5 hover:border-[#25D366]/30 whitespace-nowrap transition-all duration-150"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Replying context box */}
        {replyTarget && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300">
            <div className="truncate">
              <span className="font-semibold text-[#25D366]">Replying to {replyTarget.senderName}: </span>
              <span className="opacity-80">{replyTarget.content}</span>
            </div>
            <button
              onClick={() => setReplyTarget(null)}
              className="p-1 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Voice Recorder vs Text Input */}
        {isRecordingVoice ? (
          <AudioRecorder
            onSendVoice={handleSendVoice}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDrivePicker}
              className="p-2.5 text-zinc-400 hover:text-[#25D366] hover:bg-zinc-800/80 rounded-xl transition-colors shrink-0"
              title="Attach from Google Drive"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  chat.type === 'ai'
                    ? isAiConfigured === false
                      ? 'AI disabled - Google GenAI backend is not configured'
                      : 'Ask Gemini anything or draft a response...'
                    : 'Type a message...'
                }
                disabled={chat.type === 'ai' && isAiConfigured === false}
                className="w-full bg-zinc-900/90 border border-white/10 focus:border-[#25D366]/50 rounded-2xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner disabled:opacity-50"
              />
            </div>

            {inputText.trim() ? (
              <button
                onClick={handleSend}
                className="p-2.5 bg-[#25D366] hover:bg-[#128C7E] text-black rounded-xl shadow-md shadow-[#25D366]/20 transition-all shrink-0 font-bold"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 bg-zinc-800 hover:bg-[#25D366] text-zinc-300 hover:text-black rounded-xl transition-all shrink-0"
                title="Record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
