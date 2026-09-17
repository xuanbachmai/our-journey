/**
 * Tiny synth for chiptune-style sound effects and a soft background loop.
 * No audio files: everything is oscillators and noise, so it loads instantly.
 */
type SfxName =
  | 'blip'
  | 'till'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'coin'
  | 'good'
  | 'great'
  | 'bad'
  | 'chop'
  | 'flip'
  | 'shake'
  | 'bite'
  | 'cluck'
  | 'quest'
  | 'splash'
  | 'open';

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNote = 0;
  private step = 0;
  sfxOn = true;
  musicOn = true;

  /** Must be called from a user gesture on mobile. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.18 : 0;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.18 : 0, this.ctx.currentTime, 0.1);
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.25, slide = 0, delay = 0) {
    if (!this.ctx || !this.master || !this.sfxOn) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2, filterHz = 1200, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf || !this.sfxOn) return;
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterHz;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  play(name: SfxName) {
    switch (name) {
      case 'blip':
        this.tone(880, 0.06, 'square', 0.12);
        break;
      case 'open':
        this.tone(660, 0.05, 'square', 0.1);
        this.tone(990, 0.08, 'square', 0.1, 0, 0.05);
        break;
      case 'till':
        this.noise(0.12, 0.3, 500);
        this.tone(120, 0.1, 'triangle', 0.2, -40);
        break;
      case 'plant':
        this.tone(520, 0.08, 'sine', 0.2, 300);
        break;
      case 'water':
        this.noise(0.25, 0.18, 3000);
        this.tone(900, 0.15, 'sine', 0.08, 400);
        break;
      case 'splash':
        this.noise(0.35, 0.25, 2200);
        this.tone(300, 0.2, 'sine', 0.1, -150);
        break;
      case 'harvest':
        this.tone(660, 0.07, 'square', 0.15);
        this.tone(880, 0.07, 'square', 0.15, 0, 0.07);
        this.tone(1320, 0.12, 'square', 0.15, 0, 0.14);
        break;
      case 'coin':
        this.tone(1200, 0.06, 'square', 0.15);
        this.tone(1800, 0.14, 'square', 0.15, 0, 0.06);
        break;
      case 'good':
        this.tone(523, 0.09, 'triangle', 0.25);
        this.tone(659, 0.09, 'triangle', 0.25, 0, 0.09);
        this.tone(784, 0.18, 'triangle', 0.25, 0, 0.18);
        break;
      case 'great':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.22, 0, i * 0.07));
        break;
      case 'quest':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.16, 'square', 0.14, 0, i * 0.1));
        break;
      case 'bad':
        this.tone(220, 0.25, 'sawtooth', 0.12, -120);
        break;
      case 'chop':
        this.noise(0.05, 0.3, 900);
        this.tone(200, 0.05, 'square', 0.12, -100);
        break;
      case 'flip':
        this.tone(400, 0.12, 'sine', 0.15, 500);
        break;
      case 'shake':
        this.noise(0.06, 0.2, 6000);
        break;
      case 'bite':
        this.tone(1000, 0.08, 'square', 0.2);
        this.tone(1000, 0.08, 'square', 0.2, 0, 0.12);
        break;
      case 'cluck':
        this.tone(700, 0.06, 'square', 0.1, -200);
        this.tone(900, 0.08, 'square', 0.1, -300, 0.08);
        break;
    }
  }

  // A gentle pentatonic loop in C major; two bars, arpeggio + bass.
  private startMusic() {
    if (!this.ctx) return;
    const melody = [523, 659, 784, 880, 784, 659, 587, 523, 440, 523, 587, 659, 587, 523, 440, 392];
    const bass = [131, 131, 165, 165, 110, 110, 98, 98];
    const beat = 0.28;
    this.nextNote = this.ctx.currentTime + 0.1;
    const schedule = () => {
      if (!this.ctx || !this.musicGain) return;
      while (this.nextNote < this.ctx.currentTime + 0.4) {
        const i = this.step % melody.length;
        const t = this.nextNote;
        const o = this.ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = melody[i];
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.9);
        o.connect(g).connect(this.musicGain);
        o.start(t);
        o.stop(t + beat);
        if (i % 2 === 0) {
          const b = this.ctx.createOscillator();
          b.type = 'sine';
          b.frequency.value = bass[(i / 2) % bass.length];
          const bg = this.ctx.createGain();
          bg.gain.setValueAtTime(0.6, t);
          bg.gain.exponentialRampToValueAtTime(0.001, t + beat * 1.8);
          b.connect(bg).connect(this.musicGain);
          b.start(t);
          b.stop(t + beat * 2);
        }
        this.nextNote += beat;
        this.step++;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 200);
  }

  destroy() {
    if (this.musicTimer) clearInterval(this.musicTimer);
  }
}

export const audio = new Audio();
