import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Volume2 } from 'lucide-react';
import { pitchEngine } from '../../audio/pitchEngine';
import { centsFromFolded, homeNote, midiToName } from '../../audio/notes';
import { framePrecision } from '../../audio/scoring';
import { playNote, sfx } from '../../audio/synth';
import { PitchRoll } from '../../components/PitchRoll';
import { TuningMeter } from '../../components/TuningMeter';
import { MicGate } from '../../components/MicGate';
import { Logo } from '../../components/Logo';
import { CoachCard, HoldMeter, Stage } from '../../exercises/Stage';
import { viewFor } from '../../exercises/common';
import { DEFAULT_RANGE, effectiveRange, useGame } from '../../game/store';
import type { Mood } from '../../components/Mascot';
import './FreeSing.css';

// Pitch playground: pick any note, sing on the gold line, collect sparkles
// for every 3-second hold. Also the no-signup "try it" page.

const HOLD = 3;

export function FreeSing({ guest = false }: { guest?: boolean }) {
  const nav = useNavigate();
  const game = useGame();
  const range = guest ? DEFAULT_RANGE : effectiveRange(game);
  const record = useGame((s) => s.recordActivity);
  const [target, setTarget] = useState(() => homeNote(range.low, range.high));
  const [progress, setProgress] = useState(0);
  const [sparkles, setSparkles] = useState(0);
  const [live, setLive] = useState<'idle' | 'on' | 'flat' | 'sharp'>('idle');
  const [listening, setListening] = useState(true);
  const precisions = useRef<number[]>([]);
  const targetRef = useRef(target);
  targetRef.current = target;
  const listeningRef = useRef(listening);
  listeningRef.current = listening;
  const view = viewFor([target], 5);

  useEffect(() => {
    let onTime = 0;
    let last: number | null = null;
    let lastUi = 0;
    return pitchEngine.onFrame((f) => {
      const dt = last === null ? 0 : Math.min(0.1, f.t - last);
      last = f.t;
      if (!listeningRef.current) return;
      let state: typeof live = 'idle';
      if (f.midi !== null) {
        const c = centsFromFolded(f.midi, targetRef.current);
        precisions.current.push(framePrecision(c));
        state = Math.abs(c) <= 50 ? 'on' : c < 0 ? 'flat' : 'sharp';
        if (state === 'on') onTime += dt;
        else onTime = Math.max(0, onTime - dt * 0.5);
      } else {
        onTime = Math.max(0, onTime - dt * 0.25);
      }
      if (onTime >= HOLD) {
        onTime = 0;
        sfx('gem');
        setSparkles((n) => n + 1);
      }
      if (f.t - lastUi > 0.1) {
        lastUi = f.t;
        setProgress(onTime / HOLD);
        setLive(state);
      }
    });
  }, []);

  // Pausing keeps the mic session (so the permission flow doesn't reappear) but ignores input.
  const toggleListening = () => {
    setListening(!listening);
    setLive('idle');
  };

  const finish = () => {
    if (!guest && sparkles > 0) {
      const p = precisions.current;
      const prec = Math.round((p.reduce((a, b) => a + b, 0) / (p.length || 1)) * 100);
      record({ kind: 'free', label: 'Pitch playground', accuracy: prec, precision: prec, sustain: Math.min(100, sparkles * 20) });
    }
    nav(guest ? '/' : '/practice');
  };

  const { mood, message } = coach(live, sparkles);

  return (
    <div className="freesing">
      <header className="freesing__top">
        {guest ? <Logo /> : <span />}
        <button className="btn btn--ghost btn--sm" onClick={finish}>
          <ArrowLeft size={16} /> {guest ? 'Back' : sparkles > 0 ? 'Finish & save' : 'Back'}
        </button>
      </header>
      <p className="eyebrow">Pitch playground</p>
      <h1 className="freesing__title">Sing on the gold line</h1>
      <MicGate purpose="so you can see your voice draw a line in real time">
        <Stage
          roll={
            <PitchRoll low={view.low} high={view.high} hold={target} windowSec={6} live={listening}>
              <span className="roll__chip">Target {midiToName(target)}</span>
            </PitchRoll>
          }
          side={
            <>
              <CoachCard mood={mood} message={message} coachInput={live !== 'on'}>
                <TuningMeter target={target} />
              </CoachCard>
              <HoldMeter label={`Hold it for ${HOLD} seconds`} value={progress} sparkles={sparkles} />
              <div className="stage-controls">
                <button className="btn btn--icon" aria-label="Lower target" onClick={() => setTarget((t) => t - 1)}>
                  <Minus size={18} />
                </button>
                <button className="btn btn--gold btn--grow" onClick={() => playNote(target, 1.2)}>
                  <Volume2 size={18} /> Hear {midiToName(target)}
                </button>
                <button className="btn btn--icon" aria-label="Raise target" onClick={() => setTarget((t) => t + 1)}>
                  <Plus size={18} />
                </button>
              </div>
              <label className="freesing__toggle">
                <input type="checkbox" checked={!listening} onChange={toggleListening} /> Stop listening
              </label>
            </>
          }
        />
      </MicGate>
      {guest && (
        <div className="card freesing__cta">
          <div>
            <h3>Like what you hear?</h3>
            <p className="dim">Get a full singing path pitched to your voice, with streaks, XP and a weekly league.</p>
          </div>
          <Link to="/onboarding" className="btn btn--primary">
            Start my path
          </Link>
        </div>
      )}
    </div>
  );
}

function coach(live: 'idle' | 'on' | 'flat' | 'sharp', sparkles: number): { mood: Mood; message: string } {
  if (live === 'on') return { mood: 'cheer', message: sparkles ? 'Yes! Hold it for another sparkle.' : 'Right on it! Keep holding...' };
  if (live === 'flat') return { mood: 'listen', message: 'A touch low. Lift it up to the gold.' };
  if (live === 'sharp') return { mood: 'listen', message: 'A little high. Ease it down.' };
  return { mood: 'idle', message: "Whenever you're ready, sing an 'ahh' on the gold line." };
}
