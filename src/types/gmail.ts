export interface GmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  historyId?: string;
  internalDate: string;
  labelIds: string[];
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: string;
  bodyHtml?: string;
  bodyText?: string;
  hasAttachments: boolean;
  attachments: GmailAttachment[];
  isUnread: boolean;
  isStarred: boolean;
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId?: string;
  messages: GmailMessage[];
}

export interface SendEmailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  inReplyTo?: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal?: number;
  messagesUnread?: number;
}
