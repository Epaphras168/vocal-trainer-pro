// Pitch <-> note math. MIDI numbers are the lingua franca: 60 = C4, 69 = A4 = 440 Hz.

export const A4_HZ = 440;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function freqToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / A4_HZ);
}

export function midiToFreq(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

/** Name for an integer MIDI note, e.g. 57 -> "A3". */
export function midiToName(midi: number): string {
  const m = Math.round(midi);
  return `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/** Pitch class only, e.g. 57 -> "A". */
export function midiToPitchClass(midi: number): string {
  const m = Math.round(midi);
  return NAMES[((m % 12) + 12) % 12];
}

export function isBlackKey(midi: number): boolean {
  return NAMES[((Math.round(midi) % 12) + 12) % 12].includes('#');
}

/** Parse "A3", "C#4", "Bb2" into a MIDI number. */
export function nameToMidi(name: string): number {
  const match = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!match) throw new Error(`Bad note name: ${name}`);
  const base = NAMES.indexOf(match[1].toUpperCase() as (typeof NAMES)[number]);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return (Number(match[3]) + 1) * 12 + base + accidental;
}

export interface NoteReading {
  /** Fractional MIDI value of the sung pitch. */
  midi: number;
  /** Nearest whole note. */
  nearest: number;
  name: string;
  /** -50..+50 cents from the nearest note. */
  cents: number;
}

export function readNote(hz: number): NoteReading {
  const midi = freqToMidi(hz);
  const nearest = Math.round(midi);
  return { midi, nearest, name: midiToName(nearest), cents: Math.round((midi - nearest) * 100) };
}

/** Signed cents distance from a sung (fractional) MIDI value to a target note. */
export function centsFrom(sungMidi: number, targetMidi: number): number {
  return (sungMidi - targetMidi) * 100;
}

/**
 * Cents from target with octave errors forgiven: singing A2 against an A3
 * target counts as being on the note. Result is in -600..+600.
 */
export function centsFromFolded(sungMidi: number, targetMidi: number): number {
  let d = (sungMidi - targetMidi) % 12;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  return d * 100 + 0; // + 0 normalises -0
}

export function octavesBetween(lowMidi: number, highMidi: number): number {
  return Math.max(0, (highMidi - lowMidi) / 12);
}

export type VoiceType = 'Bass' | 'Baritone' | 'Tenor' | 'Alto' | 'Mezzo-soprano' | 'Soprano';

interface VoiceRef {
  type: VoiceType;
  low: number;
  high: number;
}

// Typical comfortable ranges, used to name a voice and to compare with reference singers.
export const VOICE_TYPES: VoiceRef[] = [
  { type: 'Bass', low: nameToMidi('E2'), high: nameToMidi('E4') },
  { type: 'Baritone', low: nameToMidi('A2'), high: nameToMidi('A4') },
  { type: 'Tenor', low: nameToMidi('C3'), high: nameToMidi('C5') },
  { type: 'Alto', low: nameToMidi('F3'), high: nameToMidi('F5') },
  { type: 'Mezzo-soprano', low: nameToMidi('A3'), high: nameToMidi('A5') },
  { type: 'Soprano', low: nameToMidi('C4'), high: nameToMidi('C6') },
];

/** Pick the voice type whose typical range best overlaps the measured one. */
export function classifyVoice(low: number, high: number): VoiceType {
  const center = (low + high) / 2;
  let best = VOICE_TYPES[0];
  let bestScore = -Infinity;
  for (const v of VOICE_TYPES) {
    const overlap = Math.min(high, v.high) - Math.max(low, v.low);
    const centerGap = Math.abs(center - (v.low + v.high) / 2);
    const score = overlap - centerGap * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best.type;
}

export const REFERENCE_SINGERS: { name: string; low: number; high: number }[] = [
  { name: 'Freddie Mercury', low: nameToMidi('F2'), high: nameToMidi('F5') },
  { name: 'Adele', low: nameToMidi('C3'), high: nameToMidi('F5') },
  { name: 'Ed Sheeran', low: nameToMidi('A2'), high: nameToMidi('C5') },
  { name: 'Ariana Grande', low: nameToMidi('D3'), high: nameToMidi('E7') },
  { name: 'Johnny Cash', low: nameToMidi('E2'), high: nameToMidi('G4') },
  { name: 'Beyoncé', low: nameToMidi('A2'), high: nameToMidi('E6') },
  { name: 'Bruno Mars', low: nameToMidi('C3'), high: nameToMidi('C6') },
];

/**
 * A comfortable "home" note for a singer: a bit below the middle of their
 * range, where exercises feel easy.
 */
export function homeNote(low: number, high: number): number {
  return Math.round(low + (high - low) * 0.4);
}

/** Clamp a note into a singer's range, moving by octaves first so the pitch class survives. */
export function fitToRange(midi: number, low: number, high: number): number {
  let m = midi;
  while (m < low && m + 12 <= high + 1) m += 12;
  while (m > high && m - 12 >= low - 1) m -= 12;
  return Math.min(Math.max(m, low), high);
}
