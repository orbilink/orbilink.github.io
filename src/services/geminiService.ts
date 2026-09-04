import { Message } from '../types';

export interface AiChatResponse {
  text: string;
  suggestedReplies?: string[];
}

export async function checkGeminiStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      return !!data.geminiConfigured;
    }
  } catch {
    // server unreachable
  }
  return false;
}

export async function askGeminiAssistant(
  prompt: string,
  chatHistory: Message[] = []
): Promise<AiChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      history: chatHistory.slice(-10).map((m) => ({
        role: m.senderId === 'usr_ai' ? 'model' : 'user',
        text: m.content
      }))
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI error: ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.text,
    suggestedReplies: data.suggestedReplies || []
  };
}

export async function generateSmartReplies(lastMessage: string): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/smart-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: lastMessage })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.replies) && data.replies.length > 0) {
        return data.replies;
      }
    }
  } catch {
    // ignore
  }

  // Do not return fake replies if unconfigured
  return [];
}
