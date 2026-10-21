import { useMemo } from 'react';
import type { Step } from '../content/curriculum';
import { placeMelody, type ExerciseProps } from './common';
import { MelodyExercise } from './MelodyExercise';

// Singing a second part against a tune. Both parts are placed together so the
// pair fits your voice and keeps its shape; you are graded on your own part.

type HarmonyStep = Extract<Step, { kind: 'harmony' }>;

export function HarmonyExercise({ step, range, onComplete }: ExerciseProps<HarmonyStep>) {
  const { lead, mine } = useMemo(() => {
    const placed = placeMelody([...step.lead, ...step.offsets], range);
    return { lead: placed.slice(0, step.lead.length), mine: placed.slice(step.lead.length) };
  }, [step.lead, step.offsets, range]);
  return (
    <MelodyExercise
      step={{ kind: 'melody', title: step.title, prompt: step.prompt, offsets: step.offsets, beat: step.beat }}
      range={range}
      onComplete={onComplete}
      notesOverride={mine}
      lead={lead}
    />
  );
}
