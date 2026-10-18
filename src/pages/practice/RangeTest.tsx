import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, TrendingUp, Zap } from 'lucide-react';
import { classifyVoice, midiToName, octavesBetween, REFERENCE_SINGERS } from '../../audio/notes';
import { sfx } from '../../audio/synth';
import { MicGate } from '../../components/MicGate';
import { Mascot } from '../../components/Mascot';
import { Piano } from '../../components/Piano';
import { RangeChart } from '../../components/charts';
import { RangeFinder } from '../../components/RangeFinder';
import { celebrate } from '../../components/confetti';
import { useGame } from '../../game/store';
import { DrillFrame } from './DrillFrame';

export function RangeTest() {
  const nav = useNavigate();
  const before = useGame((s) => s.range);
  const setRange = useGame((s) => s.setRange);
  const record = useGame((s) => s.recordActivity);
  const [result, setResult] = useState<{ low: number; high: number; xp: number } | null>(null);
  const [run, setRun] = useState(0);

  const done = (low: number, high: number) => {
    setRange(low, high);
    const r = record({ kind: 'range', label: 'Vocal range test', accuracy: 0, precision: 0, sustain: 0 });
    setResult({ low, high, xp: r.xp.total });
    celebrate('small');
    sfx('success');
  };

  if (result) {
    const voice = classifyVoice(result.low, result.high);
    const span = result.high - result.low;
    const grew = before ? span - (before.high - before.low) : 0;
    const rows = [{ name: 'You', low: result.low, high: result.high, highlight: true }, ...REFERENCE_SINGERS];
    return (
      <DrillFrame eyebrow="Vocal range test" title="Your range">
        <div className="grid-2">
          <section className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
            <Mascot mood="cheer" size={130} />
            <p className="eyebrow">You sing like a</p>
            <h2 className="h1" style={{ color: 'var(--accent)' }}>
              {voice}
            </h2>
            <p className="dim">
              {midiToName(result.low)} to {midiToName(result.high)} · {octavesBetween(result.low, result.high).toFixed(1)} octaves ({span} semitones)
            </p>
            {grew > 0 && (
              <p className="chip">
                <TrendingUp size={14} /> {grew} more semitones than last time!
              </p>
            )}
            <p className="chip">
              <Zap size={14} /> +{result.xp} XP
            </p>
            <Piano low={result.low} high={result.high} />
          </section>
          <section className="card stack">
            <h3>You vs. the greats</h3>
            <p className="mute" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Famous singers' ranges are their full career extremes. Yours will grow with practice.
            </p>
            <RangeChart rows={rows} title="Your range compared with famous singers" />
          </section>
        </div>
        <div className="stage-controls">
          <button className="btn btn--ghost" onClick={() => (setResult(null), setRun(run + 1))}>
            <RotateCcw size={18} /> Test again
          </button>
          <button className="btn btn--primary btn--grow" onClick={() => nav('/practice')}>
            Done
          </button>
        </div>
      </DrillFrame>
    );
  }

  return (
    <DrillFrame eyebrow="Vocal range test" title="How low, how high?">
      <MicGate purpose="so I can find your lowest and highest notes">
        <RangeFinder key={run} onDone={done} />
      </MicGate>
    </DrillFrame>
  );
}
