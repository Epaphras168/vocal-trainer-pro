import { useEffect, useMemo, useRef, useState } from 'react';
import { Hand, Mic, RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { scoreTaps } from '../audio/scoring';
import { audioNow, outputLatency, scheduleClick, sfx, toEngineTime } from '../audio/synth';
import { sleep, type ExerciseProps } from './common';
import { CoachCard } from './Stage';
import './RhythmExercise.css';

// Timing practice. Tap (or sing a short "ta") on the marked beats while a
// metronome keeps time. Clicks sit above the pitch detector's range, so in
// sing mode they can never be mistaken for the singer's onsets.

type RhythmStep = Extract<Step, { kind: 'rhythm' }>;
type Phase = 'ready' | 'countin' | 'play';

const COUNT_IN = 4;

export function RhythmExercise({ step, onComplete }: ExerciseProps<RhythmStep>) {
  const beat = 60 / step.bpm;
  const length = Math.ceil(Math.max(...step.pattern)) + 1;
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState<number | null>(null);
  const [taps, setTaps] = useState<{ beat: number; quality: 'good' | 'ok' | 'off' }[]>([]);
  const [cursor, setCursor] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const origin = useRef<number | null>(null);
  const tapTimes = useRef<number[]>([]);
  const run = useRef(0);
  const padRef = useRef<HTMLButtonElement>(null);
  const beats = useMemo(() => step.pattern.map((b) => b * beat), [step.pattern, beat]);

  const registerAt = (t: number) => {
    if (origin.current === null) return;
    const rel = t - origin.current;
    if (rel < -0.4 || rel > length * beat) return;
    tapTimes.current.push(rel);
    const nearest = Math.min(...beats.map((b) => Math.abs(b - rel)));
    const quality = nearest < 0.07 ? 'good' : nearest < 0.16 ? 'ok' : 'off';
    setTaps((prev) => [...prev, { beat: rel / beat, quality }]);
    if (quality === 'good') sfx('tap');
  };

  const tap = () => {
    registerAt(pitchEngine.now());
    padRef.current?.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
  };

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setTaps([]);
    tapTimes.current = [];
    setCursor(0);
    setPhase('countin');
    const t0 = audioNow() + 0.15;
    for (let i = 0; i < COUNT_IN + length; i++) scheduleClick(t0 + i * beat, i % 4 === 0);
    // Judge against when the click is *heard*, not when it was scheduled.
    origin.current = toEngineTime(t0 + COUNT_IN * beat) + outputLatency();
    for (let i = COUNT_IN; i > 0; i--) {
      setCount(i);
      await sleep(beat * 1000);
      if (!alive()) return;
    }
    setCount(null);
    setPhase('play');
    while (origin.current !== null && pitchEngine.now() - origin.current < length * beat) {
      if (!alive()) return;
      setCursor((pitchEngine.now() - origin.current) / beat);
      await sleep(30);
    }
    if (!alive()) return;
    origin.current = null;
    const score = scoreTaps(tapTimes.current, beats);
    sfx('success');
    onComplete(score);
  };

  useEffect(() => {
    if (attempt === 0) return;
    void go();
    return () => {
      run.current++;
    };
  }, [attempt]);

  // Keyboard: space or enter taps.
  useEffect(() => {
    if (step.sing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && origin.current !== null) {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step.sing]);

  // Sing mode: each new voiced onset counts as a tap.
  useEffect(() => {
    if (!step.sing) return;
    let voiced = false;
    let lastOnset = 0;
    return pitchEngine.onFrame((f) => {
      const now = f.midi !== null;
      if (now && !voiced && f.t - lastOnset > 0.15) {
        lastOnset = f.t;
        // Detection lags the real onset by about two frames plus half a window.
        registerAt(f.t - 0.05);
      }
      voiced = now;
    });
  }, [step.sing]);

  const good = taps.filter((t) => t.quality === 'good').length;
  const message =
    phase === 'ready'
      ? step.prompt
      : phase === 'countin'
        ? 'Listen to the clicks... get ready.'
        : good > 2
          ? 'You are locked in! Keep going.'
          : step.sing
            ? "Sing 'ta!' on each gold dot."
            : 'Tap on each gold dot.';

  return (
    <div className="rhythm">
      <CoachCard mood={phase === 'play' ? (good > 2 ? 'cheer' : 'sing') : 'listen'} message={message} />
      <div className="rhythm__track" style={{ ['--len' as string]: length }}>
        {Array.from({ length: length + 1 }, (_, i) => (
          <span key={`b${i}`} className="rhythm__tick" style={{ left: `${(i / length) * 100}%` }}>
            <em>{(i % 4) + 1}</em>
          </span>
        ))}
        {step.pattern.map((b, i) => (
          <span
            key={`p${i}`}
            className="rhythm__dot"
            data-past={phase === 'play' && cursor > b + 0.2}
            style={{ left: `${(b / length) * 100}%` }}
          />
        ))}
        {taps.map((t, i) => (
          <span key={`t${i}`} className={`rhythm__tap rhythm__tap--${t.quality}`} style={{ left: `${(Math.max(0, t.beat) / length) * 100}%` }} />
        ))}
        {phase === 'play' && <span className="rhythm__cursor" style={{ left: `${Math.min(1, cursor / length) * 100}%` }} />}
        {count !== null && (
          <span key={count} className="rhythm__count">
            {count}
          </span>
        )}
      </div>

      {phase === 'ready' ? (
        <button className="btn btn--primary btn--lg btn--block" onClick={() => setAttempt((a) => a + 1)}>
          Start the beat
        </button>
      ) : step.sing ? (
        <div className="rhythm__pad rhythm__pad--mic" aria-live="polite">
          <Mic size={36} />
          <span>Sing on the dots</span>
        </div>
      ) : (
        <button ref={padRef} className="rhythm__pad" onPointerDown={tap} aria-label="Tap">
          <Hand size={36} />
          <span>Tap</span>
        </button>
      )}

      {phase !== 'ready' && (
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
              onComplete(scoreTaps(tapTimes.current, beats));
            }}
          >
            <SkipForward size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
