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
  | 'open'
  | 'door'
  | 'serve'
  | 'tip'
  | 'bark'
  | 'meow'
  | 'moo'
  | 'baa'
  | 'firework'
  | 'place'
  | 'pop'
  | 'whistle';

/** Overall level of the background music (sound effects are separate). */
const MUSIC_VOLUME = 0.5;

class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
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
      this.musicGain.gain.value = this.musicOn ? MUSIC_VOLUME : 0;
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
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? MUSIC_VOLUME : 0, this.ctx.currentTime, 0.4);
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
      case 'door':
        this.noise(0.08, 0.2, 700);
        this.tone(320, 0.12, 'triangle', 0.15, -80, 0.05);
        break;
      case 'serve':
        this.tone(988, 0.08, 'triangle', 0.2);
        this.tone(1319, 0.16, 'triangle', 0.2, 0, 0.08);
        break;
      case 'tip':
        [1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.1, 'square', 0.12, 0, i * 0.06));
        break;
      case 'bark':
        this.tone(300, 0.08, 'square', 0.15, 200);
        this.tone(260, 0.1, 'square', 0.15, 150, 0.12);
        break;
      case 'meow':
        this.tone(600, 0.25, 'triangle', 0.15, 500);
        break;
      case 'moo':
        this.tone(160, 0.45, 'sawtooth', 0.1, -40);
        break;
      case 'baa':
        this.tone(420, 0.12, 'sawtooth', 0.08, 0);
        this.tone(420, 0.12, 'sawtooth', 0.08, 0, 0.14);
        this.tone(420, 0.12, 'sawtooth', 0.08, 0, 0.28);
        break;
      case 'firework':
        this.tone(200, 0.3, 'sine', 0.2, 900);
        this.noise(0.5, 0.35, 1800, 0.32);
        break;
      case 'place':
        this.tone(440, 0.06, 'square', 0.15);
        this.tone(660, 0.1, 'square', 0.15, 0, 0.06);
        break;
      case 'pop':
        this.tone(700, 0.05, 'sine', 0.2, 500);
        break;
      case 'whistle':
        this.tone(1200, 0.15, 'sine', 0.15, 600);
        this.tone(1800, 0.15, 'sine', 0.15, -600, 0.15);
        break;
    }
  }

  private rainSrc: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  /** Soft looping rain; safe to call repeatedly. */
  setRain(on: boolean) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    if (on && !this.rainSrc) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(this.sfxOn ? 0.12 : 0, this.ctx.currentTime, 1.5);
      s.connect(f).connect(g).connect(this.master);
      s.start();
      this.rainSrc = s;
      this.rainGain = g;
    } else if (!on && this.rainSrc) {
      const src = this.rainSrc;
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
      setTimeout(() => src.stop(), 2500);
      this.rainSrc = null;
      this.rainGain = null;
    }
  }

  // ------------------------------------------------------------------ music
  //
  // "Our little farm": a slow lo-fi lullaby in C major, 76 bpm, 16 bars (about 50 s).
  // Soft pad chords, a music-box melody with a gentle echo, a warm bass, a very
  // quiet brush on the off-beats and a soft heartbeat kick. Everything goes
  // through a low-pass filter so nothing sounds sharp.

  private musicIn: GainNode | null = null;
  private echo: DelayNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicStep = 0;
  private nextMusicTime = 0;

  /** Length of one eighth note in seconds (76 bpm). */
  private static readonly EIGHTH = 60 / 76 / 2;

  /** Chords per bar: [bass root, ...pad notes] as MIDI numbers. */
  private static readonly CHORDS: number[][] = [
    // A: Cmaj7, Am7, Fmaj7, G6, Cmaj7, Em7, Fmaj7, Fm6
    [36, 60, 64, 67, 71],
    [33, 57, 60, 64, 67],
    [29, 57, 60, 64, 65],
    [31, 55, 59, 62, 64],
    [36, 60, 64, 67, 71],
    [28, 55, 59, 62, 64],
    [29, 57, 60, 64, 65],
    [29, 56, 60, 62, 65],
    // B: Am7, Dm7, G6, Cmaj7, Fmaj7, Em7, Dm7, G7
    [33, 57, 60, 64, 67],
    [26, 57, 60, 62, 65],
    [31, 55, 59, 62, 64],
    [36, 60, 64, 67, 71],
    [29, 57, 60, 64, 65],
    [28, 55, 59, 62, 64],
    [26, 57, 60, 62, 65],
    [31, 55, 59, 62, 65],
  ];

  /** Melody: [start eighth, MIDI note, length in eighths]. 16 bars of 8 eighths. */
  private static readonly MELODY: [number, number, number][] = [
    // A section
    [0, 76, 2], [2, 79, 2], [4, 84, 3],
    [9, 81, 1], [10, 79, 2], [12, 76, 4],
    [16, 77, 2], [18, 76, 2], [20, 72, 2], [22, 69, 2],
    [24, 74, 4], [29, 76, 1], [30, 79, 2],
    [32, 76, 2], [34, 79, 2], [36, 84, 2], [38, 86, 2],
    [40, 83, 3], [43, 79, 1], [44, 76, 4],
    [48, 77, 2], [50, 81, 2], [52, 79, 2], [54, 77, 2],
    [56, 72, 3], [59, 68, 1], [60, 67, 4],
    // B section
    [64, 72, 2], [66, 76, 2], [68, 81, 4],
    [72, 77, 2], [74, 76, 1], [75, 74, 1], [76, 72, 4],
    [80, 74, 2], [82, 79, 2], [84, 83, 2], [86, 81, 2],
    [88, 79, 6],
    [96, 81, 2], [98, 84, 2], [100, 81, 2], [102, 77, 2],
    [104, 79, 3], [107, 76, 1], [108, 74, 4],
    [112, 77, 2], [114, 76, 2], [116, 74, 2], [118, 72, 2],
    [120, 71, 4], [124, 74, 2], [126, 77, 2],
  ];

  private static midi(m: number) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /** One enveloped oscillator voice. */
  private voice(dest: AudioNode, midi: number, t: number, dur: number, type: OscillatorType, vol: number, attack: number, detune = 0) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = Audio.midi(midi);
    o.detune.value = detune;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;

    // bus: voices -> musicIn -> low-pass -> musicGain (volume and mute) -> master
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2600;
    lowpass.Q.value = 0.4;
    this.musicIn = ctx.createGain();
    this.musicIn.connect(lowpass).connect(this.musicGain);
    this.musicFilter = lowpass;

    // soft echo for the melody: a dotted eighth with a few quiet repeats
    this.echo = ctx.createDelay(2);
    this.echo.delayTime.value = Audio.EIGHTH * 1.5;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(wet).connect(this.musicIn);

    this.nextMusicTime = ctx.currentTime + 0.3;
    this.musicStep = 0;
    const schedule = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // after the tab was hidden, skip ahead instead of playing a burst of old notes
      if (this.nextMusicTime < now - 0.25) {
        const missed = Math.ceil((now - this.nextMusicTime) / Audio.EIGHTH);
        this.musicStep += missed;
        this.nextMusicTime += missed * Audio.EIGHTH;
      }
      while (this.nextMusicTime < now + 0.6) {
        this.playEighth(this.musicStep, this.nextMusicTime);
        this.nextMusicTime += Audio.EIGHTH;
        this.musicStep++;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 150);
  }

  private playEighth(step: number, t: number) {
    const bus = this.musicIn;
    if (!bus || !this.echo) return;
    const E = Audio.EIGHTH;
    const pos = step % (Audio.CHORDS.length * 8);
    const bar = Math.floor(pos / 8);
    const inBar = pos % 8;
    const chord = Audio.CHORDS[bar];
    // a tiny swing on the off-beats makes it feel relaxed rather than mechanical
    const at = t + (inBar % 2 === 1 ? E * 0.12 : 0);

    // late at night the band plays softer: darker tone, no kick or brush
    const hour = new Date().getHours();
    const night = hour >= 21 || hour < 6;
    if (inBar === 0 && this.musicFilter && this.ctx) this.musicFilter.frequency.setTargetAtTime(night ? 1700 : 2600, at, 2);

    if (inBar === 0) {
      // warm pad: slow attack, two slightly detuned layers, lasts the whole bar
      chord.slice(1).forEach((n, i) => {
        this.voice(bus, n, at, E * 8.4, 'sine', 0.05, 0.9, i % 2 ? 4 : -4);
        this.voice(bus, n, at, E * 8.4, 'triangle', 0.018, 1.2, i % 2 ? -7 : 7);
      });
      // bass on beat one, and a soft heartbeat kick
      this.voice(bus, chord[0] + 12, at, E * 3.5, 'sine', 0.22, 0.03);
      if (!night) this.kick(at, 0.16);
    }
    if (inBar === 4) this.voice(bus, chord[0] + 19, at, E * 3, 'sine', 0.14, 0.03);
    if (inBar === 6 && !night) this.kick(at, 0.07);

    // music-box plucks walking up the chord on the off-beats, with a brush
    if (inBar % 2 === 1) {
      const notes = chord.slice(1);
      const n = notes[((inBar - 1) / 2) % notes.length] + 12;
      this.voice(bus, n, at, E * 2.2, 'sine', 0.035, 0.005);
      if (!night) this.brush(at);
    }

    // melody: bell-like triangle plus a quiet sine an octave up, also sent to the echo
    for (const [start, note, len] of Audio.MELODY) {
      if (start !== pos) continue;
      const dur = Math.max(E * 2, E * len * 1.4);
      this.voice(bus, note, at, dur, 'triangle', 0.09, 0.008);
      this.voice(bus, note + 12, at, dur * 0.6, 'sine', 0.025, 0.004);
      this.voice(this.echo, note, at, dur * 0.8, 'triangle', 0.05, 0.008);
    }
  }

  /** Very soft low thump. */
  private kick(t: number, vol: number) {
    if (!this.ctx || !this.musicIn) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(this.musicIn);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** Brushed-snare whisper. */
  private brush(t: number) {
    if (!this.ctx || !this.musicIn || !this.noiseBuf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.012, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    s.connect(hp).connect(g).connect(this.musicIn);
    s.start(t, Math.random() * 0.4);
    s.stop(t + 0.08);
  }

  destroy() {
    if (this.musicTimer) clearInterval(this.musicTimer);
  }
}

export const audio = new Audio();
