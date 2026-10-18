import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Flag, Gamepad2, Heart, Play } from 'lucide-react';
import type { Score } from '../../audio/scoring';
import { sfx } from '../../audio/synth';
import { MelodyExercise } from '../../exercises/MelodyExercise';
import { MicGate } from '../../components/MicGate';
import { Mascot } from '../../components/Mascot';
import { Results } from '../../components/Results';
import { celebrate } from '../../components/confetti';
import { effectiveRange, useGame, type Reward } from '../../game/store';
import { DrillFrame } from './DrillFrame';

// "Echo": Pip plays a short tune, you sing it back. Each level adds notes,
// widens the jumps and nudges the tempo. Three hearts per run; a run always
// pays XP, so a tough level never costs you anything you'd earned.

const LIVES = 3;

export interface LevelSpec {
  length: number;
  maxStep: number;
  beat: number;
}

export function levelSpec(level: number): LevelSpec {
  return {
    length: Math.min(7, 2 + Math.floor((level - 1) / 2)),
    maxStep: Math.min(7, 2 + Math.floor(level / 2)),
    beat: Math.max(0.55, 1 - level * 0.04),
  };
}

/** A singable random walk: starts at home, stays within a comfy window. */
export function makeTune(level: number, rand = Math.random): number[] {
  const { length, maxStep } = levelSpec(level);
  const steps = [1, 2, 3, 4, 5, 7].filter((s) => s <= maxStep);
  const out = [0];
  while (out.length < length) {
    const prev = out[out.length - 1];
    const size = steps[Math.floor(rand() * steps.length)];
    let dir = rand() < 0.5 ? -1 : 1;
    if (prev + size * dir > 7 || prev + size * dir < -5) dir = -dir;
    out.push(prev + size * dir);
  }
  return out;
}

export function PitchGame() {
  const nav = useNavigate();
  const range = effectiveRange(useGame());
  const record = useGame((s) => s.recordActivity);
  const best = useGame((s) => s.gameBest);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flash, setFlash] = useState<'pass' | 'fail' | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [result, setResult] = useState<{ reward: Reward; cleared: number; acc: number; prec: number; sus: number } | null>(null);
  const tune = useMemo(() => makeTune(level), [level, round]);
  const spec = levelSpec(level);

  const endRun = (all: Score[], cleared: number) => {
    const avg = (k: 'accuracy' | 'precision' | 'sustain') => (all.length ? Math.round(all.reduce((a, s) => a + s[k], 0) / all.length) : 0);
    const reward = record({ kind: 'game', label: `Echo · level ${cleared}`, accuracy: avg('accuracy'), precision: avg('precision'), sustain: avg('sustain'), gameLevel: cleared });
    setPlaying(false);
    setResult({ reward, cleared, acc: avg('accuracy'), prec: avg('precision'), sus: avg('sustain') });
  };

  const onScore = (score: Score) => {
    const all = [...scores, score];
    setScores(all);
    const hits = score.notes.filter((n) => n.hit).length;
    const passed = hits >= Math.ceil(score.notes.length * 0.7) && score.precision >= 50;
    setFlash(passed ? 'pass' : 'fail');
    if (passed) {
      sfx('levelup');
      celebrate('small');
    } else sfx('soft');
    setTimeout(() => {
      setFlash(null);
      if (passed) {
        setLevel(level + 1);
        setRound((r) => r + 1);
      } else if (lives - 1 <= 0) {
        endRun(all, level - 1);
      } else {
        setLives(lives - 1);
        setRound((r) => r + 1);
      }
    }, 1500);
  };

  if (result) {
    return (
      <Results title="Echo: pitch game" accuracy={result.acc} precision={result.prec} sustain={result.sus} reward={result.reward} onContinue={() => nav('/practice')}>
        <p className="chip">
          <Gamepad2 size={14} /> Cleared {result.cleared} {result.cleared === 1 ? 'level' : 'levels'} · best ever {Math.max(best, result.cleared)}
        </p>
      </Results>
    );
  }

  const hud = (
    <div className="drill__hud">
      <span className="hearts" aria-label={`${lives} hearts left`}>
        {Array.from({ length: LIVES }, (_, i) => (
          <Heart key={i} size={20} fill={i < lives ? 'currentColor' : 'none'} data-empty={i >= lives} />
        ))}
      </span>
    </div>
  );

  return (
    <DrillFrame eyebrow="Echo · pitch game" title={playing ? `Level ${level}` : 'Sing it back'} aside={playing ? hud : undefined}>
      {!playing ? (
        <div className="drill__setup" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Mascot mood="sing" size={160} />
          <p className="dim" style={{ fontSize: '1.1rem' }}>
            I'll sing a little tune. You echo it back. Land most of the notes to clear the level. Each level gets longer and jumpier. You have three hearts.
          </p>
          {best > 0 && <p className="chip">Your best: level {best}</p>}
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={() => {
              setLevel(1);
              setLives(LIVES);
              setScores([]);
              setPlaying(true);
            }}
          >
            <Play size={20} /> Start game
          </button>
        </div>
      ) : (
        <>
          <p className="mute" style={{ fontWeight: 700 }}>
            {spec.length} notes · jumps up to {spec.maxStep} semitones · {Math.round(60 / spec.beat)} bpm
          </p>
          <MicGate>
            <MelodyExercise
              key={round}
              step={{ kind: 'melody', title: `Level ${level}`, prompt: 'Echo the tune.', offsets: tune, beat: spec.beat }}
              range={range}
              onComplete={flash ? () => undefined : onScore}
            />
          </MicGate>
          <button className="btn btn--ghost btn--sm" style={{ alignSelf: 'center' }} onClick={() => endRun(scores, level - 1)}>
            <Flag size={16} /> End run
          </button>
          <AnimatePresence>
            {flash && (
              <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="modal__card card" initial={{ scale: 0.7 }} animate={{ scale: 1 }} style={{ alignItems: 'center', textAlign: 'center' }}>
                  <Mascot mood={flash === 'pass' ? 'cheer' : 'encourage'} size={130} />
                  <h2 className="h2">{flash === 'pass' ? `Level ${level} cleared!` : lives - 1 > 0 ? 'So close!' : 'Great run!'}</h2>
                  <p className="dim">{flash === 'pass' ? 'Next one is a bit trickier...' : lives - 1 > 0 ? 'Shake it off. New tune coming up.' : "Let's see how you did."}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </DrillFrame>
  );
}
