import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Paperclip,
  Sparkles,
  Phone,
  Info,
  X,
  Bot
} from 'lucide-react';
import { ChatGroup, Message, User } from '../../types';
import { MessageItem } from './MessageItem';
import { AudioRecorder } from './AudioRecorder';
import { askGeminiAssistant, generateSmartReplies } from '../../services/geminiService';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  useEffect(() => {
    // Generate smart reply pills if last message is from someone else
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.senderId !== currentUser.id && last.type === 'text') {
        generateSmartReplies(last.content).then(setSmartReplies);
      } else {
        setSmartReplies([]);
      }
    }
  }, [messages, currentUser.id]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');

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

    // If chatting in AI Assistant channel, trigger Gemini assistant response
    if (chat.type === 'ai') {
      setIsAiTyping(true);
      try {
        const response = await askGeminiAssistant(textToSend, messages);
        setIsAiTyping(false);
        onSendMessage(response.text, 'ai', {
          senderId: 'usr_ai',
          senderName: 'RYNOX Intelligence',
          senderAvatar: chat.avatarUrl,
          isAiGenerated: true
        });
        if (response.suggestedReplies) {
          setSmartReplies(response.suggestedReplies);
        }
      } catch {
        setIsAiTyping(false);
      }
    }
  };

  const handleSendVoice = (durationSec: number, waveform: number[]) => {
    setIsRecordingVoice(false);
    onSendMessage('Voice Note', 'voice', {
      voiceDuration: durationSec,
      voiceWaveform: waveform
    });
  };

  const handleReact = (msgId: string, emoji: string) => {
    // Local mock reaction toggler
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const existingReactions = msg.reactions || [];
    const found = existingReactions.find((r) => r.emoji === emoji);

    let updated;
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
              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-indigo-600 text-white">
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
                ? 'Gemini 2.5 • Instant Reasoning & Live Voice'
                : chat.type === 'group'
                ? `${chat.participants.length} members`
                : 'Active now'}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenLiveVoice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all duration-150 shadow-sm"
            title="Start Gemini Live Voice Session"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Voice</span>
          </button>

          <button
            onClick={onOpenGroupInfo}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-colors"
            title="Chat info & settings"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isMe={msg.senderId === currentUser.id}
            onReply={(m) => setReplyTarget(m)}
            onReact={handleReact}
          />
        ))}

        {isAiTyping && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium py-2 px-3 bg-indigo-950/20 rounded-xl border border-indigo-500/20 w-fit animate-pulse">
            <Bot className="w-4 h-4 animate-spin" />
            <span>RYNOX Intelligence is analyzing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Bar: Smart Replies, Quote & Input Area */}
      <div className="p-3 sm:p-4 border-t border-white/5 bg-zinc-900/50 backdrop-blur-md space-y-2 shrink-0">
        {/* Smart Reply Suggestions */}
        {smartReplies.length > 0 && !isRecordingVoice && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Suggestion:
            </span>
            {smartReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => {
                  onSendMessage(reply, 'text');
                  setSmartReplies([]);
                }}
                className="px-2.5 py-1 rounded-full text-xs bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 whitespace-nowrap transition-colors"
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
              <span className="font-semibold text-indigo-300">Replying to {replyTarget.senderName}: </span>
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
              className="p-2.5 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800/80 rounded-xl transition-colors shrink-0"
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
                    ? 'Ask Gemini anything or draft a response...'
                    : 'Type a message...'
                }
                className="w-full bg-zinc-900/90 border border-white/10 focus:border-indigo-500/50 rounded-2xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {inputText.trim() ? (
              <button
                onClick={handleSend}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20 transition-all shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-xl transition-all shrink-0"
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
