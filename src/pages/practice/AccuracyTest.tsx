import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Score } from '../../audio/scoring';
import { MelodyExercise } from '../../exercises/MelodyExercise';
import { MicGate } from '../../components/MicGate';
import { Results } from '../../components/Results';
import { effectiveRange, useGame, type Reward } from '../../game/store';
import { DrillFrame } from './DrillFrame';

// Sing a scale against a metronome; get Precision (how close) and Sustain
// (how steady) scores, with the live line drawn against the targets.

const SCALES = [
  { id: 'five', label: 'Five-note scale', offsets: [0, 2, 4, 5, 7, 5, 4, 2, 0] },
  { id: 'major', label: 'Major octave', offsets: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: 'arpeggio', label: 'Arpeggio', offsets: [0, 4, 7, 12, 7, 4, 0] },
];

const TEMPOS = [
  { bpm: 60, label: 'Slow' },
  { bpm: 80, label: 'Medium' },
  { bpm: 100, label: 'Brisk' },
];

export function AccuracyTest() {
  const nav = useNavigate();
  const range = effectiveRange(useGame());
  const record = useGame((s) => s.recordActivity);
  const [scale, setScale] = useState(SCALES[0]);
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: Score; reward: Reward } | null>(null);

  const finish = (score: Score) => {
    const reward = record({ kind: 'accuracy', label: `${scale.label} @ ${bpm} bpm`, accuracy: score.accuracy, precision: score.precision, sustain: score.sustain });
    setRunning(false);
    setResult({ score, reward });
  };

  if (result) {
    const hits = result.score.notes.filter((n) => n.hit).length;
    return (
      <Results
        title="Pitch accuracy test"
        accuracy={result.score.accuracy}
        precision={result.score.precision}
        sustain={result.score.sustain}
        reward={result.reward}
        onContinue={() => nav('/practice')}
      >
        <p className="chip">
          {hits} of {result.score.notes.length} notes on pitch
        </p>
        <button className="btn btn--ghost btn--block" onClick={() => setResult(null)}>
          Test again
        </button>
      </Results>
    );
  }

  return (
    <DrillFrame eyebrow="Pitch accuracy test" title="Sing the scale">
      {!running ? (
        <div className="drill__setup">
          <p className="dim">
            Pick a pattern and a tempo. You'll hear it once, get a quick count-in, then sing along to the metronome. We measure <strong>Precision</strong>{' '}
            (how close you land) and <strong>Sustain</strong> (how steadily you hold each note).
          </p>
          <p className="onb__label">Pattern</p>
          <div className="drill__options">
            {SCALES.map((s) => (
              <button key={s.id} className="choice" aria-pressed={scale.id === s.id} onClick={() => setScale(s)}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="onb__label">Tempo</p>
          <div className="drill__options">
            {TEMPOS.map((t) => (
              <button key={t.bpm} className="choice" aria-pressed={bpm === t.bpm} onClick={() => setBpm(t.bpm)}>
                {t.label} · {t.bpm} bpm
              </button>
            ))}
          </div>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => setRunning(true)}>
            <Play size={20} /> Start test
          </button>
        </div>
      ) : (
        <MicGate>
          <MelodyExercise
            step={{ kind: 'melody', title: scale.label, prompt: 'Sing each note on the beat.', offsets: scale.offsets, beat: 60 / bpm }}
            range={range}
            metronome
            onComplete={finish}
          />
        </MicGate>
      )}
    </DrillFrame>
  );
}
