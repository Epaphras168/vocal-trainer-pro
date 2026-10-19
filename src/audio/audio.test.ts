import { describe, expect, it } from 'vitest';
import { centsFromFolded, classifyVoice, fitToRange, freqToMidi, midiToFreq, midiToName, nameToMidi, readNote } from './notes';
import { scoreBreath, scoreGlide, scoreNotes, scoreTaps, type Sample } from './scoring';

describe('notes', () => {
  it('maps A4 to 440 Hz and back', () => {
    expect(freqToMidi(440)).toBeCloseTo(69);
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToName(57)).toBe('A3');
    expect(nameToMidi('C#4')).toBe(61);
    expect(nameToMidi('Bb2')).toBe(46);
  });

  it('reads cents off the nearest note', () => {
    const r = readNote(midiToFreq(57.2));
    expect(r.name).toBe('A3');
    expect(r.cents).toBe(20);
  });

  it('forgives octave errors', () => {
    expect(centsFromFolded(45, 57)).toBe(0);
    expect(centsFromFolded(57.3, 45)).toBeCloseTo(30);
    expect(centsFromFolded(56.6, 57)).toBeCloseTo(-40);
  });

  it('classifies voices and fits notes into range', () => {
    expect(classifyVoice(nameToMidi('G2'), nameToMidi('G#3'))).toBe('Bass');
    expect(classifyVoice(nameToMidi('C4'), nameToMidi('C6'))).toBe('Soprano');
    expect(fitToRange(72, 48, 64)).toBe(60);
    expect(fitToRange(40, 48, 64)).toBe(52);
  });
});

function sing(from: number, to: number, midi: (t: number) => number | null, rms = 0.05): Sample[] {
  const out: Sample[] = [];
  for (let t = from; t < to; t += 1 / 60) out.push({ t, midi: midi(t), rms });
  return out;
}

describe('scoring', () => {
  const targets = [
    { midi: 60, start: 0, end: 1 },
    { midi: 62, start: 1, end: 2 },
  ];

  it('gives a dead-on singer full marks', () => {
    const s = scoreNotes(sing(0, 2.2, (t) => (t < 1.1 ? 60 : 62)), targets);
    expect(s.precision).toBeGreaterThanOrEqual(98);
    expect(s.accuracy).toBeGreaterThanOrEqual(95);
    expect(s.notes.every((n) => n.hit)).toBe(true);
  });

  it('marks a flat singer down but still counts small misses', () => {
    const s = scoreNotes(sing(0, 2.2, (t) => (t < 1.1 ? 59.6 : 61.6)), targets);
    expect(s.precision).toBeLessThan(80);
    expect(s.precision).toBeGreaterThan(50);
    expect(s.notes.every((n) => n.hit)).toBe(true);
  });

  it('scores silence as zero', () => {
    const s = scoreNotes(sing(0, 2.2, () => null, 0), targets);
    expect(s.accuracy).toBe(0);
  });

  it('rewards steadiness in sustain', () => {
    const steady = scoreNotes(sing(0, 2.2, () => 60), [{ midi: 60, start: 0, end: 2 }]);
    const wobbly = scoreNotes(sing(0, 2.2, (t) => 60 + Math.sin(t * 20) * 0.9), [{ midi: 60, start: 0, end: 2 }]);
    expect(steady.sustain).toBeGreaterThan(wobbly.sustain);
  });

  it('scores glides by coverage', () => {
    const full = scoreGlide(sing(0, 3, (t) => 55 + (t / 3) * 12), 55, 67);
    const half = scoreGlide(sing(0, 3, (t) => 55 + (t / 3) * 6), 55, 67);
    expect(full.accuracy).toBeGreaterThan(90);
    expect(half.accuracy).toBeLessThan(full.accuracy);
  });

  it('measures the longest breath', () => {
    const samples = [...sing(0, 4, () => null, 0.05), ...sing(4, 5, () => null, 0), ...sing(5, 7, () => null, 0.05)];
    const s = scoreBreath(samples, 8);
    expect(s.seconds).toBeGreaterThan(3.9);
    expect(s.seconds).toBeLessThan(4.1);
    expect(s.precision).toBe(50);
  });

  it('judges breath evenness in dB, so a natural soft wobble is fine', () => {
    const level = (f: (t: number) => number): Sample[] => sing(0, 6, () => null, 0).map((x) => ({ ...x, rms: f(x.t) }));
    const steady = scoreBreath(level(() => 0.004), 4, 1e-6);
    const natural = scoreBreath(level((t) => 0.004 * 10 ** ((2.5 * Math.sin(t * 2)) / 20)), 4, 1e-6);
    const erratic = scoreBreath(level((t) => 0.004 * 10 ** ((14 * Math.sin(t * 6)) / 20)), 4, 1e-6);
    expect(steady.sustain).toBe(100);
    expect(natural.sustain).toBeGreaterThanOrEqual(95);
    expect(erratic.sustain).toBeLessThan(40);
  });

  it('counts quiet breath the same as loud breath', () => {
    const at = (rms: number) => scoreBreath(sing(0, 5, () => null, rms), 5, 1e-6);
    expect(at(0.0015).accuracy).toBe(at(0.2).accuracy);
  });

  it('lets a short pause bridge a breath only when the gap allows it', () => {
    const s = [...sing(0, 3, () => null, 0.01), ...sing(3, 3.5, () => null, 0), ...sing(3.5, 7, () => null, 0.01)];
    // Strict: the pause splits it, so only the longer half (3.5 s) counts.
    expect(scoreBreath(s, 7, 0.005).seconds).toBeLessThan(4);
    // Forgiving: the 0.5 s pause is bridged and it counts as one 7 s breath.
    expect(scoreBreath(s, 7, 0.005, 0.9).seconds).toBeGreaterThan(6.5);
  });

  it('scores taps by timing', () => {
    const beats = [0, 1, 2, 3];
    expect(scoreTaps([0.01, 1.02, 1.99, 3.0], beats).accuracy).toBe(100);
    expect(scoreTaps([0.3, 1.3], beats).accuracy).toBeLessThan(20);
  });
});
