import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { midiToPitchClass, SCALES, scaleNotes } from '../audio/notes';
import { scoreImprov } from '../audio/scoring';
import { playDrone, playNote, playSequence, sfx } from '../audio/synth';
import { PitchRoll } from '../components/PitchRoll';
import type { Mood } from '../components/Mascot';
import { useGame } from '../game/store';
import { noteFor, sleep, useRecorder, type ExerciseProps } from './common';
import { CoachCard, HoldMeter, Stage } from './Stage';

// Ad-libbing has no right answer, so this is a playground with guard rails:
// every note of a key is marked on the roll, and you are graded on staying in
// the key, using several different notes, and moving between them.

type ImprovStep = Extract<Step, { kind: 'improv' }>;
type Phase = 'listen' | 'countin' | 'sing' | 'done';

/** Frames on one note before it counts as a visit (about 0.15 s). */
const VISIT_FRAMES = 9;

export function ImprovExercise({ step, range, onComplete }: ExerciseProps<ImprovStep>) {
  const headphones = useGame((s) => s.headphones);
  const setHeadphones = useGame((s) => s.setHeadphones);
  const root = useMemo(() => noteFor(0, range), [range]);
  const shape = SCALES[step.scale];
  const { lanes, view, degrees } = useMemo(() => {
    const low = Math.max(range.low, root - 5);
    const high = Math.min(range.high, root + 14);
    return {
      lanes: scaleNotes(root, shape, low, high),
      view: { low: low - 1, high: high + 1 },
      degrees: scaleNotes(root, shape, root, root + 11),
    };
  }, [root, shape, range]);
  const [phase, setPhase] = useState<Phase>('listen');
  const [count, setCount] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [visited, setVisited] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(0);
  const rec = useRecorder();
  const run = useRef(0);
  const phaseRef = useRef<Phase>('listen');
  phaseRef.current = phase;

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setVisited([]);
    setElapsed(0);
    setPhase('listen');
    // Hear the key: the notes you can use, then home.
    await playSequence([...degrees, root + 12].map((midi) => ({ midi, dur: 0.28, gap: 0.04 })), 'piano');
    if (!alive()) return;
    await playNote(root, 0.9, 'voice');
    if (!alive()) return;
    setAttempt((a) => a + 1);
    setPhase('countin');
    for (let i = 3; i > 0; i--) {
      setCount(i);
      await sleep(700);
      if (!alive()) return;
    }
    setCount(null);
    setPhase('sing');
    rec.start();
    // With headphones a soft drone on home and the fifth keeps you company.
    if (step.drone && headphones) void playDrone([root - 12, root - 5], step.seconds + 0.5, { muteMic: false });
    const t0 = pitchEngine.now();
    while (pitchEngine.now() - t0 < step.seconds) {
      if (!alive()) return;
      setElapsed(pitchEngine.now() - t0);
      await sleep(80);
    }
    if (!alive()) return;
    finish();
  };

  const finish = () => {
    run.current++;
    const samples = rec.stop();
    setPhase('done');
    const score = scoreImprov(samples, lanes, { seconds: step.seconds, wantDistinct: step.wantDistinct });
    sfx(score.accuracy >= 50 ? 'success' : 'soft');
    onComplete(score);
  };

  useEffect(() => {
    void go();
    return () => {
      run.current++;
    };
  }, []);

  // Light up each note of the key as you land on it.
  useEffect(() => {
    let run = 0;
    let on: number | null = null;
    return pitchEngine.onFrame((f) => {
      if (phaseRef.current !== 'sing' || f.midi === null) {
        run = 0;
        on = null;
        return;
      }
      const near = Math.round(f.midi);
      const inKey = lanes.includes(near) && Math.abs(f.midi - near) < 0.45 ? near : null;
      if (inKey !== null && inKey === on) run++;
      else {
        on = inKey;
        run = inKey === null ? 0 : 1;
      }
      if (inKey !== null && run === VISIT_FRAMES) {
        const pc = ((inKey % 12) + 12) % 12;
        setVisited((v) => (v.includes(pc) ? v : [...v, pc]));
        sfx('tap');
      }
    });
  }, [lanes]);

  const goal = step.wantDistinct ?? 4;
  const { mood, message } = coachFor(phase, visited.length, goal, step.prompt);

  return (
    <Stage
      roll={
        <PitchRoll low={view.low} high={view.high} lanes={lanes} windowSec={4} playhead={0.7} tolerance={45} live={phase === 'sing'} resetKey={attempt}>
          {count !== null && (
            <div className="roll__overlay">
              <span key={count} className="roll__count">
                {count}
              </span>
            </div>
          )}
          <span className="roll__chip">{phase === 'listen' ? 'Hear the key' : 'Gold lines are your notes'}</span>
        </PitchRoll>
      }
      side={
        <>
          <CoachCard mood={mood} message={message} coachInput={phase === 'sing'} />
          <div className="notes-strip" aria-label="Notes of the key">
            {degrees.map((m) => (
              <span key={m} data-state={visited.includes(((m % 12) + 12) % 12) ? 'hit' : ''}>
                {midiToPitchClass(m)}
              </span>
            ))}
          </div>
          <HoldMeter label={`Free sing · ${Math.max(0, Math.ceil(step.seconds - elapsed))}s`} value={elapsed / step.seconds} sparkles={visited.length} />
          {step.drone && (
            <label className="toggle-row">
              <input type="checkbox" checked={headphones} onChange={(e) => setHeadphones(e.target.checked)} />
              <Headphones size={18} /> I'm wearing headphones (adds a soft drone)
            </label>
          )}
          <div className="stage-controls">
            <button className="btn btn--gold btn--grow" onClick={() => void go()} disabled={phase === 'listen'}>
              <RotateCcw size={18} /> Start over
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

function coachFor(phase: Phase, found: number, goal: number, prompt: string): { mood: Mood; message: string } {
  if (phase === 'listen') return { mood: 'sing', message: 'Listen: these are the notes of the key. Home is the last one you hear.' };
  if (phase === 'countin') return { mood: 'listen', message: 'Get ready to play...' };
  if (phase === 'done') return { mood: 'cheer', message: 'Nice. That was yours.' };
  if (found === 0) return { mood: 'sing', message: prompt };
  if (found < goal) return { mood: 'cheer', message: `${found} note${found === 1 ? '' : 's'} of the key found. Visit a new one!` };
  return { mood: 'cheer', message: 'Lovely variety. Keep playing, shape a little tune.' };
}
