import { describe, expect, it } from 'vitest';
import { centsFromFolded, classifyVoice, fitToRange, freqToMidi, intervalBySize, midiToFreq, midiToName, nameToMidi, readNote, registerZones, scaleNotes, SCALES, tessitura } from './notes';
import { scoreBreath, scoreGlide, scoreImprov, scoreNotes, scoreSwell, scoreTaps, type Sample } from './scoring';

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

describe('scales, intervals and zones', () => {
  it('lists the notes of a key across a window', () => {
    // C major pentatonic from C4..C5
    expect(scaleNotes(60, SCALES.majorPentatonic, 60, 72)).toEqual([60, 62, 64, 67, 69, 72]);
  });

  it('has a reference tune for each interval', () => {
    expect(intervalBySize(7)?.name).toBe('Perfect 5th');
    expect(intervalBySize(7)?.up).toMatch(/Twinkle/);
  });

  it('splits a range into thirds and finds the comfy middle', () => {
    const z = registerZones(48, 72);
    expect(z.chest).toEqual([48, 56]);
    expect(z.mix).toEqual([56, 64]);
    expect(z.head).toEqual([64, 72]);
    expect(tessitura(48, 72)).toEqual([54, 66]);
  });
});

const voiced = (from: number, to: number, midi: (t: number) => number | null, db: (t: number) => number): Sample[] => {
  const out: Sample[] = [];
  for (let t = from; t < to; t += 1 / 60) out.push({ t, midi: midi(t), rms: 10 ** (db(t) / 20) });
  return out;
};

describe('swell (dynamics)', () => {
  const tri = (peakDb: number, span: number) => (t: number) => -40 + peakDb * (1 - Math.abs(t - span / 2) / (span / 2));
  it('rewards a steady note that grows then fades', () => {
    const s = scoreSwell(voiced(0, 6, () => 60, tri(14, 6)), 60, 6);
    expect(s.sustain).toBeGreaterThan(85);
    expect(s.accuracy).toBeGreaterThan(80);
  });
  it('does not reward a flat-volume note', () => {
    const s = scoreSwell(voiced(0, 6, () => 60, () => -30), 60, 6);
    expect(s.sustain).toBeLessThan(15);
  });
  it('does not care how loud the room or mic is', () => {
    const quiet = scoreSwell(voiced(0, 6, () => 60, (t) => tri(14, 6)(t) - 25), 60, 6);
    const loud = scoreSwell(voiced(0, 6, () => 60, tri(14, 6)), 60, 6);
    expect(quiet.sustain).toBe(loud.sustain);
  });
  it('wants the pitch to stay put', () => {
    const s = scoreSwell(voiced(0, 6, (t) => 60 + (t > 3 ? 3 : 0), tri(14, 6)), 60, 6);
    expect(s.accuracy).toBeLessThan(75);
  });
  it('wants a rise-and-fall, not just a rise', () => {
    const s = scoreSwell(voiced(0, 6, () => 60, (t) => -40 + t * 3), 60, 6);
    expect(s.sustain).toBeLessThan(55);
  });
});

describe('ad-lib scoring', () => {
  const key = [60, 62, 64, 67, 69];
  const line = (notes: number[], each = 0.5): Sample[] => notes.flatMap((m, i) => voiced(i * each, (i + 1) * each, () => m, () => -20));
  it('rewards moving around inside the key', () => {
    const s = scoreImprov(line([60, 64, 67, 64, 69, 62, 60, 67, 69, 64, 62, 60]), key, { seconds: 6 });
    expect(s.inKey).toBeGreaterThan(0.95);
    expect(s.distinct).toBeGreaterThanOrEqual(5);
    expect(s.accuracy).toBeGreaterThan(85);
  });
  it('does not reward droning on one note', () => {
    const s = scoreImprov(line([60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]), key, { seconds: 6 });
    expect(s.distinct).toBe(1);
    expect(s.accuracy).toBeLessThan(55);
  });
  it('marks down notes outside the key', () => {
    const s = scoreImprov(line([61, 63, 66, 68, 70, 61, 63, 66, 68, 70, 61, 63]), key, { seconds: 6 });
    expect(s.inKey).toBeLessThan(0.1);
    expect(s.accuracy).toBeLessThan(35);
  });
  it('scores silence as zero', () => {
    expect(scoreImprov(voiced(0, 6, () => null, () => -60), key, { seconds: 6 }).accuracy).toBe(0);
  });
});
