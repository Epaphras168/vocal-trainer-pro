import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, RotateCcw } from 'lucide-react';
import { pitchEngine } from '../audio/pitchEngine';
import { midiToName } from '../audio/notes';
import { sfx } from '../audio/synth';
import { useThrottledFrame } from '../hooks/useMic';
import { Mascot } from './Mascot';
import { Piano } from './Piano';
import { TuningMeter } from './TuningMeter';
import { CoachCard } from '../exercises/Stage';
import './RangeFinder.css';

// Finds a singer's comfortable range: sigh down to the floor, slide up to the
// ceiling. A note only counts once it has been held for a moment, so cracks
// and octave glitches don't inflate the result.

const HOLD_TO_COUNT = 0.35;

interface Props {
  onDone: (low: number, high: number) => void;
}

type Phase = 'low' | 'high';

export function RangeFinder({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('low');
  const [low, setLow] = useState<number | null>(null);
  const [high, setHigh] = useState<number | null>(null);
  const time = useRef(new Map<number, number>());
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const frame = useThrottledFrame(15);
  const live = frame.midi !== null ? Math.round(frame.midi) : null;

  useEffect(() => {
    let last: number | null = null;
    return pitchEngine.onFrame((f) => {
      const dt = last === null ? 0 : Math.min(0.1, f.t - last);
      last = f.t;
      if (f.midi === null) return;
      const m = Math.round(f.midi);
      // Only count frames that sit near the centre of a note.
      if (Math.abs(f.midi - m) > 0.45) return;
      const total = (time.current.get(m) ?? 0) + dt;
      time.current.set(m, total);
      if (total < HOLD_TO_COUNT) return;
      if (phaseRef.current === 'low') {
        setLow((prev) => {
          if (prev === null || m < prev) {
            if (prev !== null) sfx('tap');
            return m;
          }
          return prev;
        });
      } else {
        setHigh((prev) => {
          if (prev === null || m > prev) {
            if (prev !== null) sfx('tap');
            return m;
          }
          return prev;
        });
      }
    });
  }, []);

  const toHigh = () => {
    time.current.clear();
    setPhase('high');
    setHigh(low);
    sfx('pop');
  };

  const finish = () => {
    if (low === null || high === null) return;
    const lo = Math.min(low, high);
    // A tiny measured range is almost always a shy first try; give some room.
    const hi = Math.max(high, lo + 7);
    sfx('success');
    onDone(lo, hi);
  };

  const restart = () => {
    time.current.clear();
    setLow(null);
    setHigh(null);
    setPhase('low');
  };

  const msg =
    phase === 'low'
      ? low === null
        ? "Sing a comfy 'ahh', then sigh down as low as feels easy. Hold the bottom note."
        : `Lowest so far: ${midiToName(low)}. Can you go a little lower? No straining!`
      : high === null || high === low
        ? "Now slide up from the middle, as high as feels easy. Falsetto counts! Hold the top note."
        : `Highest so far: ${midiToName(high)}. A bit higher? Only if it feels easy.`;

  return (
    <div className="rangefinder">
      <div className="rangefinder__steps">
        <span data-active={phase === 'low'} data-done={phase === 'high'}>
          <ArrowDown size={16} /> Lowest note
        </span>
        <span data-active={phase === 'high'}>
          <ArrowUp size={16} /> Highest note
        </span>
      </div>

      <div className="rangefinder__grid">
        <CoachCard mood={live !== null ? 'sing' : 'listen'} message={msg} coachInput={live === null && (phase === 'low' ? low === null : high === null)}>
          <TuningMeter />
        </CoachCard>
        <div className="card rangefinder__found">
          <div className="rangefinder__ends">
            <div>
              <span className="eyebrow">Low</span>
              <strong className="num">{low !== null ? midiToName(low) : '--'}</strong>
            </div>
            <Mascot mood={phase === 'high' && high !== null && high !== low ? 'cheer' : 'idle'} size={80} still />
            <div>
              <span className="eyebrow">High</span>
              <strong className="num">{phase === 'high' && high !== null ? midiToName(high) : '--'}</strong>
            </div>
          </div>
          <Piano from={36} to={84} low={low} high={phase === 'high' ? high : low} live={live} />
        </div>
      </div>

      <div className="stage-controls">
        <button className="btn btn--ghost btn--icon" onClick={restart} aria-label="Start again" title="Start again">
          <RotateCcw size={18} />
        </button>
        {phase === 'low' ? (
          <button className="btn btn--primary btn--lg btn--grow" disabled={low === null} onClick={toHigh}>
            <Check size={20} /> That's my lowest
          </button>
        ) : (
          <button className="btn btn--primary btn--lg btn--grow" disabled={high === null || high === low} onClick={finish}>
            <Check size={20} /> That's my highest
          </button>
        )}
      </div>
    </div>
  );
}
