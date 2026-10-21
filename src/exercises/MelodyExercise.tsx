import { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, RotateCcw, SkipForward } from 'lucide-react';
import type { Step } from '../content/curriculum';
import { pitchEngine } from '../audio/pitchEngine';
import { midiToName } from '../audio/notes';
import { scoreNotes, type TargetNote } from '../audio/scoring';
import { audioNow, playLines, playSequence, scheduleClick, sfx, toEngineTime } from '../audio/synth';
import { useGame } from '../game/store';
import { PitchRoll } from '../components/PitchRoll';
import { TuningMeter } from '../components/TuningMeter';
import type { Mood } from '../components/Mascot';
import { placeMelody, sleep, useRecorder, viewFor, type ExerciseProps } from './common';
import { CoachCard, Stage } from './Stage';

type MelodyStep = Extract<Step, { kind: 'melody' }>;
type Phase = 'listen' | 'countin' | 'sing';

const GAP = 0.08;
const LATENCY = 0.12;
const COUNT_IN = 3;

export function melodyTargets(notes: number[], beat: number): TargetNote[] {
  return notes.map((midi, i) => ({ midi, start: i * beat, end: (i + 1) * beat - GAP }));
}

interface MelodyProps extends ExerciseProps<MelodyStep> {
  /** Keep clicking the beat while the singer sings (the clicks sit above the detector's range). */
  metronome?: boolean;
  /** Use these exact notes instead of placing `step.offsets` in the range. */
  notesOverride?: number[];
  /** A tune sung by someone else; the singer's notes are the harmony to it. */
  lead?: number[];
}

