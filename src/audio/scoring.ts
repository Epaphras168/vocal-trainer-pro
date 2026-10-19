import { centsFromFolded } from './notes';

// Grading. Everything works on recorded samples (time + fractional MIDI) so it
// is deterministic and testable away from a microphone.

export interface Sample {
  /** Seconds since the exercise started. */
  t: number;
  midi: number | null;
  rms: number;
}

export interface TargetNote {
  midi: number;
  /** Seconds since the exercise started. */
  start: number;
  end: number;
}

export interface NoteScore {
  target: TargetNote;
  /** Median cents off (octave forgiven), null if nothing was sung. */
  cents: number | null;
  precision: number;
  sustain: number;
  hit: boolean;
}

export interface Score {
  /** How close to the target notes, 0..100. */
  precision: number;
  /** How steadily and continuously notes were held, 0..100. */
  sustain: number;
  /** Headline number shown to the singer, 0..100. */
  accuracy: number;
  notes: NoteScore[];
}

/** Within this many cents a frame is perfect. */
export const PERFECT_CENTS = 15;
/** Beyond this a frame earns nothing. */
export const MISS_CENTS = 100;
/** "On the note" for live feedback and hit counting. */
export const ON_TARGET_CENTS = 50;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function framePrecision(cents: number): number {
  return clamp01(1 - (Math.abs(cents) - PERFECT_CENTS) / (MISS_CENTS - PERFECT_CENTS));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
}

/**
 * Grade samples against target notes.
 * `onsetGrace` skips the start of each note so scooping into it isn't punished;
 * `latency` shifts the window to allow for human reaction time.
 */
export function scoreNotes(
  samples: Sample[],
  targets: TargetNote[],
  opts: { onsetGrace?: number; latency?: number } = {},
): Score {
  const grace = opts.onsetGrace ?? 0.2;
  const latency = opts.latency ?? 0.1;
  const notes: NoteScore[] = targets.map((target) => {
    const from = target.start + latency + Math.min(grace, (target.end - target.start) * 0.35);
    const to = target.end + latency;
    const inWindow = samples.filter((s) => s.t >= from && s.t <= to);
    const voiced = inWindow.filter((s) => s.midi !== null);
    if (inWindow.length === 0 || voiced.length === 0) {
      return { target, cents: null, precision: 0, sustain: 0, hit: false };
    }
    const cents = voiced.map((s) => centsFromFolded(s.midi as number, target.midi));
    const precision = cents.reduce((a, c) => a + framePrecision(c), 0) / cents.length;
    const coverage = voiced.length / inWindow.length;
    // Natural vibrato is ~±30 cents; only wobble beyond that costs points.
    const stability = clamp01(1 - (stddev(cents) - 12) / 70);
    const sustain = coverage * (0.4 + 0.6 * stability);
    const med = median(cents);
    return { target, cents: Math.round(med), precision, sustain, hit: Math.abs(med) <= ON_TARGET_CENTS };
  });
  return summarise(notes);
}

export function summarise(notes: NoteScore[]): Score {
  if (notes.length === 0) return { precision: 0, sustain: 0, accuracy: 0, notes };
  const weight = (n: NoteScore) => n.target.end - n.target.start;
  const total = notes.reduce((a, n) => a + weight(n), 0) || 1;
  const precision = notes.reduce((a, n) => a + n.precision * weight(n), 0) / total;
  const sustain = notes.reduce((a, n) => a + n.sustain * weight(n), 0) / total;
  const pct = (x: number) => Math.round(x * 100);
  return {
    precision: pct(precision),
    sustain: pct(sustain),
    accuracy: pct(precision * 0.65 + sustain * 0.35),
    notes,
  };
}

