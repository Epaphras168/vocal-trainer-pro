import { midiToFreq } from './notes';
import { pitchEngine } from './pitchEngine';

// Everything Belto plays out loud: reference notes, a sung "ahh" demo voice,
// metronome clicks and the little reward sounds.

export type Timbre = 'piano' | 'voice';
export type Sfx = 'hit' | 'success' | 'levelup' | 'xp' | 'soft' | 'tap' | 'streak' | 'gem' | 'pop';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxEnabled = true;

export function setSfxEnabled(on: boolean): void {
  sfxEnabled = on;
}

function audio(): { ctx: AudioContext; out: GainNode } {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

/** Convert an AudioContext time to the pitch engine's clock. */
export function toEngineTime(audioTime: number): number {
  const { ctx } = audio();
  return pitchEngine.now() + (audioTime - ctx.currentTime);
}

function suppressMicUntil(audioTime: number): void {
  // A little tail for room echo.
  pitchEngine.suppressUntil(toEngineTime(audioTime) + 0.18);
}

function pianoNote(c: AudioContext, out: AudioNode, midi: number, start: number, dur: number, vel = 0.5): number {
  const f = midiToFreq(midi);
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(8000, f * 9), start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2.5), start + dur + 0.3);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vel, start + 0.008);
  g.gain.exponentialRampToValueAtTime(vel * 0.35, start + 0.35);
  g.gain.setValueAtTime(vel * 0.35, start + Math.max(0.36, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.45);
  const partials: [OscillatorType, number, number][] = [
    ['triangle', 1, 1],
    ['sine', 2, 0.35],
    ['sine', 3, 0.12],
  ];
  for (const [type, mult, amp] of partials) {
    const o = c.createOscillator();
    const pg = c.createGain();
    o.type = type;
    o.frequency.value = f * mult;
    o.detune.value = mult === 1 ? 0 : 3;
    pg.gain.value = amp;
    o.connect(pg).connect(filter);
    o.start(start);
    o.stop(start + dur + 0.5);
  }
  filter.connect(g).connect(out);
  return start + dur + 0.45;
}

// A sawtooth through three vowel formants with gentle vibrato: a passable "ahh".
function voiceNote(c: AudioContext, out: AudioNode, midi: number, start: number, dur: number, vel = 0.35): number {
  const f = midiToFreq(midi);
  const src = c.createOscillator();
  src.type = 'sawtooth';
  src.frequency.value = f;
  const vib = c.createOscillator();
  const vibDepth = c.createGain();
  vib.frequency.value = 5.2;
  vibDepth.gain.setValueAtTime(0, start);
  vibDepth.gain.linearRampToValueAtTime(f * 0.012, start + Math.min(0.6, dur * 0.6));
  vib.connect(vibDepth).connect(src.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vel, start + 0.08);
  g.gain.setValueAtTime(vel, start + Math.max(0.09, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.12);
  for (const [freq, q, amp] of [
    [750, 6, 1],
    [1150, 8, 0.55],
    [2650, 10, 0.25],
  ]) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    const fg = c.createGain();
    fg.gain.value = amp;
    src.connect(bp).connect(fg).connect(g);
  }
  g.connect(out);
  src.start(start);
  vib.start(start);
  src.stop(start + dur + 0.15);
  vib.stop(start + dur + 0.15);
  return start + dur + 0.12;
}

export interface SeqNote {
  midi: number;
  /** Seconds. */
  dur: number;
  /** Optional rest after the note, seconds. */
  gap?: number;
}

/** Play a single note. Resolves when it has finished sounding. */
export function playNote(midi: number, dur = 1, timbre: Timbre = 'piano'): Promise<void> {
  return playSequence([{ midi, dur }], timbre);
}

