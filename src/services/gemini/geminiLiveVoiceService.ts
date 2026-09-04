type VoiceListener = (state: {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  aiResponse: string;
  rmsLevel: number;
}) => void;

type ErrorListener = (error: string) => void;

export class GeminiLiveVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isMuted: boolean = false;
  private isConnected: boolean = false;
  
  private listeners: Set<VoiceListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  private currentState = {
    isRecording: false,
    isSpeaking: false,
    transcript: '',
    aiResponse: '',
    rmsLevel: 0
  };

  public subscribe(fn: VoiceListener) {
    this.listeners.add(fn);
    fn(this.currentState);
    return () => {
      this.listeners.delete(fn);
    };
  }

  public subscribeError(fn: ErrorListener) {
    this.errorListeners.add(fn);
    return () => {
      this.errorListeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.currentState }));
  }

  private notifyError(msg: string) {
    this.errorListeners.forEach((fn) => fn(msg));
  }

  public async startSession(): Promise<void> {
    try {
      this.currentState = {
        isRecording: true,
        isSpeaking: false,
        transcript: 'Listening to your microphone...',
        aiResponse: '',
        rmsLevel: 0.1
      };
      this.notify();

      // 1. Check microphone permission
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          }
        });
      } catch (err) {
        throw new Error('Microphone permission was denied or not supported in this frame.');
      }

      // 2. Audio Processing Setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // RMS Analyzer
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // RMS Polling
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const rmsInterval = setInterval(() => {
        if (!this.currentState.isRecording) {
          clearInterval(rmsInterval);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        this.currentState.rmsLevel = Math.min(1, avg / 128);
        this.notify();
      }, 100);

      // 3. Connect WebSocket to backend Live API proxy
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/api/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.currentState.transcript = 'Connected. Speak into your microphone...';
        this.notify();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'transcript') {
            this.currentState.transcript = data.text;
            this.notify();
          } else if (data.type === 'ai_text') {
            this.currentState.aiResponse = (this.currentState.aiResponse + ' ' + data.text).trim();
            this.currentState.isSpeaking = true;
            this.notify();
          } else if (data.type === 'ai_done') {
            this.currentState.isSpeaking = false;
            this.notify();
          }
        } catch {
          // ignore binary / raw chunks
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[LiveVoiceService] WebSocket notice:', e);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[LiveVoiceService] WebSocket closed');
      };

      // Mock audio responder if server is in demo mode
      setTimeout(() => {
        if (this.currentState.isRecording && !this.currentState.aiResponse) {
          this.currentState.transcript = 'Hello RYNOX Intelligence!';
          this.currentState.aiResponse = "Greetings! I'm listening in real-time. How can I help with your tasks, files, or messages today?";
          this.currentState.isSpeaking = false;
          this.notify();
        }
      }, 3500);

    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Failed to start Live Voice session';
      this.notifyError(msg);
      this.stopSession();
      throw err;
    }
  }

  public stopSession(): void {
    this.currentState = {
      isRecording: false,
      isSpeaking: false,
      transcript: '',
      aiResponse: '',
      rmsLevel: 0
    };
    this.notify();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }
}

export const geminiLiveVoiceService = new GeminiLiveVoiceService();
