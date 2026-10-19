import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { GradedStep } from '../../content/curriculum';
import type { Score } from '../../audio/scoring';
import { sfx } from '../../audio/synth';
import { ExerciseRunner } from '../../exercises/ExerciseRunner';
import { Results } from '../../components/Results';
import { effectiveRange, useGame, type Reward } from '../../game/store';
import { DrillFrame } from './DrillFrame';

// A two-minute guided routine. No grading pauses between moves: each one
// flows into the next so it feels like a real warm-up.

const ROUTINE: GradedStep[] = [
  { kind: 'breath', title: 'Wake up the breath', prompt: "Low breath in, then a long, soft 'sssss'.", goal: 8, sound: 'hiss' },
  { kind: 'glide', title: 'Siren up', prompt: "Lip trill or 'ooo', sliding up.", from: -3, to: 7, seconds: 4 },
  { kind: 'glide', title: 'Siren down', prompt: 'And float back down.', from: 7, to: -3, seconds: 4 },
  { kind: 'hold', title: 'Easy hum', prompt: "Lips closed, a gentle 'mmm' on the line.", offset: 0, seconds: 3, tolerance: 70 },
  { kind: 'melody', title: 'Five-note scale', prompt: "On 'ah', up and down.", offsets: [0, 2, 4, 5, 7, 5, 4, 2, 0], beat: 0.6 },
];

export function Warmup() {
  const nav = useNavigate();
  const range = effectiveRange(useGame());
  const record = useGame((s) => s.recordActivity);
  const [i, setI] = useState(0);
  const [scores, setScores] = useState<Score[]>([]);
  const [between, setBetween] = useState(false);
  const [result, setResult] = useState<{ reward: Reward; acc: number; prec: number; sus: number } | null>(null);

  const onScore = (score: Score) => {
    const all = [...scores, score];
    setScores(all);
    if (i + 1 >= ROUTINE.length) {
      const avg = (k: 'accuracy' | 'precision' | 'sustain') => Math.round(all.reduce((a, s) => a + s[k], 0) / all.length);
      const reward = record({ kind: 'warmup', label: 'Daily warm-up', accuracy: avg('accuracy'), precision: avg('precision'), sustain: avg('sustain') });
      setResult({ reward, acc: avg('accuracy'), prec: avg('precision'), sus: avg('sustain') });
      return;
    }
    sfx('pop');
    setBetween(true);
    setTimeout(() => {
      setBetween(false);
      setI(i + 1);
    }, 1100);
  };

  if (result) {
    return <Results title="Daily warm-up" accuracy={result.acc} precision={result.prec} sustain={result.sus} reward={result.reward} onContinue={() => nav('/home')} />;
  }

  const step = ROUTINE[i];
  return (
    <DrillFrame
      eyebrow={`Warm-up · ${i + 1} of ${ROUTINE.length}`}
      title={step.title}
      aside={
        <div className="quiz__dots" aria-hidden="true">
          {ROUTINE.map((_, k) => (
            <span key={k} data-state={k < i ? 'done' : k === i ? 'now' : ''} />
          ))}
        </div>
      }
    >
      <p className="dim" style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: -12 }}>
        {step.prompt}
      </p>
      <AnimatePresence mode="wait">
        {between ? (
          <motion.div key="between" className="roll__banner" style={{ alignSelf: 'center' }} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            Nice! Next up: {ROUTINE[i + 1].title}
          </motion.div>
        ) : (
          <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <ExerciseRunner step={step} range={range} onComplete={onScore} />
          </motion.div>
        )}
      </AnimatePresence>
    </DrillFrame>
  );
}