/** Play notes back to back. Resolves when the last one has finished. */
export function playSequence(notes: SeqNote[], timbre: Timbre = 'piano', lead = 0.06): Promise<void> {
  const { ctx: c, out } = audio();
  let t = c.currentTime + lead;
  let end = t;
  for (const n of notes) {
    end = (timbre === 'voice' ? voiceNote : pianoNote)(c, out, n.midi, t, n.dur);
    t += n.dur + (n.gap ?? 0.04);
  }
  suppressMicUntil(end);
  return new Promise((resolve) => setTimeout(resolve, (end - c.currentTime) * 1000));
}

/** A slow pitch slide, for demoing glides and sirens. */
export function playGlide(fromMidi: number, toMidi: number, dur: number): Promise<void> {
  const { ctx: c, out } = audio();
  const start = c.currentTime + 0.05;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(midiToFreq(fromMidi), start);
  o.frequency.exponentialRampToValueAtTime(midiToFreq(toMidi), start + dur);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.22, start + 0.1);
  g.gain.setValueAtTime(0.22, start + dur - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.1);
  o.connect(lp).connect(g).connect(out);
  o.start(start);
  o.stop(start + dur + 0.15);
  suppressMicUntil(start + dur + 0.1);
  return new Promise((r) => setTimeout(r, (start + dur + 0.15 - c.currentTime) * 1000));
}

/** One metronome tick at an absolute AudioContext time. */
export function scheduleClick(at: number, accent = false): void {
  const { ctx: c, out } = audio();
  const o = c.createOscillator();
  const g = c.createGain();
  // Above the pitch detector's ceiling, so a click is never mistaken for singing.
  o.type = 'triangle';
  o.frequency.value = accent ? 2637 : 2093;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.14, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.06);
}

export function audioNow(): number {
  return audio().ctx.currentTime;
}

/** Seconds between scheduling a sound and it leaving the speakers. */
export function outputLatency(): number {
  const { ctx: c } = audio();
  return (c.baseLatency || 0) + ((c as AudioContext & { outputLatency?: number }).outputLatency || 0);
}

/**
 * Tiny reward and UI sounds. All gentle, all short. The ones that can fire
 * mid-exercise (hit, xp, tap, pop) sit above the detector's range.
 */
export function sfx(kind: Sfx): void {
  if (!sfxEnabled) return;
  const { ctx: c, out } = audio();
  const t = c.currentTime + 0.01;
  const blip = (midi: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = midiToFreq(midi);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
  };
  switch (kind) {
    case 'hit':
      // Kept above the detector's ceiling so it never reads as the singer.
      blip(91, t, 0.12, 'sine', 0.1);
      blip(98, t + 0.06, 0.18, 'sine', 0.08);
      break;
    case 'xp':
      blip(96, t, 0.08, 'triangle', 0.08);
      break;
    case 'tap':
      blip(93, t, 0.05, 'triangle', 0.07);
      break;
    case 'pop':
      blip(91, t, 0.06, 'sine', 0.12);
      blip(98, t + 0.03, 0.08, 'sine', 0.09);
      break;
    case 'gem':
      [91, 95, 98, 103].forEach((m, i) => blip(m, t + i * 0.045, 0.2, 'sine', 0.08));
      break;
    case 'success':
      [72, 76, 79, 84].forEach((m, i) => blip(m, t + i * 0.09, 0.35, 'triangle', 0.14));
      break;
    case 'streak':
      [67, 74, 79, 86].forEach((m, i) => blip(m, t + i * 0.07, 0.3, 'sawtooth', 0.05));
      blip(91, t + 0.3, 0.5, 'triangle', 0.12);
      break;
    case 'levelup':
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => blip(m, t + i * 0.07, 0.4, 'triangle', 0.13));
      [72, 76, 79].forEach((m) => blip(m, t + 0.55, 0.9, 'sine', 0.1));
      break;
    case 'soft':
      blip(67, t, 0.18, 'sine', 0.1);
      blip(64, t + 0.12, 0.3, 'sine', 0.08);
      break;
  }
}
