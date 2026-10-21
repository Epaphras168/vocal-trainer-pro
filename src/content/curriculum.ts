export * from './types';
import { CORE_UNITS } from './core';
import { EXPANSION } from './expansion';
import type { Lesson, Unit } from './types';

// The singing path, in the order a singer walks it. Pitches are written as
// semitone offsets from the singer's "home" note, so every lesson is pitched
// for their voice automatically (see src/exercises/common.ts).
//
// core.ts holds the original units; expansion.ts holds the units and lessons
// built from the worship-team technique guide (see docs/CURRICULUM.md).

const byId = new Map<string, Unit>([...CORE_UNITS, ...EXPANSION.units].map((u) => [u.id, u]));

function withExtra(id: string): Unit {
  const unit = byId.get(id);
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  const extra: Lesson[] = EXPANSION.extra[id] ?? [];
  return extra.length ? { ...unit, lessons: [...unit.lessons, ...extra] } : unit;
}

export const UNIT_ORDER = [
  'breath',
  'diction',
  'pitch',
  'glides',
  'scales',
  'ear',
  'intervals',
  'rhythm',
  'sustain',
  'range',
  'registers',
  'power',
  'runs',
  'harmony',
  'adlib',
] as const;

export const UNITS: Unit[] = UNIT_ORDER.map(withExtra);

export const ALL_LESSONS: Lesson[] = UNITS.flatMap((u) => u.lessons);

export function findLesson(id: string): { unit: Unit; lesson: Lesson; index: number } | null {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return null;
}
