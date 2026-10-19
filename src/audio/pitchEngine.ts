import { PitchDetector } from 'pitchy';
import { freqToMidi } from './notes';

// Real-time pitch tracking, fully in the browser: getUserMedia -> AnalyserNode
// -> pitchy (McLeod Pitch Method) on every animation frame (~60 Hz).

export interface PitchFrame {
  /** Seconds on the engine clock (performance.now based). */
  t: number;
  /** Smoothed fractional MIDI note, or null when nothing clear is being sung. */
  midi: number | null;
  /** Raw detected frequency for this frame, null when unvoiced. */
  hz: number | null;
  /** pitchy's clarity, 0..1. */
  clarity: number;
  /** Input loudness, 0..1 RMS. */
  rms: number;
  /**
   * Energy in the 3-9 kHz band in dB. A soft "sss" lives up here and is very
   * quiet overall, so this tells a gentle hiss apart from room noise far better
   * than overall loudness does.
   */
  hissDb: number;
}

export type MicState = 'idle' | 'requesting' | 'running' | 'denied' | 'unsupported' | 'error';

/** Coaching hint derived from the last ~1.5 s of input. */
export type InputHint = 'ok' | 'silent' | 'quiet' | 'noisy' | 'unsteady';

type FrameListener = (frame: PitchFrame) => void;
type StateListener = (state: MicState) => void;

const FFT_SIZE = 2048;
const MIN_HZ = 55; // ~A1, below any comfortable bass note
const MAX_HZ = 1400; // ~F6, above most sopranos
const CLARITY_MIN = 0.86;
const RMS_SILENT = 0.004;
const RMS_QUIET = 0.012;
// How long a voiced note may drop out before we report silence (keeps lines continuous).
const HOLD_MS = 90;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

class PitchEngine {
  state: MicState = 'idle';
  latest: PitchFrame = { t: 0, midi: null, hz: null, clarity: 0, rms: 0, hissDb: -140 };
  errorMessage = '';

  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private detector = PitchDetector.forFloat32Array(FFT_SIZE);
  private buffer = new Float32Array(FFT_SIZE);
  private spectrum = new Float32Array(FFT_SIZE / 2);
  private raf = 0;
  private frameListeners = new Set<FrameListener>();
  private stateListeners = new Set<StateListener>();
  private recentMidi: number[] = [];
  private smoothed: number | null = null;
  private lastVoicedAt = 0;
  private voicedStreak = 0;
  private suppressedUntil = 0;
  private history: PitchFrame[] = [];

  constructor() {
    this.detector.minVolumeDecibels = -60;
  }

  get supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  now(): number {
    return performance.now() / 1000;
  }

