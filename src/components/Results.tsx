import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Flame, Gem, Zap } from 'lucide-react';
import { grade } from '../audio/scoring';
import { sfx } from '../audio/synth';
import type { Reward } from '../game/store';
import { Mascot } from './Mascot';
import { CountUp } from './CountUp';
import { celebrate } from './confetti';
import './Results.css';

interface Props {
  title: string;
  accuracy: number;
  precision: number;
  sustain: number;
  reward: Reward;
  onContinue: () => void;
  /** Labels for the two sub-scores (e.g. "Hold" for breath work). */
  labels?: [string, string];
  /** Hide the two sub-score bars (e.g. for quizzes, where they'd repeat the headline). */
  hideSubs?: boolean;
  children?: ReactNode;
}

const CHEERS: Record<ReturnType<typeof grade>['tier'], string[]> = {
  perfect: ['You absolutely nailed that.', 'Pitch perfect! I got goosebumps.', 'That was a performance!'],
  great: ['Really strong singing today.', 'Your ear is getting sharp!', 'So close to perfect. Love it.'],
  good: ['Solid work. It gets easier every day.', 'Nice! Your voice is warming up.', 'Good stuff. Keep that momentum.'],
  'keep-going': ['Showing up is the hard part, and you did it.', 'Every note trains your ear. Proud of you.', 'Tough one! You will crush it next time.'],
};

export function Results({ title, accuracy, precision, sustain, reward, onContinue, labels = ['Precision', 'Sustain'], hideSubs = false, children }: Props) {
  const g = grade(accuracy);
  const cheer = CHEERS[g.tier][accuracy % 3];
  const streakUp = reward.streakAfter > reward.streakBefore;

  useEffect(() => {
    sfx(g.tier === 'perfect' ? 'levelup' : 'success');
    if (g.tier === 'perfect' || g.tier === 'great') celebrate(g.tier === 'perfect' ? 'big' : 'small');
    if (streakUp) setTimeout(() => sfx('streak'), 1300);
    if (reward.gems) setTimeout(() => sfx('gem'), 1700);
  }, []);

  const ring = 2 * Math.PI * 54;
  return (
    <div className="results column">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Mascot mood={g.tier === 'keep-going' ? 'encourage' : 'cheer'} size={150} />
      </motion.div>
      <p className="eyebrow">{title}</p>
      <h1 className="results__title">{g.label}</h1>
      <p className="dim results__cheer">{cheer}</p>

      <div className="results__score">
        <svg viewBox="0 0 120 120" className="results__ring" aria-hidden="true">
          <circle cx="60" cy="60" r="54" className="results__ring-track" />
          <motion.circle
            cx="60"
            cy="60"
            r="54"
            className="results__ring-fill"
            strokeDasharray={ring}
            initial={{ strokeDashoffset: ring }}
            animate={{ strokeDashoffset: ring * (1 - accuracy / 100) }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </svg>
        <div className="results__pct">
          <CountUp to={accuracy} suffix="%" delay={200} duration={1100} />
          <span>accuracy</span>
        </div>
      </div>

      {!hideSubs && (
      <div className="results__subs">
        <div>
          <span className="mute">{labels[0]}</span>
          <div className="bar bar--teal">
            <span style={{ width: `${precision}%` }} />
          </div>
          <strong className="num">{precision}%</strong>
        </div>
        <div>
          <span className="mute">{labels[1]}</span>
          <div className="bar bar--gold">
            <span style={{ width: `${sustain}%` }} />
          </div>
          <strong className="num">{sustain}%</strong>
        </div>
      </div>
      )}

      <div className="results__rewards">
        <motion.div className="reward reward--xp" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Zap size={22} />
          <strong>
            <CountUp to={reward.xp.total} prefix="+" delay={600} sound />
          </strong>
          <span>XP</span>
        </motion.div>
        <motion.div
          className={`reward reward--streak ${streakUp ? 'reward--bump' : ''}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.75 }}
        >
          <Flame size={22} />
          <strong className="num">{reward.streakAfter}</strong>
          <span>{streakUp ? 'day streak!' : 'day streak'}</span>
        </motion.div>
        <motion.div className="reward reward--gems" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }}>
          <Gem size={22} />
          <strong className="num">+{reward.gems}</strong>
          <span>gems</span>
        </motion.div>
      </div>

      <ul className="results__breakdown">
        <li>
          <span>Finished</span>
          <span className="num">+{reward.xp.base}</span>
        </li>
        <li>
          <span>Accuracy bonus</span>
          <span className="num">+{reward.xp.accuracyBonus}</span>
        </li>
        {reward.xp.perfectBonus > 0 && (
          <li className="results__perfect">
            <span>Perfect run!</span>
            <span className="num">+{reward.xp.perfectBonus}</span>
          </li>
        )}
        {reward.xp.total < reward.xp.base + reward.xp.accuracyBonus + reward.xp.perfectBonus && (
          <li>
            <span>Replay rate</span>
            <span className="num">{reward.xp.total} total</span>
          </li>
        )}
      </ul>

      {children}

      <button className="btn btn--primary btn--lg btn--block" onClick={onContinue} autoFocus>
        Continue <ArrowRight size={20} />
      </button>
    </div>
  );
}
