/**
 * NES 2A03 APU and MS-DOS PC Speaker Audio Synthesizer
 */

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Authentic NES Pulse wave tone
   */
  public playPulse(frequency: number, durationSec = 0.08, volume = 0.15): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // AudioContext could be blocked by browser policy until interaction
    }
  }

  /**
   * MS-DOS PC Speaker Beep (INT 10h AH=0Eh, AL=07h or direct 8253 PIT / port 61h)
   */
  public playPcSpeakerBeep(frequency = 750, durationSec = 0.1): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // 1-bit timer 2 pulse
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + durationSec * 0.9);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  /**
   * 8-bit Noise Channel (Percussion / explosions / hits)
   */
  public playNoise(durationSec = 0.1, volume = 0.12): void {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const bufferSize = ctx.sampleRate * durationSec;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);

      // NES pseudo-random LFSR noise
      let reg = 1;
      for (let i = 0; i < bufferSize; i++) {
        const feedback = (reg & 1) ^ ((reg >> 1) & 1);
        reg = (reg >> 1) | (feedback << 14);
        output[i] = (reg & 1) ? 0.8 : -0.8;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      whiteNoise.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();
    } catch {}
  }

  public playSoundEffect(type: 'hit' | 'score' | 'bounce' | 'move' | 'select' | 'error'): void {
    switch (type) {
      case 'bounce':
        this.playPulse(440, 0.05, 0.15);
        break;
      case 'hit':
        this.playNoise(0.06, 0.2);
        this.playPulse(220, 0.08, 0.15);
        break;
      case 'score':
        this.playPulse(587.33, 0.08, 0.15);
        setTimeout(() => this.playPulse(880, 0.12, 0.18), 80);
        break;
      case 'move':
        this.playPulse(330, 0.04, 0.1);
        break;
      case 'select':
        this.playPcSpeakerBeep(987.77, 0.06);
        break;
      case 'error':
        this.playPulse(110, 0.15, 0.2);
        break;
    }
  }
}

export const retroAudio = new RetroAudioEngine();
