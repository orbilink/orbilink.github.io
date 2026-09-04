import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
  Globe,
  Sparkles,
  Search,
  ExternalLink,
  Copy,
  Check,
  Send,
  X,
  Compass,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Share2,
} from 'lucide-react';
import {
  geminiSearchService,
  SearchGroundingResult,
  GroundingSource,
} from '../../services/gemini/geminiSearchService';
import { toast } from '../../components/ToastContainer';

interface GoogleSearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareToChat?: (content: string, sources?: GroundingSource[]) => void;
  initialQuery?: string;
  chatContext?: string;
}

const SAMPLE_SUGGESTIONS = [
  'Latest breakthroughs in quantum computing and AI',
  'Global stock market trends and economic outlook today',
  'Recent space exploration discoveries from NASA and ESA',
  'Top tech industry news and hardware announcements this week',
];

export const GoogleSearchGroundingModal: React.FC<GoogleSearchGroundingModalProps> = ({
  isOpen,
  onClose,
  onShareToChat,
  initialQuery = '',
  chatContext,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SearchGroundingResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const searchResult = await geminiSearchService.searchWithGoogle(q.trim(), chatContext);
      setResult(searchResult);
    } catch (err: any) {
      console.error('Google search error:', err);
      toast.show(err.message || 'Search grounding request failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    toast.show('Search answer copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!result?.text || !onShareToChat) return;

    let textWithSources = `🔍 **Google Search Grounding Result** (${query}):\n\n${result.text}`;
    if (result.sources.length > 0) {
      textWithSources += `\n\n**Sources:**\n` + result.sources.map((s) => `- [${s.title}](${s.uri})`).join('\n');
    }

    onShareToChat(textWithSources, result.sources);
    toast.show('Shared search grounding to conversation', 'success');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl shadow-black/90 flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-blue-950/50">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-100">Google Search Grounding</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                    gemini-3.7-flash
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Real-time Google search web data and accurate citations
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar Input */}
          <div className="p-6 border-b border-neutral-800 bg-neutral-950/40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="relative flex items-center"
            >
              <Search className="w-5 h-5 absolute left-4 text-neutral-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything to search the live web (e.g., current news, fact checks, weather, research)..."
                className="w-full pl-12 pr-28 py-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500/60 text-sm shadow-inner"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Topic Chips */}
            {!result && !isLoading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>Trending Search Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-neutral-100 transition-colors text-left flex items-center gap-1.5"
                    >
                      <span>{suggestion}</span>
                      <ArrowRight className="w-3 h-3 text-neutral-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                    <Globe className="w-6 h-6 animate-spin" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">Querying Google Search Grounding...</h4>
                  <p className="text-xs text-neutral-500 font-mono mt-1">
                    Retrieving real-time web pages & extracting citations with Gemini 3.5 Flash
                  </p>
                </div>
              </div>
            )}

            {result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Search Queries Pill Group */}
                {result.searchQueries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-neutral-800/80">
                    <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                      Grounding Queries:
                    </span>
                    {result.searchQueries.map((sq, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-300 text-[11px] font-mono"
                      >
                        "{sq}"
                      </span>
                    ))}
                  </div>
                )}

                {/* Grounded Text Output */}
                <div className="prose prose-invert max-w-none text-neutral-200 text-sm leading-relaxed space-y-3">
                  <div className="markdown-body font-sans">
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                  </div>
                </div>

                {/* Grounding Web Sources Cards */}
                {result.sources.length > 0 && (
                  <div className="pt-4 border-t border-neutral-800">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <span>Web Sources & Citations ({result.sources.length})</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {result.sources.map((src, i) => {
                        let hostname = '';
                        try {
                          hostname = new URL(src.uri).hostname;
                        } catch {
                          hostname = src.uri;
                        }

                        return (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 rounded-2xl flex items-start justify-between gap-3 group transition-all"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="text-xs font-semibold text-neutral-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                                {src.title || hostname}
                              </p>
                              <p className="text-[11px] text-neutral-500 font-mono truncate">{hostname}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          {result && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Grounded with Google Search Live</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {onShareToChat && (
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share to Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
