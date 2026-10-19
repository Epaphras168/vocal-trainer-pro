import { useEffect, useRef, useState } from 'react';
import { Lightbulb, RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine, type PitchFrame } from '../audio/pitchEngine';
import { scoreBreath, type Sample } from '../audio/scoring';
import { sfx } from '../audio/synth';
import { sleep, type ExerciseProps } from './common';
import { CoachCard } from './Stage';
import './BreathExercise.css';

// Breath work doesn't need a pitch. We listen for sound that stands clearly
// above the room's own noise, and measure how long and how evenly it lasts.
//
// Everything is relative to the room, in dB, so a soft, gentle breath counts
// just as well as a hard one. A hiss is measured in the high band where "sss"
// lives; a hum by its overall loudness.

type BreathStep = Extract<Step, { kind: 'breath' }>;
type Phase = 'inhale' | 'go' | 'done';

/** Sound starts counting this far above the room, and keeps counting until it drops below the lower line. */
const START_DB = 8;
const STOP_DB = 4.5;
/** How long a dip below the line can last before the breath is over. */
const DIP_SECONDS = 0.9;
/** Raw loudness this high is someone blowing straight into the mic. */
const TOO_HARD_RMS = 0.15;

const levelDb = (f: PitchFrame, sound: BreathStep['sound']) => (sound === 'hiss' ? f.hissDb : 20 * Math.log10(Math.max(f.rms, 1e-5)));

export function BreathExercise({ step, onComplete }: ExerciseProps<BreathStep>) {
  const [phase, setPhase] = useState<Phase>('inhale');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [tooHard, setTooHard] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setSeconds(0);
    setLevel(0);
    setTooHard(false);

    // Inhale: also a quiet moment to measure the room.
    setPhase('inhale');
    const floor: number[] = [];
    const offFloor = pitchEngine.onFrame((f) => floor.push(levelDb(f, step.sound)));
    await sleep(3200);
    offFloor();
    if (!alive()) return;
    // The quieter part of the sample, so an early starter doesn't raise the bar.
    const sorted = [...floor].sort((a, b) => a - b);
    const noise = sorted[Math.floor(sorted.length * 0.25)] ?? (step.sound === 'hiss' ? -100 : -60);
    const startDb = noise + START_DB;
    const stopDb = noise + STOP_DB;

    setPhase('go');
    const samples: Sample[] = [];
    const start = pitchEngine.now();
    let started: number | null = null;
    let quietSince: number | null = null;
    let smooth: number | null = null;
    let hardCount = 0;
    await new Promise<void>((resolve) => {
      let lastUi = 0;
      const off = pitchEngine.onFrame((f) => {
        if (!alive()) {
          off();
          resolve();
          return;
        }
        const t = f.t - start;
        const raw = levelDb(f, step.sound);
        // A little smoothing so flicker between frames doesn't look like silence.
        smooth = smooth === null ? raw : smooth + (raw - smooth) * 0.35;
        // A hum is a clear pitch, so a steady voiced note counts even if it is quiet.
        const sounding = smooth >= (started === null ? startDb : stopDb) || (step.sound === 'hum' && f.midi !== null);
        // The scorer sees exactly what we counted: the smoothed level as a linear
        // amplitude while sounding, and zero while not.
        samples.push({ t, midi: f.midi, rms: sounding ? Math.pow(10, smooth / 20) : 0 });
        if (sounding) {
          started ??= t;
          quietSince = null;
        } else if (started !== null) {
          quietSince ??= t;
        }
        hardCount = f.rms > TOO_HARD_RMS ? Math.min(30, hardCount + 1) : Math.max(0, hardCount - 1);
        if (t - lastUi > 0.08) {
          lastUi = t;
          setLevel(Math.min(1, Math.max(0, (smooth - noise) / 35)));
          setTooHard(hardCount > 12);
          if (started !== null && quietSince === null) setSeconds(t - started);
        }
        const ranOut = started !== null && quietSince !== null && t - quietSince > DIP_SECONDS;
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
    const score = scoreBreath(samples, step.goal, 1e-9, DIP_SECONDS);
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
      : tooHard
        ? `That's a lot of air! Ease off. A soft, thin ${sound} is all we need.`
        : seconds === 0
          ? step.sound === 'hiss'
            ? `Now let it out: ${sound}. Soft and gentle, like a slow tyre leak.`
            : `Now a gentle ${sound}, lips closed. Soft and steady.`
          : fill >= 1
            ? 'Goal reached! Keep going if you have air left.'
            : 'Lovely and gentle... keep it steady...';

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
        <CoachCard mood={phase === 'inhale' ? 'sleep' : tooHard ? 'encourage' : fill >= 1 ? 'cheer' : 'listen'} message={message} />
        {step.sound === 'hiss' && (
          <p className="tip">
            <Lightbulb size={20} /> Gentle beats loud. If you're blowing hard, you're using too much air. Hold your phone a little away so you're not blowing straight into the mic.
          </p>
        )}
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