export function MelodyExercise({ step, range, onComplete, metronome = false, notesOverride, lead }: MelodyProps) {
  const headphones = useGame((s) => s.headphones);
  const setHeadphones = useGame((s) => s.setHeadphones);
  const notes = useMemo(() => notesOverride ?? placeMelody(step.offsets, range), [notesOverride, step.offsets, range]);
  const targets = useMemo(() => melodyTargets(notes, step.beat), [notes, step.beat]);
  const view = useMemo(() => viewFor(lead ? [...notes, ...lead] : notes, 3), [notes, lead]);
  const [phase, setPhase] = useState<Phase>('listen');
  const [origin, setOrigin] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [results, setResults] = useState<('hit' | 'miss' | null)[]>(() => notes.map(() => null));
  const [current, setCurrent] = useState<number>(-1);
  const [attempt, setAttempt] = useState(0);
  const [phaseNote, setPhaseNote] = useState('Listen');
  // What the roll draws while listening: just the tune, then tune and harmony.
  const [listenTargets, setListenTargets] = useState<TargetNote[] | null>(null);
  const heardLead = useRef(false);
  const rec = useRecorder();
  const run = useRef(0);
  // Phones get a shorter visible window so each note stays wide enough to read.
  const narrow = useMemo(() => window.innerWidth < 640, []);

  const go = async () => {
    const id = ++run.current;
    const alive = () => run.current === id;
    setResults(notes.map(() => null));
    setCurrent(-1);

    // 1. Listen
    setPhase('listen');
    setOrigin(pitchEngine.now() + 0.06);
    const line = (ns: number[]) => ns.map((midi) => ({ midi, dur: step.beat - GAP, gap: GAP }));
    if (lead) {
      const leadTargets = melodyTargets(lead, step.beat);
      // First the tune on its own (once), then both parts together.
      if (!heardLead.current) {
        setPhaseNote('The tune');
        setListenTargets(leadTargets);
        setOrigin(pitchEngine.now() + 0.06);
        await playSequence(line(lead), 'piano');
        if (!alive()) return;
        await sleep(300);
        heardLead.current = true;
      }
      setPhaseNote('Tune + harmony');
      setListenTargets([...leadTargets, ...targets]);
      setOrigin(pitchEngine.now() + 0.06);
      await playLines([{ notes: line(lead) }, { notes: line(notes), timbre: 'voice', vel: 0.3 }]);
      setListenTargets(null);
    } else {
      await playSequence(line(notes), 'piano');
    }
    if (!alive()) return;
    await sleep(250);
    if (!alive()) return;

    // 2. Count in on the beat
    setPhase('countin');
    setAttempt((a) => a + 1);
    const t0 = audioNow() + 0.1;
    const clicks = COUNT_IN + (metronome ? notes.length : 0);
    for (let i = 0; i < clicks; i++) scheduleClick(t0 + i * step.beat, i === 0 || (i >= COUNT_IN && (i - COUNT_IN) % 4 === 0));
    const singAt = toEngineTime(t0 + COUNT_IN * step.beat);
    setOrigin(singAt);
    rec.start(singAt);
    for (let i = 0; i < COUNT_IN; i++) {
      setCount(COUNT_IN - i);
      await sleep(step.beat * 1000);
      if (!alive()) return;
    }
    setCount(null);

    // 3. Sing along, grading each note as it passes
    setPhase('sing');
    // With headphones the tune plays under you; without, you carry your part alone.
    if (lead && headphones) void playSequence(lead.map((midi) => ({ midi, dur: step.beat - GAP, gap: GAP })), 'piano', 0.02, { muteMic: false, vel: 0.3 });
    const total = targets[targets.length - 1].end + LATENCY + 0.25;
    while (pitchEngine.now() - singAt < total) {
      if (!alive()) return;
      const rel = pitchEngine.now() - singAt;
      setCurrent(targets.findIndex((t) => rel >= t.start && rel <= t.end));
      const passed = targets.filter((t) => t.end + LATENCY < rel);
      if (passed.length) {
        const partial = scoreNotes(rec.samples.current, passed, { onsetGrace: Math.min(0.2, step.beat * 0.25), latency: LATENCY });
        setResults((prev) => {
          const next = [...prev];
          partial.notes.forEach((n, i) => {
            if (next[i] === null) {
              next[i] = n.hit ? 'hit' : 'miss';
              if (n.hit) sfx('hit');
            }
          });
          return next;
        });
      }
      await sleep(60);
    }
    const samples = rec.stop();
    const score = scoreNotes(samples, targets, { onsetGrace: Math.min(0.2, step.beat * 0.25), latency: LATENCY });
    sfx('success');
    onComplete(score);
  };

  useEffect(() => {
    void go();
    return () => {
      run.current++;
    };
  }, []);

  const hits = results.filter((r) => r === 'hit').length;
  const { mood, message } = coachFor(phase, current >= 0 ? notes[current] : null, hits);

  return (
    <Stage
      roll={
        <PitchRoll
          low={view.low}
          high={view.high}
          targets={phase === 'listen' && listenTargets ? listenTargets : targets}
          origin={origin}
          live={phase !== 'listen'}
          windowSec={narrow ? 1.5 : 3}
          playhead={0.4}
          resetKey={attempt}
        >
          {count !== null && (
            <div className="roll__overlay">
              <span key={count} className="roll__count">
                {count}
              </span>
            </div>
          )}
          <span className="roll__chip">{phase === 'listen' ? phaseNote : 'Your turn'}</span>
        </PitchRoll>
      }
      side={
        <>
          <CoachCard mood={mood} message={message} coachInput={phase === 'sing'}>
            <TuningMeter target={current >= 0 ? notes[current] : null} />
          </CoachCard>
          {lead && (
            <>
              <p className="mute" style={{ fontWeight: 700 }}>
                The tune: {lead.map(midiToName).join(' · ')}
              </p>
              <label className="toggle-row">
                <input type="checkbox" checked={headphones} onChange={(e) => setHeadphones(e.target.checked)} />
                <Headphones size={18} /> Headphones on (tune plays while you sing)
              </label>
            </>
          )}
          <div className="notes-strip" aria-label={lead ? 'Your harmony notes' : 'Notes'}>
            {notes.map((m, i) => (
              <span key={i} data-state={results[i] ?? (i === current ? 'now' : '')}>
                {step.lyrics?.[i] ?? midiToName(m)}
              </span>
            ))}
          </div>
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
                onComplete(scoreNotes(rec.stop(), targets));
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

function coachFor(phase: Phase, note: number | null, hits: number): { mood: Mood; message: string } {
  if (phase === 'listen') return { mood: 'sing', message: 'Listen first. Follow the gold notes with your eyes.' };
  if (phase === 'countin') return { mood: 'listen', message: 'Your turn in...' };
  if (note !== null) return { mood: hits > 0 ? 'cheer' : 'sing', message: `Sing ${midiToName(note)} now!` };
  return { mood: 'idle', message: 'Ride the gold notes as they reach the line.' };
}
