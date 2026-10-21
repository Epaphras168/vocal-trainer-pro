// The singing path. Pitches are written as semitone offsets from the
// singer's "home" note (a comfy spot a little below the middle of their
// range), so every lesson is automatically pitched for their voice.

export type Demo =
  | { type: 'note'; offset: number; dur?: number; voice?: boolean }
  | { type: 'melody'; offsets: number[]; beat: number }
  | { type: 'glide'; from: number; to: number; dur: number };

export type Step =
  | {
      kind: 'teach';
      title: string;
      body: string;
      tip?: string;
      demo?: Demo;
      /** Things to try or check in the mirror. Ticking is for you: the mic can't see posture. */
      checklist?: string[];
      /** Adds a line worked out from the singer's own measured range. */
      personal?: 'zones' | 'tessitura';
    }
  | {
      kind: 'hold';
      title: string;
      prompt: string;
      offset: number;
      seconds: number;
      /** Cents counted as "on the note" while holding. */
      tolerance?: number;
      vibrato?: boolean;
      easy?: boolean;
    }
  | {
      kind: 'melody';
      title: string;
      prompt: string;
      offsets: number[];
      beat: number;
      /** A word or syllable for each note, shown under the notes. */
      lyrics?: string[];
    }
  | {
      kind: 'harmony';
      title: string;
      prompt: string;
      /** The tune you hear (offsets from home). */
      lead: number[];
      /** What you sing against it. */
      offsets: number[];
      beat: number;
    }
  | { kind: 'swell'; title: string; prompt: string; offset: number; seconds: number }
  | {
      kind: 'improv';
      title: string;
      prompt: string;
      scale: 'majorPentatonic' | 'minorPentatonic' | 'major' | 'blues';
      seconds: number;
      /** Different notes of the key needed for a full score. */
      wantDistinct?: number;
      /** Hold a drone under the singer (headphones). */
      drone?: boolean;
    }
  | { kind: 'glide'; title: string; prompt: string; from: number; to: number; seconds: number }
  | { kind: 'breath'; title: string; prompt: string; goal: number; sound: 'hiss' | 'hum' }
  | {
      kind: 'quiz';
      title: string;
      prompt: string;
      mode: 'higher-lower' | 'same-different' | 'interval' | 'chord-quality';
      count: number;
      /** For interval quizzes: which sizes (in semitones) can come up. */
      intervals?: number[];
      /** Interval questions may also fall, not just rise. */
      descending?: boolean;
    }
  | { kind: 'rhythm'; title: string; prompt: string; bpm: number; pattern: number[]; sing?: boolean };

export type GradedStep = Exclude<Step, { kind: 'teach' }>;

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  steps: Step[];
}

export type UnitIcon =
  | 'Wind'
  | 'Target'
  | 'Waves'
  | 'ListMusic'
  | 'Ear'
  | 'Drum'
  | 'AudioLines'
  | 'Mountain'
  | 'Smile'
  | 'ArrowUpDown'
  | 'Zap'
  | 'Layers'
  | 'Gauge'
  | 'Users'
  | 'Sparkles';

export interface Unit {
  id: string;
  title: string;
  tagline: string;
  icon: UnitIcon;
  lessons: Lesson[];
}

export const FINISHER: Step = {
  kind: 'hold',
  title: 'Victory lap',
  prompt: 'One easy, comfy note to finish. Just enjoy it.',
  offset: 0,
  seconds: 2,
  tolerance: 80,
  easy: true,
};

export function lesson(id: string, title: string, minutes: number, steps: Step[]): Lesson {
  const last = steps[steps.length - 1];
  // Lessons always end on something easy so you leave feeling good.
  const endsEasy = last.kind === 'hold' && last.easy;
  return { id, title, minutes, steps: endsEasy ? steps : [...steps, FINISHER] };
}

