import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { homeNote, midiToName } from '../audio/notes';
import { scoreGlide } from '../audio/scoring';
import { audioNow, playGlide, scheduleClick, sfx, toEngineTime } from '../audio/synth';
import { PitchRoll, type RollTarget } from '../components/PitchRoll';
import { TuningMeter } from '../components/TuningMeter';
import { sleep, useRecorder, viewFor, type ExerciseProps, type VoiceRange } from './common';
import { CoachCard, HoldMeter, Stage } from './Stage';

type GlideStep = Extract<Step, { kind: 'glide' }>;
type Phase = 'demo' | 'countin' | 'sing';

/** Glide endpoints are clamped, not octave-shifted, so the slide keeps its direction. */
export function glideEnds(from: number, to: number, range: VoiceRange): [number, number] {
  const home = homeNote(range.low, range.high);
  const clamp = (m: number) => Math.min(range.high, Math.max(range.low, m));
  let a = clamp(home + from);
  let b = clamp(home + to);
  if (Math.abs(b - a) < 3) {
    if (to >= from) b = Math.min(range.high, a + 5);
    else b = Math.max(range.low, a - 5);
    if (Math.abs(b - a) < 3) a = to >= from ? b - 5 : b + 5;
  }
  return [a, b];
}

export function GlideExercise({ step, range, onComplete }: ExerciseProps<GlideStep>) {
  const [from, to] = useMemo(() => glideEnds(step.from, step.to, range), [step.from, step.to, range]);
  const view = useMemo(() => viewFor([from, to], 3), [from, to]);
  const [phase, setPhase] = useState<Phase>('demo');
  const [origin, setOrigin] = useState<number | null>(null);
  const [targets, setTargets] = useState<RollTarget[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const rec = useRecorder();
  const run = useRef(0);
  const beat = 0.6;

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setProgress(0);

    setPhase('demo');
    const demoDur = 2.6;
    setTargets([{ midi: from, toMidi: to, start: 0, end: demoDur }]);
    setOrigin(pitchEngine.now() + 0.05);
    await playGlide(from, to, demoDur);
    if (!alive()) return;
    await sleep(200);

    setPhase('countin');
    setAttempt((a) => a + 1);
    const t0 = audioNow() + 0.1;
    for (let i = 0; i < 3; i++) scheduleClick(t0 + i * beat, i === 0);
    const singAt = toEngineTime(t0 + 3 * beat);
    setTargets([{ midi: from, toMidi: to, start: 0, end: step.seconds }]);
    setOrigin(singAt);
    rec.start(singAt - 0.3);
    for (let i = 3; i > 0; i--) {
      setCount(i);
      await sleep(beat * 1000);
      if (!alive()) return;
    }
    setCount(null);

    setPhase('sing');
    while (pitchEngine.now() - singAt < step.seconds + 0.4) {
      if (!alive()) return;
      setProgress((pitchEngine.now() - singAt) / step.seconds);
      await sleep(80);
    }
    const score = scoreGlide(rec.stop(), Math.min(from, to), Math.max(from, to));
    sfx('success');
    onComplete(score);
  };

  useEffect(() => {
    void go();
    return () => {
      run.current++;
    };
  }, []);

  const up = to > from;
  const message =
    phase === 'demo'
      ? `Listen: one smooth slide ${up ? 'up' : 'down'}.`
      : phase === 'countin'
        ? `Start on ${midiToName(from)}...`
        : `Slide ${up ? 'up' : 'down'} to ${midiToName(to)}, nice and smooth.`;

  return (
    <Stage
      roll={
        <PitchRoll
          low={view.low}
          high={view.high}
          targets={targets}
          origin={origin}
          live={phase !== 'demo'}
          tolerance={150}
          windowSec={3.5}
          playhead={0.45}
          resetKey={attempt}
        >
          {count !== null && (
            <div className="roll__overlay">
              <span key={count} className="roll__count">
                {count}
              </span>
            </div>
          )}
          <span className="roll__chip">
            {midiToName(from)} → {midiToName(to)}
          </span>
        </PitchRoll>
      }
      side={
        <>
          <CoachCard mood={phase === 'demo' ? 'sing' : phase === 'sing' ? 'cheer' : 'listen'} message={message} coachInput={phase === 'sing'}>
            <TuningMeter />
          </CoachCard>
          <HoldMeter label="Glide" value={progress} />
          <div className="stage-controls">
            <button className="btn btn--gold btn--grow" onClick={go} disabled={phase !== 'sing'}>
              <RotateCcw size={18} /> Start over
            </button>
            <button
              className="btn btn--ghost btn--icon"
              aria-label="Skip this one"
              title="Skip this one"
              onClick={() => {
                run.current++;
                onComplete(scoreGlide(rec.stop(), Math.min(from, to), Math.max(from, to)));
              }}
            >
              <SkipForward size={18} />
            </button>
          </div>
        </>
      }
    />
  );
}
