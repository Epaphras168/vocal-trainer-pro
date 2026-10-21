import { describe, expect, it } from 'vitest';
import { nameToMidi } from '../audio/notes';
import { detectVibrato, noteFor, placeMelody, viewFor } from './common';
import { glideEnds } from './GlideExercise';
import { melodyTargets } from './MelodyExercise';
import { makeQuestions } from './QuizExercise';
import { scoreHold } from './HoldExercise';
import { levelSpec, makeTune } from '../pages/practice/PitchGame';
import { ALL_LESSONS, UNITS, UNIT_ORDER } from '../content/curriculum';
import { INTERVALS } from '../audio/notes';

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

  it('lays the units out in the published order', () => {
    expect(UNITS.map((u) => u.id)).toEqual([...UNIT_ORDER]);
    expect(ALL_LESSONS.length).toBeGreaterThan(60);
  });

  it('keeps the original lesson ids, which saved progress points at', () => {
    for (const id of ['breath-1', 'pitch-3', 'glides-3', 'scales-3', 'ear-3', 'rhythm-3', 'sustain-3', 'range-3'])
      expect(ALL_LESSONS.some((l) => l.id === id)).toBe(true);
  });

  it('has something to sing or answer in every lesson', () => {
    for (const l of ALL_LESSONS) expect(l.steps.some((s) => s.kind !== 'teach' && !(s.kind === 'hold' && s.easy))).toBe(true);
  });

  it('keeps every melody within a span an ordinary voice can place', () => {
    for (const l of ALL_LESSONS)
      for (const s of l.steps) {
        const all = s.kind === 'melody' ? s.offsets : s.kind === 'harmony' ? [...s.lead, ...s.offsets] : [];
        if (all.length) expect(Math.max(...all) - Math.min(...all), `${l.id}: ${s.title}`).toBeLessThanOrEqual(14);
      }
  });

  it('gives lyrics one word per note', () => {
    for (const l of ALL_LESSONS)
      for (const s of l.steps) if (s.kind === 'melody' && s.lyrics) expect(s.lyrics.length, `${l.id}: ${s.title}`).toBe(s.offsets.length);
  });

  it('has harmony parts the same length as the tune', () => {
    for (const l of ALL_LESSONS)
      for (const s of l.steps) if (s.kind === 'harmony') expect(s.offsets.length, `${l.id}: ${s.title}`).toBe(s.lead.length);
  });

  it('only quizzes intervals we have names for', () => {
    for (const l of ALL_LESSONS)
      for (const s of l.steps)
        if (s.kind === 'quiz' && s.intervals) for (const n of s.intervals) expect(INTERVALS.some((i) => i.semitones === n), `${l.id}`).toBe(true);
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

describe('interval and chord quizzes', () => {
  it('asks only the chosen intervals, in either direction, and says which song to think of', () => {
    const qs = makeQuestions('interval', 40, 60, seeded(5), { intervals: [5, 7], descending: true });
    for (const q of qs) {
      expect([5, 7]).toContain(Math.abs(q.b - q.a));
      expect(q.answer).toBe(String(Math.abs(q.b - q.a)));
      expect(q.hint).toMatch(/Rising|Falling/);
      expect((q.b < q.a ? 'Falling' : 'Rising')).toBe(q.hint?.split(':')[0]);
    }
    expect(qs.some((q) => q.b < q.a)).toBe(true);
    expect(qs.some((q) => q.b > q.a)).toBe(true);
  });

  it('keeps going up when descending is not asked for', () => {
    for (const q of makeQuestions('interval', 20, 60, seeded(9), { intervals: [3, 4] })) expect(q.b).toBeGreaterThan(q.a);
  });

  it('builds major and minor triads', () => {
    for (const q of makeQuestions('chord-quality', 20, 60, seeded(2))) {
      expect(q.c! - q.a).toBe(7);
      expect(q.b - q.a).toBe(q.answer === 'major' ? 4 : 3);
    }
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
