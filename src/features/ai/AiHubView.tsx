import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Mic,
  MessageSquare,
  FileText,
  Languages,
  Zap,
  ArrowRight,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { askGeminiAssistant, checkGeminiStatus } from '../../services/geminiService';

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
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    checkGeminiStatus().then(setIsConfigured);
  }, []);

  const handleAction = async () => {
    if (!inputText.trim()) return;
    if (isConfigured === false) {
      setResult('Google GenAI backend is not configured.');
      return;
    }

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
    } catch (err: any) {
      setResult(err?.message || 'Google GenAI backend is not configured');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 sm:p-8 bg-zinc-950/60 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-zinc-900 border border-[#25D366]/30 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/10 text-[#25D366] text-xs font-semibold mb-3 border border-[#25D366]/30">
              <Sparkles className="w-3.5 h-3.5 text-[#25D366]" />
              <span>ORBILINK AI Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-time Multimodal AI Copilot
            </h1>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              Interact with Gemini models via low-latency Live Voice, automated thread summarization, multilingual translation, and conversational assistance.
            </p>

            {isConfigured === false && (
              <div className="mt-4 p-3 bg-amber-950/50 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Google GenAI backend is not configured (GEMINI_API_KEY is not set).</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={onStartLiveVoice}
                disabled={!isConfigured}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs shadow-lg shadow-[#25D366]/20 transition-all"
              >
                <Mic className="w-4 h-4" />
                <span>Launch Live Voice Call</span>
              </button>
              <button
                onClick={onOpenAiChat}
                disabled={!isConfigured}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-200 font-semibold text-xs border border-white/10 transition-all"
              >
                <Bot className="w-4 h-4 text-[#25D366]" />
                <span>Assistant Chat Channel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Playground */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              AI Tools & Operations
            </h3>
            <button
              onClick={() => setActiveTab('summarize')}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                activeTab === 'summarize'
                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-white'
                  : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <FileText className="w-4 h-4 text-[#25D366] shrink-0" />
              <div>
                <h4 className="text-xs font-semibold">Executive Summarizer</h4>
                <p className="text-[11px] opacity-70">Synthesize long conversations</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('translate')}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                activeTab === 'translate'
                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-white'
                  : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Languages className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold">Multilingual Translator</h4>
                <p className="text-[11px] opacity-70">Break cross-border barriers</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('rewrite')}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                activeTab === 'rewrite'
                  ? 'bg-[#25D366]/15 border-[#25D366]/40 text-white'
                  : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold">Tone & Clarity Polish</h4>
                <p className="text-[11px] opacity-70">Elevate message reception</p>
              </div>
            </button>
          </div>

          <div className="md:col-span-2 bg-zinc-900/60 border border-white/5 rounded-3xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Input Text to Process
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste an email, notes, or chat excerpt..."
                className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#25D366]/50"
              />
            </div>

            <button
              onClick={handleAction}
              disabled={isLoading || !inputText.trim() || !isConfigured}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl text-xs font-bold transition-all shadow-md shadow-[#25D366]/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Process with Gemini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {result && (
              <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#25D366]">
                  Model Output:
                </span>
                <p className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {result}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
