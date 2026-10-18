import { describe, expect, it } from 'vitest';
import { nameToMidi } from '../audio/notes';
import { detectVibrato, noteFor, placeMelody, viewFor } from './common';
import { glideEnds } from './GlideExercise';
import { melodyTargets } from './MelodyExercise';
import { makeQuestions } from './QuizExercise';
import { scoreHold } from './HoldExercise';
import { levelSpec, makeTune } from '../pages/practice/PitchGame';
import { UNITS } from '../content/curriculum';

const bass = { low: nameToMidi('G2'), high: nameToMidi('E4') };
const soprano = { low: nameToMidi('C4'), high: nameToMidi('C6') };

function seeded(seed = 7) {
  let a = seed;
  return () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648);
}

describe('pitching exercises for a voice', () => {
  it('keeps single notes inside the range', () => {
    for (const r of [bass, soprano]) {
      for (const off of [-12, -5, 0, 7, 14]) {
        const m = noteFor(off, r);
        expect(m).toBeGreaterThanOrEqual(r.low);
        expect(m).toBeLessThanOrEqual(r.high);
      }
    }
  });

  it('shifts whole melodies to fit while keeping their shape', () => {
    const notes = placeMelody([0, 2, 4, 5, 7, 9, 11, 12], bass);
    expect(notes[notes.length - 1] - notes[0]).toBe(12);
    expect(Math.max(...notes)).toBeLessThanOrEqual(bass.high);
    expect(Math.min(...notes)).toBeGreaterThanOrEqual(bass.low);
  });

  it('keeps glide direction even when clamped', () => {
    const narrow = { low: 50, high: 54 };
    const [a, b] = glideEnds(7, 0, narrow);
    expect(a).toBeGreaterThan(b);
    const [c, d] = glideEnds(0, 12, bass);
    expect(d).toBeGreaterThan(c);
  });

  it('builds a padded view around notes', () => {
    const v = viewFor([57, 59]);
    expect(v.low).toBeLessThan(57);
    expect(v.high).toBeGreaterThan(59);
  });

  it('lays melody targets back to back with a breath gap', () => {
    const t = melodyTargets([57, 59], 1);
    expect(t[0]).toMatchObject({ midi: 57, start: 0 });
    expect(t[1].start).toBe(1);
    expect(t[0].end).toBeLessThan(1);
  });
});

describe('content', () => {
  it('ends every lesson on an easy, confidence-building step', () => {
    for (const u of UNITS)
      for (const l of u.lessons) {
        const last = l.steps[l.steps.length - 1];
        expect(last.kind === 'hold' && last.easy).toBe(true);
      }
  });

  it('has unique lesson ids', () => {
    const ids = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ear quiz', () => {
  it('generates answerable questions', () => {
    const qs = makeQuestions('higher-lower', 20, 60, seeded());
    for (const q of qs) expect(q.answer === 'higher' ? q.b > q.a : q.b < q.a).toBe(true);
    const iv = makeQuestions('interval', 20, 60, seeded(3));
    for (const q of iv) expect({ step: 2, third: 4, fifth: 7, octave: 12 }[q.answer]).toBe(q.b - q.a);
  });
});

describe('echo game', () => {
  it('gets harder as levels rise', () => {
    expect(levelSpec(1).length).toBeLessThan(levelSpec(9).length);
    expect(levelSpec(1).beat).toBeGreaterThan(levelSpec(9).beat);
  });

  it('makes singable tunes', () => {
    const tune = makeTune(10, seeded(11));
    expect(tune[0]).toBe(0);
    expect(Math.max(...tune)).toBeLessThanOrEqual(7);
    expect(Math.min(...tune)).toBeGreaterThanOrEqual(-5);
  });
});

describe('hold and vibrato', () => {
  const sing = (fn: (t: number) => number | null, secs = 3) =>
    Array.from({ length: Math.round(secs * 60) }, (_, i) => ({ t: i / 60, midi: fn(i / 60), rms: 0.05 }));

  it('grades from the first sung frame, ignoring a late start', () => {
    const late = sing((t) => (t < 1.5 ? null : 57), 4);
    expect(scoreHold(late, 57).accuracy).toBeGreaterThan(90);
  });

  it('spots a real vibrato but not a straight tone', () => {
    expect(detectVibrato(sing((t) => 57 + 0.3 * Math.sin(2 * Math.PI * 5.5 * t))).present).toBe(true);
    expect(detectVibrato(sing(() => 57)).present).toBe(false);
  });
});
