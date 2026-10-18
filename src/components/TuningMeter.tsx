import { useEffect, useRef } from 'react';
import { pitchEngine } from '../audio/pitchEngine';
import { centsFromFolded, midiToName } from '../audio/notes';
import './TuningMeter.css';

// Big note readout plus a flat/sharp needle. Updated straight from the pitch
// engine at frame rate via refs, so it feels as live as the roll.

interface Props {
  /** Measure against this note. Without it, measure against the nearest note. */
  target?: number | null;
  /** Cents shown as the gold "on it" zone. */
  tolerance?: number;
}

export function TuningMeter({ target = null, tolerance = 50 }: Props) {
  const noteRef = useRef<HTMLDivElement>(null);
  const centsRef = useRef<HTMLSpanElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let shown = '';
    return pitchEngine.onFrame((f) => {
      const root = rootRef.current;
      if (!root || !noteRef.current || !centsRef.current || !needleRef.current) return;
      if (f.midi === null) {
        root.dataset.state = 'idle';
        if (shown !== '--') noteRef.current.textContent = shown = '--';
        centsRef.current.textContent = '--';
        needleRef.current.style.transform = 'translateX(-50%)';
        return;
      }
      const tgt = targetRef.current;
      const cents = tgt === null ? (f.midi - Math.round(f.midi)) * 100 : centsFromFolded(f.midi, tgt);
      const clamped = Math.max(-100, Math.min(100, cents));
      const name = midiToName(f.midi);
      if (name !== shown) noteRef.current.textContent = shown = name;
      centsRef.current.textContent = `${cents > 0 ? '+' : ''}${Math.round(cents)}¢`;
      needleRef.current.style.transform = `translateX(calc(-50% + ${(clamped / 100) * 50}cqw))`;
      root.dataset.state = Math.abs(cents) <= tolerance ? 'on' : cents < 0 ? 'flat' : 'sharp';
    });
  }, [tolerance]);

  const zone = Math.min(100, (tolerance / 100) * 50);
  return (
    <div className="tuner" ref={rootRef} data-state="idle" aria-live="off">
      <div className="tuner__note num" ref={noteRef}>
        --
      </div>
      <div className="tuner__track">
        <div className="tuner__zone" style={{ width: `${zone * 2}%` }} />
        <div className="tuner__needle" ref={needleRef} />
      </div>
      <div className="tuner__labels">
        <span>Flat</span>
        <span className="num" ref={centsRef}>
          --
        </span>
        <span>Sharp</span>
      </div>
    </div>
  );
}
