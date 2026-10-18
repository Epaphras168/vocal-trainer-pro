import { useEffect, useRef, useState } from 'react';
import { RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { scoreBreath, type Sample } from '../audio/scoring';
import { sfx } from '../audio/synth';
import { sleep, type ExerciseProps } from './common';
import { CoachCard } from './Stage';
import './BreathExercise.css';

// Breath work doesn't need a pitch: a hiss is just steady noise. We measure how
// long and how evenly the sound lasts, against the room's own noise floor.

type BreathStep = Extract<Step, { kind: 'breath' }>;
type Phase = 'inhale' | 'go' | 'done';

export function BreathExercise({ step, onComplete }: ExerciseProps<BreathStep>) {
  const [phase, setPhase] = useState<Phase>('inhale');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setSeconds(0);
    setLevel(0);

    // Inhale: also a quiet moment to measure the room.
    setPhase('inhale');
    const floor: number[] = [];
    const offFloor = pitchEngine.onFrame((f) => floor.push(f.rms));
    await sleep(3200);
    offFloor();
    if (!alive()) return;
    const sorted = [...floor].sort((a, b) => a - b);
    const noise = sorted[Math.floor(sorted.length * 0.5)] ?? 0.002;
    // Cap it: if the singer starts early (or the room is loud) we must still hear a normal hiss.
    const threshold = Math.min(0.02, Math.max(0.006, noise * 2.6));

    setPhase('go');
    const samples: Sample[] = [];
    const start = pitchEngine.now();
    let started: number | null = null;
    let quietSince: number | null = null;
    await new Promise<void>((resolve) => {
      let lastUi = 0;
      const off = pitchEngine.onFrame((f) => {
        if (!alive()) {
          off();
          resolve();
          return;
        }
        const t = f.t - start;
        samples.push({ t, midi: f.midi, rms: f.rms });
        const loud = f.rms >= threshold;
        if (loud) {
          started ??= t;
          quietSince = null;
        } else if (started !== null) {
          quietSince ??= t;
        }
        if (t - lastUi > 0.08) {
          lastUi = t;
          setLevel(Math.min(1, f.rms / (threshold * 6)));
          if (started !== null && quietSince === null) setSeconds(t - started);
        }
        const ranOut = started !== null && quietSince !== null && t - quietSince > 0.7;
        const gaveUp = started === null && t > 12;
        const plenty = started !== null && t - started > step.goal * 1.6;
        if (ranOut || gaveUp || plenty) {
          off();
          resolve();
        }
      });
    });
    if (!alive()) return;
    setPhase('done');
    const score = scoreBreath(samples, step.goal, threshold);
    sfx(score.seconds >= step.goal ? 'success' : 'soft');
    onComplete(score);
  };

  useEffect(() => {
    void go();
    return () => {
      run.current++;
    };
  }, [attempt]);

  const fill = Math.min(1, seconds / step.goal);
  const sound = step.sound === 'hiss' ? "'ssssss'" : "'mmmmm'";
  const message =
    phase === 'inhale'
      ? 'Breathe in low and slow... fill your belly.'
      : seconds === 0
        ? `Now let it out: ${sound}`
        : fill >= 1
          ? 'Goal reached! Keep going if you have air left.'
          : 'Steady... keep it even...';

  return (
    <div className="breath">
      <div className={`breath__orb breath__orb--${phase}`} style={{ ['--fill' as string]: fill, ['--level' as string]: level }}>
        <svg viewBox="0 0 200 200" className="breath__ring" aria-hidden="true">
          <circle cx="100" cy="100" r="90" className="breath__track" />
          <circle cx="100" cy="100" r="90" className="breath__progress" pathLength={1} style={{ strokeDashoffset: 1 - fill }} />
        </svg>
        <div className="breath__core">
          {phase === 'inhale' ? (
            <span className="breath__label">Breathe in</span>
          ) : (
            <>
              <span className="breath__secs num">{seconds.toFixed(1)}</span>
              <span className="breath__label">of {step.goal}s</span>
            </>
          )}
        </div>
      </div>
      <div className="breath__side">
        <CoachCard mood={phase === 'inhale' ? 'sleep' : fill >= 1 ? 'cheer' : 'listen'} message={message} />
        <div className="breath__level" aria-hidden="true">
          <span style={{ width: `${level * 100}%` }} />
        </div>
        <div className="stage-controls">
          <button className="btn btn--gold btn--grow" onClick={() => setAttempt((a) => a + 1)}>
            <RotateCcw size={18} /> Start over
          </button>
          <button
            className="btn btn--ghost btn--icon"
            aria-label="Skip this one"
            title="Skip this one"
            onClick={() => {
              run.current++;
              onComplete({ precision: 0, sustain: 0, accuracy: 0, notes: [] });
            }}
          >
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
