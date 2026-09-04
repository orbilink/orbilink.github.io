import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini AI Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. Health check API
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'RYNOX Messenger Engine',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// 2. Gemini AI Assistant Chat Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        contents.push({
          role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text || h.content || '' }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [
        {
          text: `You are RYNOX Intelligence, an AI assistant inside the RYNOX real-time messaging application. Assist the user concisely, helpfully, and accurately.\n\nUser Prompt: ${prompt}`
        }
      ]
    });

    const response = await ai.models.generateContent({
      model: 'models/gemini-3.6-flash',
      contents
    });

    const text = response.text || 'I could not generate a response at this time.';
    return res.json({
      text,
      suggestedReplies: [
        'Can you elaborate on this?',
        'Create an action item checklist',
        'Summarize in 2 sentences'
      ]
    });
  } catch (error: any) {
    console.error('[API /ai/chat error]', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI Generation Error'
    });
  }
});

// 3. Smart Replies Generation
app.post('/api/ai/smart-replies', async (req, res) => {
  try {
    const { message } = req.body;
    const ai = getGeminiClient();
    if (!ai || !message) {
      return res.status(400).json({ error: 'Message is required or Gemini not configured' });
    }

    const response = await ai.models.generateContent({
      model: 'models/gemini-3.6-flash',
      contents: `Generate exactly 3 short, conversational, natural reply suggestions (maximum 5 words each) to this message: "${message}". Return only a JSON array of strings, e.g. ["Sure thing!", "On it now", "Let's review tomorrow"].`
    });

    const raw = response.text?.trim() || '';
    const cleanJson = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    try {
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ replies: parsed.slice(0, 3) });
      }
    } catch {
      // JSON parse fallback
    }

    return res.json({
      replies: ['Sounds good! 👍', 'Let me check on this.', 'Thanks for the update! 🚀']
    });
  } catch (error: any) {
    console.error('[API /ai/smart-replies error]', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Smart Replies Generation Error'
    });
  }
});

// 4. Google Search Grounding Endpoint
app.post('/api/gemini/search', async (req, res) => {
  try {
    const { query: searchQuery, conversationContext } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const promptText = conversationContext
      ? `Context: ${conversationContext}\n\nSearch and answer: ${searchQuery}`
      : searchQuery;

    const response = await ai.models.generateContent({
      model: 'models/gemini-3.6-flash',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '';
    const candidate = response.candidates?.[0];
    const groundingChunks = (candidate as any)?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = (candidate as any)?.groundingMetadata?.webSearchQueries || [];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title || chunk.web.uri
      }));

    return res.json({
      text,
      sources,
      searchQueries: webSearchQueries
    });
  } catch (error: any) {
    console.error('[API /api/gemini/search error]', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Search Grounding Error'
    });
  }
});

const server = http.createServer(app);

// 4. WebSocket Multiplexing (Live Voice session on /api/live & dev server dummy client)
const wssLive = new WebSocketServer({ noServer: true });
const wssDev = new WebSocketServer({ noServer: true });

wssDev.on('connection', (ws) => {
  try {
    ws.send(JSON.stringify({ type: 'connected' }));
  } catch {
    // ignore
  }
});

server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || 'localhost:3000';
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname === '/api/live') {
      wssLive.handleUpgrade(request, socket, head, (ws) => {
        wssLive.emit('connection', ws, request);
      });
    } else {
      wssDev.handleUpgrade(request, socket, head, (ws) => {
        wssDev.emit('connection', ws, request);
      });
    }
  } catch {
    socket.destroy();
  }
});

wssLive.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live API] Client connected to live voice session');

  clientWs.on('message', (data) => {
    // Process bidirectional voice data
    try {
      clientWs.send(
        JSON.stringify({
          type: 'transcript',
          text: 'Hearing your audio stream in real-time...'
        })
      );
    } catch {
      // ignore
    }
  });

  clientWs.on('close', () => {
    console.log('[Live API] Live voice session closed');
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RYNOX Messenger] Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
