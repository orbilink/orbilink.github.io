import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  FileText,
  Search,
  RefreshCw,
  Edit3,
  Reply,
  Share2,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Paperclip,
  LogOut,
  ChevronLeft,
  Tag,
} from 'lucide-react';
import { GmailMessage, GmailLabel, SendEmailInput } from '../../types/gmail';
import { UserProfile } from '../../types/user';
import { Chat } from '../../types/chat';
import { gmailService } from '../../services/gmailService';
import { authService } from '../../services/firebase/authService';
import { toast } from '../../components/ToastContainer';
import { getInitials } from '../../utils/mediaUtils';

interface GmailViewProps {
  currentUser: UserProfile;
  chats?: Chat[];
  onShareEmailToChat?: (email: GmailMessage, targetChatId: string) => void;
  onClose?: () => void;
}

export const GmailView: React.FC<GmailViewProps> = ({
  currentUser,
  chats = [],
  onShareEmailToChat,
  onClose,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(gmailService.hasAccessToken());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [activeFolder, setActiveFolder] = useState<'INBOX' | 'STARRED' | 'SENT' | 'DRAFT' | 'TRASH'>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compose email modal state
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);
  const [composeForm, setComposeForm] = useState<SendEmailInput>({
    to: [],
    cc: [],
    subject: '',
    bodyText: '',
  });
  const [toInput, setToInput] = useState<string>('');
  const [ccInput, setCcInput] = useState<string>('');
  const [showCc, setShowCc] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Share to chat modal state
  const [selectedEmailForShare, setSelectedEmailForShare] = useState<GmailMessage | null>(null);

  // Confirmation modal state for destructive or critical actions
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'trash' | 'send';
    title: string;
    description: string;
    targetId?: string;
  }>({
    isOpen: false,
    type: 'trash',
    title: '',
    description: '',
  });

  useEffect(() => {
    if (gmailService.hasAccessToken()) {
      loadMessages();
    }
  }, [activeFolder]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const labelIds =
        activeFolder === 'INBOX'
          ? ['INBOX']
          : activeFolder === 'STARRED'
          ? ['STARRED']
          : activeFolder === 'SENT'
          ? ['SENT']
          : activeFolder === 'DRAFT'
          ? ['DRAFT']
          : ['TRASH'];

      const result = await gmailService.fetchMessages({
        labelIds,
        query: searchQuery || undefined,
        maxResults: 30,
      });

      setMessages(result.messages);
      setIsConnected(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Gmail messages';
      toast.show(msg, 'error');
      if (msg.includes('expired') || msg.includes('revoked') || msg.includes('token')) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await authService.requestGoogleWorkspaceAccess();
      setIsConnected(true);
      toast.show('Gmail authorized successfully', 'success');
      await loadMessages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gmail authentication failed';
      toast.show(msg, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    authService.setGoogleAccessToken(null);
    setIsConnected(false);
    setMessages([]);
    setSelectedMessage(null);
    toast.show('Disconnected Gmail session', 'info');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMessages();
  };

  const handleSelectMessage = async (msg: GmailMessage) => {
    setSelectedMessage(msg);
    if (msg.isUnread) {
      // Mark as read in background
      try {
        await gmailService.markAsRead(msg.id, true);
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isUnread: false } : m))
        );
      } catch {
        // Non-critical
      }
    }
  };

  const handleToggleStar = async (msg: GmailMessage) => {
    try {
      await gmailService.toggleStar(msg.id, !msg.isStarred);
      const updated = !msg.isStarred;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isStarred: updated } : m))
      );
      if (selectedMessage?.id === msg.id) {
        setSelectedMessage((prev) => (prev ? { ...prev, isStarred: updated } : null));
      }
      toast.show(updated ? 'Starred email' : 'Removed star', 'info');
    } catch (err: unknown) {
      const msgErr = err instanceof Error ? err.message : 'Failed to toggle star';
      toast.show(msgErr, 'error');
    }
  };

  const promptTrashEmail = (msg: GmailMessage) => {
    setConfirmModal({
      isOpen: true,
      type: 'trash',
      title: 'Move Email to Trash',
      description: `Are you sure you want to move "${msg.subject}" to the trash in Gmail?`,
      targetId: msg.id,
    });
  };

  const handleExecuteConfirmedAction = async () => {
    const { targetId } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    if (!targetId) return;

    setIsLoading(true);
    try {
      await gmailService.trashMessage(targetId);
      toast.show('Email moved to trash', 'info');
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
      if (selectedMessage?.id === targetId) {
        setSelectedMessage(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to trash email';
      toast.show(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReply = (msg: GmailMessage) => {
    setComposeForm({
      to: [msg.from],
      cc: [],
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      bodyText: `\n\n--- On ${new Date(msg.date).toLocaleString()}, ${msg.from} wrote ---\n> ${msg.snippet}`,
      threadId: msg.threadId,
      inReplyTo: msg.id,
    });
    setToInput(msg.from);
    setShowComposeModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = toInput
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (recipients.length === 0) {
      toast.show('Please provide at least one recipient email address', 'error');
      return;
    }

    const ccs = ccInput
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSending(true);
    try {
      await gmailService.sendEmail({
        to: recipients,
        cc: ccs.length > 0 ? ccs : undefined,
        subject: composeForm.subject.trim() || '(No Subject)',
        bodyText: composeForm.bodyText,
      });

      toast.show('Email sent successfully via Gmail', 'success');
      setShowComposeModal(false);
      setComposeForm({ to: [], cc: [], subject: '', bodyText: '' });
      setToInput('');
      setCcInput('');
      setShowCc(false);
      await loadMessages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send email';
      toast.show(msg, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none overflow-hidden" id="gmail-view">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/95 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-100">Gmail Mailbox</h2>
              {isConnected && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  Live
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              Read, search, reply, and compose emails linked with Google Workspace
            </p>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-2">
            <button
              onClick={loadMessages}
              disabled={isLoading}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
              title="Refresh inbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                setComposeForm({ to: [], cc: [], subject: '', bodyText: '' });
                setToInput('');
                setCcInput('');
                setShowComposeModal(true);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Compose</span>
            </button>

            <button
              onClick={handleDisconnect}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-300 border border-neutral-800 transition-colors"
              title="Disconnect Gmail"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!isConnected ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
            <svg className="w-10 h-10" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
          </div>

          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-bold text-neutral-100">Connect Gmail</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Authorize Gmail access to read and compose emails, search messages, and share email threads directly with your team in encrypted chats.
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="py-3 px-6 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-neutral-100 font-semibold text-xs rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl group"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Connecting to Gmail...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
                <span>Authorize with Gmail</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Folder Selector + Message List */}
          <div
            className={`w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-neutral-800/80 bg-neutral-950/60 flex-shrink-0 ${
              selectedMessage ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Folder Tabs */}
            <div
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              className="p-3 border-b border-neutral-800/80 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs bg-neutral-950 scroll-smooth touch-pan-x"
            >
              {(
                [
                  { id: 'INBOX', label: 'Inbox', icon: Inbox },
                  { id: 'STARRED', label: 'Starred', icon: Star },
                  { id: 'SENT', label: 'Sent', icon: Send },
                  { id: 'DRAFT', label: 'Drafts', icon: FileText },
                  { id: 'TRASH', label: 'Trash', icon: Trash2 },
                ] as const
              ).map((folder) => {
                const Icon = folder.icon;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setActiveFolder(folder.id);
                      setSelectedMessage(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-all ${
                      activeFolder === folder.id
                        ? 'bg-neutral-800 text-neutral-100 border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{folder.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-neutral-800/80 bg-neutral-950">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </form>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2 text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-xs">Fetching messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-16 text-center text-xs text-neutral-500 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-neutral-600" />
                  <p>No messages in {activeFolder.toLowerCase()}</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      selectedMessage?.id === msg.id
                        ? 'bg-neutral-900 border-neutral-700 shadow-sm'
                        : msg.isUnread
                        ? 'bg-neutral-900/80 border-neutral-800/90 font-semibold'
                        : 'bg-neutral-950/40 hover:bg-neutral-900/60 border-transparent hover:border-neutral-850'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {msg.isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                        <span className="text-xs text-neutral-200 truncate">{msg.fromName || msg.from}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(msg);
                          }}
                          className={`p-1 rounded hover:bg-neutral-800 ${
                            msg.isStarred ? 'text-amber-400' : 'text-neutral-600 hover:text-neutral-400'
                          }`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(msg.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-neutral-100 truncate">{msg.subject}</h4>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Message Detail View */}
          <div
            className={`flex-1 flex-col h-full bg-neutral-950/40 overflow-hidden ${
              selectedMessage ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedMessage ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Detail Header & Action Toolbar */}
                <div className="p-3.5 border-b border-neutral-800/80 bg-neutral-950 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="md:hidden p-1.5 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-bold text-neutral-100 truncate max-w-md">
                      {selectedMessage.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenReply(selectedMessage)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reply</span>
                    </button>

                    {chats.length > 0 && (
                      <button
                        onClick={() => setSelectedEmailForShare(selectedMessage)}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Share to ORBILINK Chat"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleStar(selectedMessage)}
                      className={`p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors ${
                        selectedMessage.isStarred ? 'text-amber-400' : 'text-neutral-400'
                      }`}
                      title="Star email"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={() => promptTrashEmail(selectedMessage)}
                      className="p-1.5 rounded-xl bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition-colors"
                      title="Move to trash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Body & Details */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Sender card */}
                  <div className="p-3 bg-neutral-900/60 rounded-2xl border border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                        {getInitials(selectedMessage.fromName || selectedMessage.from)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-100">{selectedMessage.fromName}</h4>
                          <span className="text-[10px] text-neutral-400">&lt;{selectedMessage.from}&gt;</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">
                          To: {selectedMessage.to.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400 font-mono">
                      {new Date(selectedMessage.date).toLocaleString()}
                    </div>
                  </div>

                  {/* Attachments preview if any */}
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="p-3 bg-neutral-900/40 rounded-2xl border border-neutral-800 flex flex-wrap gap-2">
                      {selectedMessage.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="px-3 py-1.5 bg-neutral-900 rounded-xl border border-neutral-750 flex items-center gap-2 text-xs text-neutral-200"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate max-w-xs">{att.filename}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Email message content */}
                  <div className="p-4 bg-neutral-900/30 rounded-2xl border border-neutral-800 text-xs text-neutral-200 leading-relaxed overflow-x-auto">
                    {selectedMessage.bodyHtml ? (
                      <div
                        className="prose prose-invert max-w-none text-xs"
                        dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-xs text-neutral-200">
                        {selectedMessage.bodyText || selectedMessage.snippet}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-neutral-500">
                <Mail className="w-12 h-12 text-neutral-700" />
                <h4 className="text-sm font-semibold text-neutral-300">Select an email to view</h4>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Choose a conversation from your {activeFolder.toLowerCase()} or click Compose to write a new email.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendEmail}
            className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-neutral-100">Compose New Email</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="To (comma separated email addresses) *"
                  required
                  autoFocus
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 bg-neutral-800 rounded-lg"
                  >
                    CC
                  </button>
                )}
              </div>

              {showCc && (
                <input
                  type="text"
                  placeholder="CC (comma separated email addresses)"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              )}

              <input
                type="text"
                placeholder="Subject"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-semibold"
              />

              <textarea
                placeholder="Write your email here..."
                required
                rows={10}
                value={composeForm.bodyText}
                onChange={(e) => setComposeForm({ ...composeForm, bodyText: e.target.value })}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Discard
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Share Email to ORBILINK Chat Modal */}
      {selectedEmailForShare && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-neutral-100">Share Email to Conversation</h4>
              </div>
              <button onClick={() => setSelectedEmailForShare(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <h5 className="text-xs font-bold text-neutral-100 truncate">{selectedEmailForShare.subject}</h5>
              <p className="text-[10px] text-neutral-400 line-clamp-2">{selectedEmailForShare.snippet}</p>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              <span className="text-xs font-semibold text-neutral-400 px-1">Select a conversation:</span>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    if (onShareEmailToChat) {
                      onShareEmailToChat(selectedEmailForShare, chat.id);
                      toast.show(`Shared email summary to ${chat.name}`, 'success');
                      setSelectedEmailForShare(null);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 flex items-center justify-between text-left transition-colors"
                >
                  <span className="text-xs font-semibold text-neutral-200 truncate">{chat.name}</span>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase">{chat.type}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedEmailForShare(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-100">{confirmModal.title}</h4>
                <p className="text-xs text-neutral-400">Gmail Action</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
              {confirmModal.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-md"
              >
                Confirm Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
