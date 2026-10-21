import type { ReactNode } from 'react';
import { Mascot, type Mood } from '../components/Mascot';
import { HINT_COPY, type InputHint } from '../audio/pitchEngine';
import { useInputHint } from '../hooks/useMic';
import './Stage.css';

// The singing stage: a big roll on the left, Pip and the live readouts on the right.

interface StageProps {
  roll: ReactNode;
  side: ReactNode;
  footer?: ReactNode;
}

export function Stage({ roll, side, footer }: StageProps) {
  return (
    <div className="stage">
      <div className="stage__roll">{roll}</div>
      <div className="stage__side">{side}</div>
      {footer && <div className="stage__footer">{footer}</div>}
    </div>
  );
}

interface CoachProps {
  mood: Mood;
  message: string;
  /** Listen for input-quality problems and let Pip coach them. */
  coachInput?: boolean;
  /** Input problems that make no sense for this exercise (e.g. 'unsteady' while ad-libbing). */
  ignoreHints?: InputHint[];
  children?: ReactNode;
}

export function CoachCard({ mood, message, coachInput = false, ignoreHints = [], children }: CoachProps) {
  const raw = useInputHint(coachInput);
  const hint: InputHint = ignoreHints.includes(raw) ? 'ok' : raw;
  const text = coachInput && hint !== 'ok' ? HINT_COPY[hint] : message;
  const shownMood: Mood = coachInput && hint !== 'ok' ? 'encourage' : mood;
  return (
    <div className="coach card">
      <Mascot mood={shownMood} size={110} />
      <p className="coach__msg" aria-live="polite">
        {text}
      </p>
      {children}
    </div>
  );
}

export function HoldMeter({ label, value, sparkles }: { label: string; value: number; sparkles?: number }) {
  return (
    <div className="holdmeter card card--tight">
      <div className="spread">
        <strong>{label}</strong>
        {sparkles !== undefined && <span className="holdmeter__sparkles num">✦ {sparkles}</span>}
      </div>
      <div className="bar bar--gold">
        <span style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}
