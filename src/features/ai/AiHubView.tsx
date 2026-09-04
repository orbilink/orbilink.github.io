import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Mic,
  MessageSquare,
  FileText,
  Languages,
  Zap,
  ArrowRight
} from 'lucide-react';
import { askGeminiAssistant } from '../../services/geminiService';

interface AiHubViewProps {
  onStartLiveVoice: () => void;
  onOpenAiChat: () => void;
}

export const AiHubView: React.FC<AiHubViewProps> = ({
  onStartLiveVoice,
  onOpenAiChat
}) => {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summarize' | 'translate' | 'rewrite'>('summarize');

  const handleAction = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setResult('');

    let prompt = '';
    if (activeTab === 'summarize') {
      prompt = `Summarize this text into clean bullet points with key takeaways:\n\n${inputText}`;
    } else if (activeTab === 'translate') {
      prompt = `Translate the following text into professional, fluent English, Spanish, and Japanese:\n\n${inputText}`;
    } else {
      prompt = `Rewrite and polish the following message for executive clarity, warmth, and impact:\n\n${inputText}`;
    }

    try {
      const resp = await askGeminiAssistant(prompt);
      setResult(resp.text);
    } catch {
      setResult('Failed to process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-zinc-900 border border-indigo-500/30 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RYNOX Intelligence Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-time Multimodal AI Copilot
            </h1>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              Interact with Gemini models via low-latency Live Voice, automated thread summarization, multilingual translation, and conversational assistance.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={onStartLiveVoice}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                <Mic className="w-4 h-4" />
                <span>Launch Live Voice Call</span>
              </button>
              <button
                onClick={onOpenAiChat}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-white/10 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span>Open AI Assistant Chat</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Utilities Workspace */}
        <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Text Processing & Transformation Engine</span>
            </h2>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('summarize')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'summarize'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Summarize
              </button>
              <button
                onClick={() => setActiveTab('translate')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'translate'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Translate
              </button>
              <button
                onClick={() => setActiveTab('rewrite')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'rewrite'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Polish & Tone
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste chat transcripts, project notes, or messages to analyze..."
              className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500/50 rounded-2xl p-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none transition-colors"
            />

            <div className="flex justify-end">
              <button
                onClick={handleAction}
                disabled={isLoading || !inputText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
              >
                {isLoading ? (
                  <>
                    <Bot className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {result && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-indigo-500/20 text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                <span className="font-semibold text-indigo-400 block mb-1">Generated Output:</span>
                {result}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
