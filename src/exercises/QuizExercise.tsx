import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Equal, Shuffle, Volume2 } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { homeNote } from '../audio/notes';
import { playSequence, sfx } from '../audio/synth';
import { Mascot, type Mood } from '../components/Mascot';
import type { ExerciseProps } from './common';
import './QuizExercise.css';

// Ear training: hear two notes, answer a question about them. No mic needed.

type QuizStep = Extract<Step, { kind: 'quiz' }>;

interface Question {
  a: number;
  b: number;
  answer: string;
}

interface Option {
  id: string;
  label: string;
  icon?: typeof ArrowUp;
}

const INTERVALS: [string, number][] = [
  ['Step', 2],
  ['Third', 4],
  ['Fifth', 7],
  ['Octave', 12],
];

function optionsFor(mode: QuizStep['mode']): Option[] {
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
  return INTERVALS.map(([label]) => ({ id: label.toLowerCase(), label }));
}

export function makeQuestions(mode: QuizStep['mode'], count: number, home: number, rand = Math.random): Question[] {
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
    const [label, size] = pick(INTERVALS);
    const base = size === 12 ? a - 5 : a - 2;
    return { a: base, b: base + size, answer: label.toLowerCase() };
  });
}

export function QuizExercise({ step, range, onComplete }: ExerciseProps<QuizStep>) {
  const questions = useMemo(() => {
    // Very low piano notes get muddy, so lift deep voices an octave for listening.
    const home = homeNote(range.low, range.high);
    return makeQuestions(step.mode, step.count, home < 55 ? home + 12 : home);
  }, [step, range]);
  const options = useMemo(() => optionsFor(step.mode), [step.mode]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [playing, setPlaying] = useState(false);
  const q = questions[i];

  const play = async () => {
    setPlaying(true);
    await playSequence(
      [
        { midi: q.a, dur: 0.7, gap: 0.25 },
        { midi: q.b, dur: 0.9 },
      ],
      'piano',
    );
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
    }, right ? 750 : 1400);
  };

  const right = picked !== null && picked === q.answer;
  const mood: Mood = picked === null ? (playing ? 'listen' : 'idle') : right ? 'cheer' : 'encourage';
  const message =
    picked === null
      ? step.prompt
      : right
        ? 'Spot on! Great ears.'
        : `Close! It was ${options.find((o) => o.id === q.answer)?.label.toLowerCase()}. Listen again next time.`;

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
