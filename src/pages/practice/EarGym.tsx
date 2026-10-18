import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Equal, Music4, Play } from 'lucide-react';
import type { Score } from '../../audio/scoring';
import { QuizExercise } from '../../exercises/QuizExercise';
import { Results } from '../../components/Results';
import { effectiveRange, useGame, type Reward } from '../../game/store';
import { DrillFrame } from './DrillFrame';

const MODES = [
  { mode: 'higher-lower' as const, label: 'Higher or lower', icon: ArrowUpDown, prompt: 'Is the second note higher or lower?' },
  { mode: 'same-different' as const, label: 'Same or different', icon: Equal, prompt: 'Are the two notes the same?' },
  { mode: 'interval' as const, label: 'Name the jump', icon: Music4, prompt: 'How big was the jump?' },
];

export function EarGym() {
  const nav = useNavigate();
  const range = effectiveRange(useGame());
  const record = useGame((s) => s.recordActivity);
  const [pick, setPick] = useState(MODES[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: Score; reward: Reward } | null>(null);

  if (result) {
    return (
      <Results
        title={`Ear gym · ${pick.label}`}
        accuracy={result.score.accuracy}
        precision={result.score.precision}
        sustain={result.score.sustain}
        hideSubs
        reward={result.reward}
        onContinue={() => nav('/practice')}
      >
        <button className="btn btn--ghost btn--block" onClick={() => (setResult(null), setRunning(true))}>
          Another round
        </button>
      </Results>
    );
  }

  return (
    <DrillFrame eyebrow="Ear gym" title={running ? pick.label : 'Train your ears'}>
      {!running ? (
        <div className="drill__setup">
          <p className="dim">Eight quick questions. No mic needed, just good headphones or speakers.</p>
          <div className="onb__choices">
            {MODES.map((m) => (
              <button key={m.mode} className="choice" aria-pressed={pick.mode === m.mode} onClick={() => setPick(m)}>
                <span className="tile-icon tile-icon--violet">
                  <m.icon size={22} />
                </span>
                <strong>{m.label}</strong>
              </button>
            ))}
          </div>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => setRunning(true)}>
            <Play size={20} /> Start
          </button>
        </div>
      ) : (
        <QuizExercise
          step={{ kind: 'quiz', title: pick.label, prompt: pick.prompt, mode: pick.mode, count: 8 }}
          range={range}
          onComplete={(score) => {
            const reward = record({ kind: 'ear', label: `Ear gym · ${pick.label}`, accuracy: score.accuracy, precision: score.precision, sustain: score.sustain });
            setRunning(false);
            setResult({ score, reward });
          }}
        />
      )}
    </DrillFrame>
  );
}
