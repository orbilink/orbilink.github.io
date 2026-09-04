import { GmailMessage, GmailLabel, SendEmailInput } from '../types/gmail';
import { authService } from './firebase/authService';

export class GmailService {
  public hasAccessToken(): boolean {
    return !!authService.getGoogleAccessToken();
  }

  public async ensureAccessToken(): Promise<string> {
    const existing = authService.getGoogleAccessToken();
    if (existing) return existing;
    return await authService.requestGoogleWorkspaceAccess();
  }

  /**
   * List messages in mailbox with full parsed metadata
   */
  public async fetchMessages(options?: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
  }): Promise<{ messages: GmailMessage[]; nextPageToken?: string; resultSizeEstimate?: number }> {
    const token = await this.ensureAccessToken();
    const maxResults = options?.maxResults || 30;

    let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    if (options?.query && options.query.trim()) {
      url += `&q=${encodeURIComponent(options.query.trim())}`;
    }
    if (options?.labelIds && options.labelIds.length > 0) {
      options.labelIds.forEach((l) => {
        url += `&labelIds=${encodeURIComponent(l)}`;
      });
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.setGoogleAccessToken(null);
        throw new Error('Google session expired. Please reconnect Gmail.');
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gmail API error (${response.status})`);
    }

    const listData = await response.json();
    const messageHeaders: { id: string; threadId: string }[] = listData.messages || [];

    if (messageHeaders.length === 0) {
      return { messages: [], nextPageToken: listData.nextPageToken, resultSizeEstimate: 0 };
    }

    // Fetch batch details (up to 30)
    const detailPromises = messageHeaders.map((m) =>
      this.fetchSingleMessage(m.id, token).catch(() => null)
    );

    const results = await Promise.all(detailPromises);
    const validMessages = results.filter((m): m is GmailMessage => m !== null);

    return {
      messages: validMessages,
      nextPageToken: listData.nextPageToken,
      resultSizeEstimate: listData.resultSizeEstimate,
    };
  }

  /**
   * Fetches single message details
   */
  public async fetchSingleMessage(messageId: string, tokenOverride?: string): Promise<GmailMessage> {
    const token = tokenOverride || (await this.ensureAccessToken());
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch message ${messageId}`);
    }

    const data = await response.json();
    return this.parseGmailMessage(data);
  }

  /**
   * Send an email via Gmail API
   */
  public async sendEmail(input: SendEmailInput): Promise<{ id: string; threadId: string }> {
    const token = await this.ensureAccessToken();

    const headers: string[] = [
      `To: ${input.to.join(', ')}`,
      `Subject: =?utf-8?B?${this.base64EncodeUtf8(input.subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
    ];

    if (input.cc && input.cc.length > 0) {
      headers.push(`Cc: ${input.cc.join(', ')}`);
    }
    if (input.bcc && input.bcc.length > 0) {
      headers.push(`Bcc: ${input.bcc.join(', ')}`);
    }
    if (input.inReplyTo) {
      headers.push(`In-Reply-To: ${input.inReplyTo}`);
      headers.push(`References: ${input.inReplyTo}`);
    }

    const emailContent = `${headers.join('\r\n')}\r\n\r\n${input.bodyHtml || input.bodyText.replace(/\n/g, '<br/>')}`;
    const rawBase64 = this.base64UrlEncode(emailContent);

    const payload: any = { raw: rawBase64 };
    if (input.threadId) {
      payload.threadId = input.threadId;
    }

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to send email (${response.status})`);
    }

    return await response.json();
  }

  /**
   * Star / Unstar email
   */
  public async toggleStar(messageId: string, isStarred: boolean): Promise<void> {
    const token = await this.ensureAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
    const payload = isStarred
      ? { addLabelIds: ['STARRED'], removeLabelIds: [] }
      : { addLabelIds: [], removeLabelIds: ['STARRED'] };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to update star status');
    }
  }

  /**
   * Mark as Read / Unread
   */
  public async markAsRead(messageId: string, isRead: boolean): Promise<void> {
    const token = await this.ensureAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
    const payload = isRead
      ? { addLabelIds: [], removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'], removeLabelIds: [] };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to mark read status');
    }
  }

  /**
   * Move email to trash
   */
  public async trashMessage(messageId: string): Promise<void> {
    const token = await this.ensureAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to trash email');
    }
  }

  /**
   * Delete email permanently
   */
  public async deletePermanently(messageId: string): Promise<void> {
    const token = await this.ensureAccessToken();
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to permanently delete email');
    }
  }

  /**
   * Fetch labels list
   */
  public async fetchLabels(): Promise<GmailLabel[]> {
    const token = await this.ensureAccessToken();
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    const labels: any[] = data.labels || [];
    return labels.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type === 'system' ? 'system' : 'user',
      messagesTotal: l.messagesTotal,
      messagesUnread: l.messagesUnread,
    }));
  }

  private parseGmailMessage(data: any): GmailMessage {
    const headers: { name: string; value: string }[] = data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const fromRaw = getHeader('from');
    let fromName = fromRaw;
    let fromEmail = fromRaw;
    const match = fromRaw.match(/(.*)<(.*)>/);
    if (match) {
      fromName = match[1].replace(/"/g, '').trim();
      fromEmail = match[2].trim();
    }

    const toRaw = getHeader('to');
    const to = toRaw ? toRaw.split(',').map((s) => s.trim()) : [];
    const ccRaw = getHeader('cc');
    const cc = ccRaw ? ccRaw.split(',').map((s) => s.trim()) : [];
    const subject = getHeader('subject') || '(No Subject)';
    const date = getHeader('date') || new Date().toISOString();

    const labelIds: string[] = data.labelIds || [];
    const isUnread = labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');

    // Extract body & attachments recursively
    let bodyHtml: string | undefined;
    let bodyText: string | undefined;
    const attachments: any[] = [];

    const extractParts = (part: any) => {
      if (!part) return;
      if (part.mimeType === 'text/html' && part.body?.data && !bodyHtml) {
        bodyHtml = this.base64UrlDecode(part.body.data);
      } else if (part.mimeType === 'text/plain' && part.body?.data && !bodyText) {
        bodyText = this.base64UrlDecode(part.body.data);
      }

      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
        });
      }

      if (Array.isArray(part.parts)) {
        part.parts.forEach(extractParts);
      }
    };

    extractParts(data.payload);

    // If body text/html is at root payload
    if (!bodyHtml && !bodyText && data.payload?.body?.data) {
      const decoded = this.base64UrlDecode(data.payload.body.data);
      if (data.payload.mimeType === 'text/html') {
        bodyHtml = decoded;
      } else {
        bodyText = decoded;
      }
    }

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet || '',
      historyId: data.historyId,
      internalDate: data.internalDate,
      labelIds,
      from: fromEmail,
      fromName: fromName || fromEmail,
      to,
      cc,
      subject,
      date,
      bodyHtml,
      bodyText,
      hasAttachments: attachments.length > 0,
      attachments,
      isUnread,
      isStarred,
    };
  }

  private base64UrlEncode(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private base64EncodeUtf8(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  private base64UrlDecode(str: string): string {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      return str;
    }
  }
}

export const gmailService = new GmailService();
