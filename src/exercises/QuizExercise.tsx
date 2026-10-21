import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Equal, Shuffle, Volume2 } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { homeNote, intervalBySize } from '../audio/notes';
import { playLines, playSequence, sfx } from '../audio/synth';
import { Mascot, type Mood } from '../components/Mascot';
import type { ExerciseProps } from './common';
import './QuizExercise.css';

// Ear training: hear two notes, answer a question about them. No mic needed.

type QuizStep = Extract<Step, { kind: 'quiz' }>;

interface Question {
  a: number;
  b: number;
  answer: string;
  /** A third note, for chord questions. */
  c?: number;
  /** Shown after answering: a song that starts with this interval. */
  hint?: string;
}

interface QuestionOptions {
  intervals?: number[];
  descending?: boolean;
}

interface Option {
  id: string;
  label: string;
  icon?: typeof ArrowUp;
}

const LEGACY_INTERVALS: [string, number][] = [
  ['Step', 2],
  ['Third', 4],
  ['Fifth', 7],
  ['Octave', 12],
];

function optionsFor(mode: QuizStep['mode'], intervals?: number[]): Option[] {
  if (mode === 'chord-quality')
    return [
      { id: 'major', label: 'Major (bright)' },
      { id: 'minor', label: 'Minor (dark)' },
    ];
  if (mode === 'interval' && intervals)
    return intervals.map((n) => ({ id: String(n), label: intervalBySize(n)?.name ?? `${n} semitones` }));
  if (mode === 'higher-lower')
    return [
      { id: 'higher', label: 'Higher', icon: ArrowUp },
      { id: 'lower', label: 'Lower', icon: ArrowDown },
    ];
  if (mode === 'same-different')
    return [
      { id: 'same', label: 'Same', icon: Equal },
      { id: 'different', label: 'Different', icon: Shuffle },
    ];
  return LEGACY_INTERVALS.map(([label]) => ({ id: label.toLowerCase(), label }));
}

export function makeQuestions(mode: QuizStep['mode'], count: number, home: number, rand = Math.random, opts: QuestionOptions = {}): Question[] {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  return Array.from({ length: count }, () => {
    const a = home + Math.floor(rand() * 7) - 3;
    if (mode === 'higher-lower') {
      const size = 1 + Math.floor(rand() * 6);
      const up = rand() < 0.5;
      return { a, b: a + (up ? size : -size), answer: up ? 'higher' : 'lower' };
    }
    if (mode === 'same-different') {
      const same = rand() < 0.45;
      return { a, b: same ? a : a + pick([-2, -1, 1, 2]), answer: same ? 'same' : 'different' };
    }
    if (mode === 'chord-quality') {
      const major = rand() < 0.5;
      return { a, b: a + (major ? 4 : 3), c: a + 7, answer: major ? 'major' : 'minor' };
    }
    if (opts.intervals) {
      const size = pick(opts.intervals);
      const down = !!opts.descending && rand() < 0.5;
      const info = intervalBySize(size);
      const song = down ? info?.down : info?.up;
      const base = a - 2;
      const [x, y] = down ? [base + size, base] : [base, base + size];
      return { a: x, b: y, answer: String(size), hint: song ? `${down ? 'Falling' : 'Rising'}: "${song}"` : undefined };
    }
    const [label, size] = pick(LEGACY_INTERVALS);
    const base = size === 12 ? a - 5 : a - 2;
    return { a: base, b: base + size, answer: label.toLowerCase() };
  });
}

export function QuizExercise({ step, range, onComplete }: ExerciseProps<QuizStep>) {
  const questions = useMemo(() => {
    // Very low piano notes get muddy, so lift deep voices an octave for listening.
    const home = homeNote(range.low, range.high);
    return makeQuestions(step.mode, step.count, home < 55 ? home + 12 : home, Math.random, { intervals: step.intervals, descending: step.descending });
  }, [step, range]);
  const options = useMemo(() => optionsFor(step.mode, step.intervals), [step.mode, step.intervals]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [playing, setPlaying] = useState(false);
  const q = questions[i];

  const play = async () => {
    setPlaying(true);
    if (q.c !== undefined) {
      // A chord: climb through it, then sound it all together.
      await playSequence(
        [q.a, q.b, q.c].map((midi) => ({ midi, dur: 0.45, gap: 0.05 })),
        'piano',
      );
      await playLines([q.a, q.b, q.c].map((midi) => ({ notes: [{ midi, dur: 1.2 }] })));
    } else {
      await playSequence(
        [
          { midi: q.a, dur: 0.7, gap: 0.25 },
          { midi: q.b, dur: 0.9 },
        ],
        'piano',
      );
    }
    setPlaying(false);
  };

  useEffect(() => {
    const t = setTimeout(play, 350);
    return () => clearTimeout(t);
  }, [i]);

  const answer = (id: string) => {
    if (picked) return;
    setPicked(id);
    const right = id === q.answer;
    const nextCorrect = correct + (right ? 1 : 0);
    if (right) setCorrect(nextCorrect);
    sfx(right ? 'pop' : 'soft');
    setTimeout(() => {
      if (i + 1 >= questions.length) {
        const pct = Math.round((nextCorrect / questions.length) * 100);
        sfx('success');
        onComplete({ precision: pct, sustain: pct, accuracy: pct, notes: [] });
      } else {
        setPicked(null);
        setI(i + 1);
      }
    }, (right ? 750 : 1400) + (q.hint ? 1100 : 0));
  };

  const right = picked !== null && picked === q.answer;
  const mood: Mood = picked === null ? (playing ? 'listen' : 'idle') : right ? 'cheer' : 'encourage';
  const answerLabel = options.find((o) => o.id === q.answer)?.label;
  const message =
    picked === null
      ? step.prompt
      : right
        ? `Spot on! Great ears.${q.hint ? ` ${q.hint}` : ''}`
        : `Close! It was ${answerLabel?.toLowerCase()}.${q.hint ? ` ${q.hint}` : ' Listen again next time.'}`;

  return (
    <div className="quiz">
      <div className="quiz__dots" aria-label={`Question ${i + 1} of ${questions.length}`}>
        {questions.map((_, k) => (
          <span key={k} data-state={k < i ? 'done' : k === i ? 'now' : ''} />
        ))}
      </div>
      <div className="quiz__hero">
        <Mascot mood={mood} size={140} />
        <p className="quiz__msg" aria-live="polite">
          {message}
        </p>
        <button className="btn btn--gold" onClick={play} disabled={playing}>
          <Volume2 size={18} /> {playing ? 'Playing...' : 'Play again'}
        </button>
      </div>
      <div className={`quiz__options quiz__options--${options.length}`}>
        {options.map((o) => {
          const state = picked === null ? '' : o.id === q.answer ? 'right' : o.id === picked ? 'wrong' : 'dim';
          const Icon = o.icon;
          return (
            <button key={o.id} className="choice quiz__option" data-state={state} onClick={() => answer(o.id)}>
              {Icon && <Icon size={22} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