  async start(): Promise<MicState> {
    if (this.state === 'running') return this.state;
    if (!this.supported) return this.setState('unsupported');
    this.setState('requesting');
    try {
      // Browser DSP smears sustained notes, so ask for the raw signal.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      this.errorMessage = (err as Error)?.message ?? String(err);
      return this.setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    }
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => undefined);
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    source.connect(this.analyser);
    this.stream.getAudioTracks()[0]?.addEventListener('ended', () => this.stop());
    this.loop();
    return this.setState('running');
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => undefined);
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
    this.recentMidi = [];
    this.smoothed = null;
    this.history = [];
    if (this.state === 'running') this.setState('idle');
  }

  /**
   * Ignore input until the given time (engine seconds). Used while Belto plays
   * a reference tone so the speaker isn't mistaken for the singer.
   */
  suppressUntil(t: number): void {
    this.suppressedUntil = Math.max(this.suppressedUntil, t);
  }

  get suppressed(): boolean {
    return this.now() < this.suppressedUntil;
  }

  onFrame(fn: FrameListener): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  onState(fn: StateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  /** A friendly read on input quality over the last ~1.5 s. */
  hint(): InputHint {
    const now = this.now();
    const recent = this.history.filter((f) => now - f.t < 1.5);
    if (recent.length < 10) return 'ok';
    const loud = recent.filter((f) => f.rms > RMS_QUIET);
    const voiced = recent.filter((f) => f.midi !== null);
    const meanRms = recent.reduce((a, f) => a + f.rms, 0) / recent.length;
    if (meanRms < RMS_SILENT) return 'silent';
    if (voiced.length < recent.length * 0.3) {
      if (loud.length > recent.length * 0.5) return 'noisy';
      return 'quiet';
    }
    const ms = voiced.map((f) => f.midi as number);
    const mean = ms.reduce((a, b) => a + b, 0) / ms.length;
    const sd = Math.sqrt(ms.reduce((a, m) => a + (m - mean) ** 2, 0) / ms.length);
    // Over half a semitone of wobble while holding reads as unsteady.
    if (sd > 0.55 && voiced.length > recent.length * 0.6) return 'unsteady';
    return 'ok';
  }

  private setState(s: MicState): MicState {
    this.state = s;
    this.stateListeners.forEach((fn) => fn(s));
    return s;
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.analyser || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer);

    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) sum += this.buffer[i] * this.buffer[i];
    const rms = Math.sqrt(sum / this.buffer.length);
    const t = this.now();

    let hz: number | null = null;
    let clarity = 0;
    if (rms > RMS_SILENT && t >= this.suppressedUntil) {
      const [pitch, c] = this.detector.findPitch(this.buffer, this.ctx.sampleRate);
      clarity = c;
      if (c >= CLARITY_MIN && pitch >= MIN_HZ && pitch <= MAX_HZ) hz = pitch;
    }

    const midi = this.track(hz, t);
    const frame: PitchFrame = { t, midi, hz, clarity, rms, hissDb: this.hissLevel() };
    this.latest = frame;
    this.history.push(frame);
    if (this.history.length > 180) this.history.splice(0, this.history.length - 180);
    this.frameListeners.forEach((fn) => fn(frame));
  };

  /** Mean power between 3 and 9 kHz, in dB. */
  private hissLevel(): number {
    if (!this.analyser || !this.ctx) return -140;
    this.analyser.getFloatFrequencyData(this.spectrum);
    const binHz = this.ctx.sampleRate / FFT_SIZE;
    const from = Math.ceil(3000 / binHz);
    const to = Math.min(this.spectrum.length - 1, Math.floor(9000 / binHz));
    let power = 0;
    for (let i = from; i <= to; i++) power += Math.pow(10, Math.max(this.spectrum[i], -140) / 10);
    return 10 * Math.log10(power / Math.max(1, to - from + 1) + 1e-14);
  }

  /** Median filter + octave-jump rejection + light smoothing, with a short dropout hold. */
  private track(hz: number | null, t: number): number | null {
    if (hz === null) {
      this.voicedStreak = 0;
      if ((t - this.lastVoicedAt) * 1000 > HOLD_MS) {
        this.recentMidi = [];
        this.smoothed = null;
      }
      return this.smoothed;
    }
    let m = freqToMidi(hz);
    if (this.recentMidi.length >= 3) {
      const med = median(this.recentMidi);
      const jump = m - med;
      // MPM occasionally locks onto a harmonic or sub-harmonic for a frame or two.
      if (Math.abs(Math.abs(jump) - 12) < 0.7 && this.voicedStreak < 6) m -= Math.sign(jump) * 12;
    }
    this.recentMidi.push(m);
    if (this.recentMidi.length > 5) this.recentMidi.shift();
    this.voicedStreak++;
    this.lastVoicedAt = t;
    // Need two agreeing frames before we start drawing, so clicks and consonants don't blip.
    if (this.voicedStreak < 2 && this.smoothed === null) return null;
    const target = median(this.recentMidi.slice(-3));
    // Big intentional leaps should land immediately; small wobbles get smoothed.
    this.smoothed =
      this.smoothed === null || Math.abs(target - this.smoothed) > 1.5
        ? target
        : this.smoothed + (target - this.smoothed) * 0.55;
    return this.smoothed;
  }
}

export const pitchEngine = new PitchEngine();

export const HINT_COPY: Record<InputHint, string> = {
  ok: '',
  silent: "I can't hear you yet. Give me a nice open 'ahh'!",
  quiet: 'Sing a little louder, I want to hear you shine.',
  noisy: "It's a bit noisy around you. Try moving closer to the mic.",
  unsteady: 'Nice! Now try to hold the note steadier, like a long straight line.',
};
