import { Link } from 'react-router-dom';
import { AudioWaveform, Flame, Gem, Map, Mic, Music2, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { Mascot } from '../components/Mascot';
import { useGame } from '../game/store';
import './Landing.css';

const BARS = [40, 55, 70, 62, 48, 44, 30, 22, 50, 66, 92];

export function Landing() {
  const onboarded = useGame((s) => s.onboarded);
  return (
    <div className="landing">
      <div className="ambient" aria-hidden="true" />
      <header className="landing__top">
        <Logo />
        <Link to={onboarded ? '/home' : '/onboarding'} className="btn btn--ghost btn--sm">
          {onboarded ? 'Open app' : 'Get started'}
        </Link>
      </header>

      <section className="landing__hero staff-bg">
        <div className="landing__copy">
          <span className="chip">
            <Flame size={14} className="landing__chipicon" /> Five minutes a day. Real singing.
          </span>
          <h1 className="landing__title">
            Find your voice.
            <br />
            <span className="italic-accent">Then belt it.</span>
          </h1>
          <p className="landing__lede dim">
            Bite-sized singing lessons that listen back. Pip, your pocket vocal coach, hears every note and cheers every win.
          </p>
          <div className="landing__ctas">
            <Link to={onboarded ? '/home' : '/onboarding'} className="btn btn--primary btn--lg">
              <Mic size={20} /> Let's sing
            </Link>
            <Link to="/try" className="btn btn--lg">
              <Music2 size={20} /> Try the pitch tracker
            </Link>
          </div>
        </div>

        <motion.div
          className="landing__card"
          initial={{ rotate: 0, y: 30, opacity: 0 }}
          animate={{ rotate: 3, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
        >
          <div className="spread">
            <span className="landing__streak">
              <Flame size={16} /> 12 day streak
            </span>
            <span className="landing__gems">
              <Gem size={16} /> 340
            </span>
          </div>
          <Mascot mood="cheer" size={180} />
          <p className="landing__cardtitle">Perfect pitch run!</p>
          <p className="mute landing__cardsub">96% precision on the C major scale</p>
          <div className="landing__bars" aria-hidden="true">
            {BARS.map((h, i) => (
              <span key={i} style={{ height: `${h}%`, animationDelay: `${0.4 + i * 0.05}s` }} className={i === BARS.length - 1 ? 'is-gold' : ''} />
            ))}
          </div>
          <span className="landing__xp">
            <Trophy size={16} /> +25 XP
          </span>
        </motion.div>
      </section>

      <section className="landing__features">
        <article className="card">
          <span className="tile-icon">
            <AudioWaveform size={24} />
          </span>
          <h3>Hears every note</h3>
          <p className="dim">Live pitch tracking, right in your browser. See your voice draw a line in real time.</p>
        </article>
        <article className="card">
          <span className="tile-icon tile-icon--gold">
            <Map size={24} />
          </span>
          <h3>A path, not a textbook</h3>
          <p className="dim">Breath, pitch, range, tone. Five-minute lessons that unlock like levels.</p>
        </article>
        <article className="card">
          <span className="tile-icon tile-icon--pink">
            <Flame size={24} />
          </span>
          <h3>Streaks that stick</h3>
          <p className="dim">Earn XP and gems, protect your streak, climb the weekly league.</p>
        </article>
      </section>

      <footer className="landing__foot mute">Your voice never leaves your device. Pitch detection runs entirely in your browser.</footer>
    </div>
  );
}