/** Glide: how much of the requested span the voice travelled through, and how smoothly. */
export function scoreGlide(samples: Sample[], low: number, high: number): Score {
  const voiced = samples.filter((s) => s.midi !== null).map((s) => s.midi as number);
  const span = Math.max(1, Math.round(high - low));
  const visited = new Set<number>();
  for (const m of voiced) {
    const r = Math.round(m);
    if (r >= low && r <= high) visited.add(r);
  }
  const coverage = clamp01(visited.size / (span + 1));
  let jumps = 0;
  for (let i = 1; i < voiced.length; i++) if (Math.abs(voiced[i] - voiced[i - 1]) > 2.5) jumps++;
  const smoothness = clamp01(1 - jumps / Math.max(4, voiced.length / 10));
  const target: TargetNote = { midi: low, start: 0, end: 1 };
  const note: NoteScore = { target, cents: null, precision: coverage, sustain: smoothness, hit: coverage > 0.6 };
  return { precision: Math.round(coverage * 100), sustain: Math.round(smoothness * 100), accuracy: Math.round((coverage * 0.7 + smoothness * 0.3) * 100), notes: [note] };
}

/**
 * Breath: the longest continuous, even stretch of sound against a goal length.
 * `rms` is any linear loudness; `gap` is how long a quiet dip can last before
 * the breath counts as over. Evenness is judged in dB, the way ears hear it:
 * a natural soft hiss wobbles a few dB and that's fine.
 */
export function scoreBreath(samples: Sample[], goalSeconds: number, minRms = 0.01, gap = 0.15): Score & { seconds: number } {
  let best: Sample[] = [];
  let run: Sample[] = [];
  let gapStart: number | null = null;
  for (const s of samples) {
    if (s.rms >= minRms) {
      run.push(s);
      gapStart = null;
    } else {
      gapStart ??= s.t;
      // A short dip doesn't end the breath.
      if (s.t - gapStart > gap) {
        if (run.length > best.length) best = run;
        run = [];
      }
    }
  }
  if (run.length > best.length) best = run;
  const seconds = best.length > 1 ? best[best.length - 1].t - best[0].t : 0;
  const levelsDb = best.map((s) => 20 * Math.log10(Math.max(s.rms, 1e-6)));
  // Up to 3 dB of wobble is perfect; 12 dB or more is not steady at all.
  const evenness = levelsDb.length > 4 ? clamp01(1 - (stddev(levelsDb) - 3) / 9) : 0;
  const length = clamp01(seconds / goalSeconds);
  return {
    seconds,
    precision: Math.round(length * 100),
    sustain: Math.round(evenness * 100),
    accuracy: Math.round((length * 0.7 + evenness * 0.3) * 100),
    notes: [],
  };
}

/** Rhythm: each tap scored by its distance to the nearest beat. */
export function scoreTaps(taps: number[], beats: number[]): Score {
  if (beats.length === 0) return summarise([]);
  const used = new Set<number>();
  let total = 0;
  for (const tap of taps) {
    let bestI = -1;
    let bestD = Infinity;
    beats.forEach((b, i) => {
      const d = Math.abs(tap - b);
      if (d < bestD && !used.has(i)) {
        bestD = d;
        bestI = i;
      }
    });
    if (bestI >= 0 && bestD < 0.35) {
      used.add(bestI);
      total += clamp01(1 - (bestD - 0.04) / 0.16);
    }
  }
  const timing = total / beats.length;
  // Extra taps cost a little, so mashing doesn't win.
  const extras = Math.max(0, taps.length - beats.length);
  const pct = Math.round(clamp01(timing - extras * 0.05) * 100);
  return { precision: pct, sustain: Math.round((used.size / beats.length) * 100), accuracy: pct, notes: [] };
}

export function grade(accuracy: number): { label: string; tier: 'perfect' | 'great' | 'good' | 'keep-going' } {
  if (accuracy >= 90) return { label: 'Perfect run!', tier: 'perfect' };
  if (accuracy >= 75) return { label: 'Great singing!', tier: 'great' };
  if (accuracy >= 50) return { label: 'Nice work!', tier: 'good' };
  return { label: 'Every note counts!', tier: 'keep-going' };
}
