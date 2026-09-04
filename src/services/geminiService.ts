import { Message } from '../types';

export interface AiChatResponse {
  text: string;
  suggestedReplies?: string[];
}

export async function askGeminiAssistant(
  prompt: string,
  chatHistory: Message[] = []
): Promise<AiChatResponse> {
  try {
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
      throw new Error(err.error || `Server responded with status ${res.status}`);
    }

    const data = await res.json();
    return {
      text: data.text || 'I could not generate a response.',
      suggestedReplies: data.suggestedReplies || []
    };
  } catch (error) {
    console.error('[Gemini Client] AI Chat error:', error);
    throw error;
  }
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

  return ['Sounds great! 👍', 'Let me review this shortly.', 'Thanks for the update! 🚀'];
}
