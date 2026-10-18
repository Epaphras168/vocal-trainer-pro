import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGame } from '../game/store';
import { BADGES } from '../game/badges';
import { sfx } from '../audio/synth';
import { Mascot } from './Mascot';
import { ICONS } from './icons';
import { celebrate } from './confetti';
import './Celebrations.css';

// Global moments: level-up takeovers and badge toasts, fed by the store's queue.

export function Celebrations() {
  const queue = useGame((s) => s.celebrations);
  const dismiss = useGame((s) => s.dismissCelebration);
  const level = queue.find((c) => c.type === 'level');
  const badge = !level ? queue.find((c) => c.type === 'badge') : undefined;

  useEffect(() => {
    if (!level) return;
    sfx('levelup');
    celebrate('big');
  }, [level]);

  useEffect(() => {
    if (!badge) return;
    sfx('gem');
    const t = setTimeout(() => dismiss(badge.id), 3800);
    return () => clearTimeout(t);
  }, [badge, dismiss]);

  const b = badge && badge.type === 'badge' ? BADGES.find((x) => x.id === badge.badgeId) : undefined;
  const BadgeIcon = b ? ICONS[b.icon] : null;

  return (
    <>
      <AnimatePresence>
        {level && level.type === 'level' && (
          <motion.div className="levelup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Level up">
            <motion.div
              className="levelup__card"
              initial={{ scale: 0.5, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            >
              <Mascot mood="cheer" size={170} />
              <p className="eyebrow">Level up!</p>
              <div className="levelup__num">{level.level}</div>
              <p className="dim">Your voice just levelled up. Pip is doing a happy dance.</p>
              <button className="btn btn--primary btn--lg btn--block" onClick={() => dismiss(level.id)} autoFocus>
                Keep singing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {b && badge && BadgeIcon && (
          <motion.button
            key={badge.id}
            className="toast"
            onClick={() => dismiss(badge.id)}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <span className={`tile-icon ${b.color === 'accent' ? '' : `tile-icon--${b.color}`}`}>
              <BadgeIcon size={22} />
            </span>
            <span className="toast__text">
              <span className="eyebrow">Badge unlocked</span>
              <strong>{b.name}</strong>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
