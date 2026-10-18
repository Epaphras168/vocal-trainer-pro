import { useEffect, useMemo, useRef, useState } from 'react';
import { SkipForward, Volume2 } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { centsFromFolded, midiToName } from '../audio/notes';
import { scoreNotes, type Sample, type Score } from '../audio/scoring';
import { playNote, sfx } from '../audio/synth';
import { PitchRoll } from '../components/PitchRoll';
import { TuningMeter } from '../components/TuningMeter';
import type { Mood } from '../components/Mascot';
import { detectVibrato, emptyScore, noteFor, useRecorder, viewFor, type ExerciseProps } from './common';
import { CoachCard, HoldMeter, Stage } from './Stage';

type HoldStep = Extract<Step, { kind: 'hold' }>;
type Live = 'waiting' | 'on' | 'flat' | 'sharp';

const ON_LINES = ['Yes! Right on it.', 'Hold it... beautiful.', "That's the one!", 'Lovely and steady.'];

/** Grade a held note from the moment the singer started. */
export function scoreHold(samples: Sample[], target: number, easy = false): Score {
  const first = samples.find((s) => s.midi !== null);
  if (!first) return emptyScore();
  const end = samples[samples.length - 1].t;
  const score = scoreNotes(samples, [{ midi: target, start: first.t, end }], { onsetGrace: 0.25, latency: 0 });
  // The closing "victory lap" is about confidence: finishing it is a win.
  if (easy) return { ...score, accuracy: Math.max(score.accuracy, 75) };
  return score;
}

export function HoldExercise({ step, range, onComplete }: ExerciseProps<HoldStep>) {
  const target = useMemo(() => noteFor(step.offset, range), [step.offset, range]);
  const tol = step.tolerance ?? 50;
  const view = useMemo(() => viewFor([target], 5), [target]);
  const [phase, setPhase] = useState<'listen' | 'sing'>('listen');
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState<Live>('waiting');
  const [stuck, setStuck] = useState(false);
  const rec = useRecorder();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const done = useRef(false);
  const lineIdx = useRef(0);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    const samples = rec.stop();
    let score = scoreHold(samples, target, step.easy);
    if (step.vibrato) {
      const vib = detectVibrato(samples);
      if (vib.present) score = { ...score, sustain: Math.max(score.sustain, 90), accuracy: Math.max(score.accuracy, 85) };
    }
    sfx('success');
    onComplete(score);
  };

  const listen = async () => {
    setPhase('listen');
    await playNote(target, 1.3);
    if (done.current) return;
    if (!rec.origin.current) rec.start();
    setPhase('sing');
  };

  useEffect(() => {
    void listen();
    const t = setTimeout(() => setStuck(true), 25000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let onTime = 0;
    let last: number | null = null;
    let lastUi = 0;
    let lastSecond = 0;
    return pitchEngine.onFrame((f) => {
      if (phaseRef.current !== 'sing' || done.current) {
        last = null;
        return;
      }
      const dt = last === null ? 0 : Math.min(0.1, f.t - last);
      last = f.t;
      let state: Live = 'waiting';
      if (f.midi !== null) {
        const c = centsFromFolded(f.midi, target);
        state = Math.abs(c) <= tol ? 'on' : c < 0 ? 'flat' : 'sharp';
        if (state === 'on') onTime += dt;
      }
      if (Math.floor(onTime) > lastSecond) {
        lastSecond = Math.floor(onTime);
        sfx('xp');
      }
      if (f.t - lastUi > 0.1) {
        lastUi = f.t;
        setProgress(onTime / step.seconds);
        setLive((prev) => {
          if (prev !== 'on' && state === 'on') lineIdx.current = (lineIdx.current + 1) % ON_LINES.length;
          return state;
        });
      }
      if (onTime >= step.seconds) finish();
    });
  }, [target, tol, step.seconds]);

  const { mood, message } = coachFor(phase, live, step.prompt, lineIdx.current);

  return (
    <Stage
      roll={
        <PitchRoll low={view.low} high={view.high} hold={target} tolerance={tol} windowSec={5} playhead={0.82}>
          <span className="roll__chip">Target {midiToName(target)}</span>
        </PitchRoll>
      }
      side={
        <>
          <CoachCard mood={mood} message={message} coachInput={phase === 'sing' && live !== 'on'}>
            <TuningMeter target={target} tolerance={tol} />
          </CoachCard>
          <HoldMeter label={`Hold it for ${step.seconds} seconds`} value={progress} />
          <div className="stage-controls">
            <button className="btn btn--gold btn--grow" onClick={listen} disabled={phase === 'listen'}>
              <Volume2 size={18} /> Hear {midiToName(target)}
            </button>
            <button
              className={`btn ${stuck ? 'btn--primary' : 'btn--ghost'} btn--icon`}
              onClick={finish}
              aria-label="Skip this one"
              title="Skip this one"
            >
              <SkipForward size={18} />
            </button>
          </div>
        </>
      }
    />
  );
}

function coachFor(phase: 'listen' | 'sing', live: Live, prompt: string, idx: number): { mood: Mood; message: string } {
  if (phase === 'listen') return { mood: 'sing', message: 'Listen to the note...' };
  switch (live) {
    case 'on':
      return { mood: 'cheer', message: ON_LINES[idx] };
    case 'flat':
      return { mood: 'listen', message: 'A touch higher... lift it up to the gold line.' };
    case 'sharp':
      return { mood: 'listen', message: 'Ease down a little, you are just above it.' };
    default:
      return { mood: 'idle', message: prompt };
  }
}
