// Web Audio API based procedural sound effects generator
class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ringInterval: number | null = null;
  private ringbackInterval: number | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.isMuted = !enabled;
    if (this.isMuted) {
      this.stopRinging();
      this.stopRingback();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted) {
      this.stopRinging();
      this.stopRingback();
    }
  }

  public play(type: 'send' | 'receive' | 'pop' | 'tap' | 'call_connected' | 'call_ended' | 'error') {
    switch (type) {
      case 'send':
        this.playSent();
        break;
      case 'receive':
        this.playReceived();
        break;
      case 'pop':
      case 'tap':
        this.playTap();
        break;
      case 'call_connected':
        this.playCallConnected();
        break;
      case 'call_ended':
        this.playCallEnded();
        break;
      case 'error':
        this.playError();
        break;
    }
  }

  // Play a soft high-tech sent "pop"
  public playSent() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      // Ignore audio errors
    }
  }

  // Play a subtle double-tone incoming message chime
  public playReceived() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Tone 1 (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Tone 2 (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.09);
      gain2.gain.setValueAtTime(0.12, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }

  // Subtle UI tap sound
  public playTap() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Ignore audio errors
    }
  }

  // --- Real WebRTC Call Audio Effects ---

  // Start continuous incoming call ring tone
  public startRinging() {
    if (this.isMuted || this.ringInterval !== null) return;
    const playRingCycle = () => {
      if (this.isMuted) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const chords = [
          { f1: 523.25, f2: 659.25, t: 0.0 }, // C5 + E5
          { f1: 659.25, f2: 783.99, t: 0.18 }, // E5 + G5
          { f1: 783.99, f2: 1046.5, t: 0.36 }, // G5 + C6
        ];

        chords.forEach(({ f1, f2, t }) => {
          const o1 = ctx.createOscillator();
          const o2 = ctx.createOscillator();
          const g = ctx.createGain();

          o1.type = 'sine';
          o2.type = 'triangle';
          o1.frequency.setValueAtTime(f1, now + t);
          o2.frequency.setValueAtTime(f2, now + t);

          g.gain.setValueAtTime(0.12, now + t);
          g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);

          o1.connect(g);
          o2.connect(g);
          g.connect(ctx.destination);

          o1.start(now + t);
          o1.stop(now + t + 0.16);
          o2.start(now + t);
          o2.stop(now + t + 0.16);
        });
      } catch {
        // Ignore audio errors
      }
    };

    playRingCycle();
    this.ringInterval = window.setInterval(playRingCycle, 2400);
  }

  public stopRinging() {
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Start outgoing ringback tone ("tuuut... tuuut...")
  public startRingback() {
    if (this.isMuted || this.ringbackInterval !== null) return;
    const playTone = () => {
      if (this.isMuted) return;
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Dual frequencies: 440Hz + 480Hz standard ringback
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();

        o1.type = 'sine';
        o2.type = 'sine';
        o1.frequency.setValueAtTime(440, now);
        o2.frequency.setValueAtTime(480, now);

        g.gain.setValueAtTime(0.08, now);
        g.gain.setValueAtTime(0.08, now + 1.2);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);

        o1.start(now);
        o1.stop(now + 1.3);
        o2.start(now);
        o2.stop(now + 1.3);
      } catch {
        // Ignore audio errors
      }
    };

    playTone();
    this.ringbackInterval = window.setInterval(playTone, 3500);
  }

  public stopRingback() {
    if (this.ringbackInterval !== null) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }

  // Chime played upon establishing WebRTC connection
  public playCallConnected() {
    this.stopRinging();
    this.stopRingback();
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Descending chime played when call terminates
  public playCallEnded() {
    this.stopRinging();
    this.stopRingback();
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [659.25, 523.25, 392.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);

        gain.gain.setValueAtTime(0.1, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.18);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Error tone
  public playError() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore audio errors
    }
  }
}

export const soundEffects = new SoundEffectsService();
