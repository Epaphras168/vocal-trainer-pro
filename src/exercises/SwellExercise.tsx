import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { centsFromFolded, midiToName } from '../audio/notes';
import { scoreSwell } from '../audio/scoring';
import { playNote, sfx } from '../audio/synth';
import { PitchRoll } from '../components/PitchRoll';
import { TuningMeter } from '../components/TuningMeter';
import type { Mood } from '../components/Mascot';
import { emptyScore, noteFor, useRecorder, viewFor, type ExerciseProps } from './common';
import { CoachCard, Stage } from './Stage';
import './SwellExercise.css';

// Dynamics: hold one steady note and let it grow, then fade (messa di voce).
// Loudness is measured against your own start level, so the mic's gain and
// your distance from it don't matter. Only the shape does.

type SwellStep = Extract<Step, { kind: 'swell' }>;
type Phase = 'listen' | 'ready' | 'sing' | 'done';

const TOL = 70;
/** The chart spans this many dB above the start level. */
const SPAN_DB = 14;

export function SwellExercise({ step, range, onComplete }: ExerciseProps<SwellStep>) {
  const target = useMemo(() => noteFor(step.offset, range), [step.offset, range]);
  const view = useMemo(() => viewFor([target], 5), [target]);
  const [phase, setPhase] = useState<Phase>('listen');
  const [elapsed, setElapsed] = useState(0);
  const [trace, setTrace] = useState<[number, number][]>([]);
  const rec = useRecorder();
  const phaseRef = useRef<Phase>('listen');
  phaseRef.current = phase;
  const done = useRef(false);
  const origin = useRef<number | null>(null);
  const levels = useRef<[number, number][]>([]);
  const run = useRef(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setPhase('done');
    const samples = rec.stop();
    const score = scoreSwell(samples, target, step.seconds, TOL);
    sfx(score.sustain >= 50 ? 'success' : 'soft');
    onComplete(samples.length ? score : emptyScore());
  };

  const reset = async () => {
    const id = ++run.current;
    done.current = false;
    origin.current = null;
    levels.current = [];
    setTrace([]);
    setElapsed(0);
    setPhase('listen');
    await playNote(target, 1.3);
    if (run.current !== id) return;
    setPhase('ready');
  };

  useEffect(() => {
    void reset();
    return () => {
      run.current++;
    };
  }, []);

  useEffect(() => {
    let lastUi = 0;
    let base: number | null = null;
    return pitchEngine.onFrame((f) => {
      const p = phaseRef.current;
      if (done.current) return;
      if (p === 'ready' && f.midi !== null && Math.abs(centsFromFolded(f.midi, target)) <= TOL) {
        // Start the clock when the singer arrives on the note.
        origin.current = f.t;
        base = null;
        rec.start(f.t);
        setPhase('sing');
        return;
      }
      if (p !== 'sing' || origin.current === null) return;
      const t = f.t - origin.current;
      if (f.midi !== null) {
        const db = 20 * Math.log10(Math.max(f.rms, 1e-5));
        // Start level: the first half-second, smoothed.
        base = base === null ? db : t < 0.5 ? base + (db - base) * 0.2 : base;
        levels.current.push([t, Math.min(SPAN_DB + 2, Math.max(-4, db - base))]);
      }
      if (f.t - lastUi > 0.1) {
        lastUi = f.t;
        setElapsed(t);
        setTrace([...levels.current]);
      }
      if (t >= step.seconds) finish();
    });
  }, [target, step.seconds]);

  const half = step.seconds / 2;
  const { mood, message } = coachFor(phase, elapsed, half, step.prompt);
  const W = 300;
  const H = 120;
  const px = (t: number) => (t / step.seconds) * W;
  const py = (d: number) => H - 8 - (Math.max(0, Math.min(SPAN_DB, d)) / SPAN_DB) * (H - 24);
  const ideal = `M0,${py(0)} L${px(half)},${py(SPAN_DB * 0.85)} L${W},${py(0)}`;
  const live = trace.map(([t, d], i) => `${i ? 'L' : 'M'}${px(t).toFixed(1)},${py(d).toFixed(1)}`).join(' ');

  return (
    <Stage
      roll={
        <PitchRoll low={view.low} high={view.high} hold={target} tolerance={TOL} windowSec={5} playhead={0.82}>
          <span className="roll__chip">Target {midiToName(target)}</span>
        </PitchRoll>
      }
      side={
        <>
          <CoachCard mood={mood} message={message} coachInput={phase === 'sing'}>
            <TuningMeter target={target} tolerance={TOL} />
          </CoachCard>
          <div className="swell card card--tight" aria-label="Loudness shape">
            <div className="spread">
              <strong>Volume shape</strong>
              <span className="mute">louder ↑</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="swell__chart" role="img" aria-label="Aim to follow the dashed hill with your volume">
              <path d={ideal} className="swell__ideal" />
              {live && <path d={live} className="swell__live" />}
              {phase === 'sing' && <line x1={px(elapsed)} x2={px(elapsed)} y1={6} y2={H - 6} className="swell__now" />}
            </svg>
            <div className="spread mute">
              <span>soft</span>
              <span>loudest</span>
              <span>soft</span>
            </div>
          </div>
          <div className="stage-controls">
            <button className="btn btn--gold btn--grow" onClick={() => void reset()} disabled={phase === 'listen'}>
              {phase === 'done' || phase === 'sing' ? <RotateCcw size={18} /> : <Volume2 size={18} />}
              {phase === 'sing' || phase === 'done' ? 'Start over' : `Hear ${midiToName(target)}`}
            </button>
            <button className="btn btn--ghost btn--icon" aria-label="Skip this one" title="Skip this one" onClick={finish}>
              <SkipForward size={18} />
            </button>
          </div>
        </>
      }
    />
  );
}

function coachFor(phase: Phase, t: number, half: number, prompt: string): { mood: Mood; message: string } {
  if (phase === 'listen') return { mood: 'sing', message: 'Listen to the note...' };
  if (phase === 'ready') return { mood: 'idle', message: `${prompt} Start softly. The clock begins when you land on the note.` };
  if (phase === 'done') return { mood: 'cheer', message: 'And relax.' };
  if (t < half * 0.9) return { mood: 'listen', message: 'Grow... a little more power with each second.' };
  if (t < half * 1.1) return { mood: 'cheer', message: 'The top of the hill!' };
  return { mood: 'listen', message: 'Now ease it back down. Keep the pitch steady.' };
}
