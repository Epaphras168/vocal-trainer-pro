import { useCallback, useEffect, useRef } from 'react';
import { pitchEngine } from '../audio/pitchEngine';
import { fitToRange, homeNote } from '../audio/notes';
import type { Sample, Score } from '../audio/scoring';

export interface VoiceRange {
  low: number;
  high: number;
}

export interface ExerciseProps<S> {
  step: S;
  range: VoiceRange;
  onComplete: (score: Score) => void;
}

/** A single note at `offset` semitones from home, kept inside the singer's range. */
export function noteFor(offset: number, range: VoiceRange): number {
  const home = homeNote(range.low, range.high);
  // Leave a semitone of headroom at each end: edges of a range are rarely comfy.
  return fitToRange(home + offset, range.low + 1, range.high - 1);
}

/** Place a melody so every note fits the range, keeping its shape. */
export function placeMelody(offsets: number[], range: VoiceRange): number[] {
  const home = homeNote(range.low, range.high);
  const lo = Math.min(...offsets);
  const hi = Math.max(...offsets);
  let base = home;
  if (base + hi > range.high - 1) base = range.high - 1 - hi;
  if (base + lo < range.low + 1) base = range.low + 1 - lo;
  return offsets.map((o) => base + o);
}

/** A comfortable visible window around some notes. */
export function viewFor(notes: number[], pad = 4): VoiceRange {
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  const span = hi - lo;
  const extra = Math.max(pad, Math.ceil((10 - span) / 2));
  return { low: lo - extra, high: hi + extra };
}

/** Collect pitch frames as samples relative to an origin on the engine clock. */
export function useRecorder() {
  const samples = useRef<Sample[]>([]);
  const origin = useRef<number | null>(null);

  useEffect(
    () =>
      pitchEngine.onFrame((f) => {
        if (origin.current === null || f.t < origin.current) return;
        samples.current.push({ t: f.t - origin.current, midi: f.midi, rms: f.rms });
      }),
    [],
  );

  const start = useCallback((at: number = pitchEngine.now()) => {
    samples.current = [];
    origin.current = at;
  }, []);

  const stop = useCallback((): Sample[] => {
    origin.current = null;
    return samples.current;
  }, []);

  return { start, stop, samples, origin };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Upgrade a score when the singer showed a real vibrato: an even 4-8 Hz wave. */
export function detectVibrato(samples: Sample[]): { present: boolean; rate: number; extent: number } {
  const v = samples.filter((s) => s.midi !== null) as { t: number; midi: number }[];
  if (v.length < 60) return { present: false, rate: 0, extent: 0 };
  // Detrend with a ~0.3 s moving average, then count oscillations.
  const win = 9;
  const resid: { t: number; d: number }[] = [];
  for (let i = win; i < v.length - win; i++) {
    let sum = 0;
    for (let j = i - win; j <= i + win; j++) sum += v[j].midi;
    resid.push({ t: v[i].t, d: v[i].midi - sum / (win * 2 + 1) });
  }
  let crossings = 0;
  for (let i = 1; i < resid.length; i++) if (Math.sign(resid[i].d) !== Math.sign(resid[i - 1].d)) crossings++;
  const duration = resid[resid.length - 1].t - resid[0].t || 1;
  const rate = crossings / 2 / duration;
  const extent = Math.sqrt(resid.reduce((a, r) => a + r.d * r.d, 0) / resid.length) * 100 * Math.SQRT2;
  return { present: rate >= 3.5 && rate <= 8.5 && extent >= 12 && extent <= 120, rate, extent };
}

export function emptyScore(): Score {
  return { precision: 0, sustain: 0, accuracy: 0, notes: [] };
}
