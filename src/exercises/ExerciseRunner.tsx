import type { GradedStep } from '../content/curriculum';
import type { Score } from '../audio/scoring';
import { MicGate } from '../components/MicGate';
import type { VoiceRange } from './common';
import { HoldExercise } from './HoldExercise';
import { MelodyExercise } from './MelodyExercise';
import { GlideExercise } from './GlideExercise';
import { BreathExercise } from './BreathExercise';
import { QuizExercise } from './QuizExercise';
import { RhythmExercise } from './RhythmExercise';

export function needsMic(step: GradedStep): boolean {
  if (step.kind === 'quiz') return false;
  if (step.kind === 'rhythm') return !!step.sing;
  return true;
}

interface Props {
  step: GradedStep;
  range: VoiceRange;
  onComplete: (score: Score) => void;
}

export function ExerciseRunner({ step, range, onComplete }: Props) {
  const body = (() => {
    switch (step.kind) {
      case 'hold':
        return <HoldExercise step={step} range={range} onComplete={onComplete} />;
      case 'melody':
        return <MelodyExercise step={step} range={range} onComplete={onComplete} />;
      case 'glide':
        return <GlideExercise step={step} range={range} onComplete={onComplete} />;
      case 'breath':
        return <BreathExercise step={step} range={range} onComplete={onComplete} />;
      case 'quiz':
        return <QuizExercise step={step} range={range} onComplete={onComplete} />;
      case 'rhythm':
        return <RhythmExercise step={step} range={range} onComplete={onComplete} />;
    }
  })();
  return needsMic(step) ? <MicGate>{body}</MicGate> : body;
}
