import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Briefcase, Heart, Mic2, Music, PartyPopper, Users } from 'lucide-react';
import { classifyVoice, midiToName, nameToMidi, octavesBetween } from '../audio/notes';
import { pitchEngine } from '../audio/pitchEngine';
import { sfx } from '../audio/synth';
import { Mascot, type Mood } from '../components/Mascot';
import { MicGate } from '../components/MicGate';
import { Piano } from '../components/Piano';
import { RangeFinder } from '../components/RangeFinder';
import { TuningMeter } from '../components/TuningMeter';
import { celebrate } from '../components/confetti';
import { useGame, type GoalId } from '../game/store';
import { hasInvite } from '../cloud/account';
import './Onboarding.css';

export const GOALS: { id: GoalId; label: string; blurb: string; icon: typeof Heart }[] = [
  { id: 'fun', label: 'Just for fun', blurb: 'Sing in the shower, sing in the car', icon: PartyPopper },
  { id: 'confidence', label: 'Build confidence', blurb: 'Stop holding back at karaoke', icon: Heart },
  { id: 'song', label: 'Nail a song', blurb: 'There is one song you want to own', icon: Music },
  { id: 'choir', label: 'Choir or band', blurb: 'Sing with other people', icon: Users },
  { id: 'career', label: 'Go pro', blurb: 'Auditions, gigs, the big stage', icon: Briefcase },
];

export const PACES = [
  { minutes: 3, label: 'Casual', blurb: '3 min a day' },
  { minutes: 5, label: 'Regular', blurb: '5 min a day' },
  { minutes: 10, label: 'Serious', blurb: '10 min a day' },
  { minutes: 15, label: 'Intense', blurb: '15 min a day' },
];

const MANUAL = [
  { label: 'Low voice', blurb: 'Bass / baritone', low: nameToMidi('F2'), high: nameToMidi('E4') },
  { label: 'Middle voice', blurb: 'Tenor / alto', low: nameToMidi('C3'), high: nameToMidi('C5') },
  { label: 'High voice', blurb: 'Mezzo / soprano', low: nameToMidi('G3'), high: nameToMidi('A5') },
];

type Step = 'hello' | 'goal' | 'pace' | 'mic' | 'range' | 'reveal';
const ORDER: Step[] = ['hello', 'goal', 'pace', 'mic', 'range', 'reveal'];

export function Onboarding() {
  const nav = useNavigate();
  const complete = useGame((s) => s.completeOnboarding);
  const setRange = useGame((s) => s.setRange);
  const [step, setStep] = useState<Step>('hello');
  const [name, setName] = useState(useGame.getState().name);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [pace, setPace] = useState<number | null>(null);
  const [range, setLocalRange] = useState<{ low: number; high: number } | null>(null);
  const [manual, setManual] = useState(false);

  const idx = ORDER.indexOf(step);
  const next = () => {
    sfx('pop');
    setStep(ORDER[idx + 1]);
  };
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);

  const gotRange = (low: number, high: number) => {
    setLocalRange({ low, high });
    setStep('reveal');
  };

  const finish = () => {
    complete({ name: name || 'Singer', goal: goal ?? 'fun', dailyMinutes: pace ?? 5 });
    if (range) setRange(range.low, range.high);
    // Arrived through a friend's invite link? Take them to it.
    nav(hasInvite() ? '/friends' : '/home', { replace: true });
  };

  const mood: Mood = step === 'hello' ? 'cheer' : step === 'mic' ? 'listen' : 'idle';

  return (
    <div className="onb">
      <div className="ambient" aria-hidden="true" />
      <header className="onb__top">
        <button className="icon-btn" onClick={back} disabled={idx === 0} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="bar onb__progress" role="progressbar" aria-valuenow={idx + 1} aria-valuemin={1} aria-valuemax={ORDER.length}>
          <span style={{ width: `${((idx + 1) / ORDER.length) * 100}%` }} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          className="onb__body"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 'hello' && (
            <div className="onb__center">
              <Mascot mood={mood} size={190} />
              <h1 className="onb__title">Hi! I'm Pip.</h1>
              <p className="dim onb__lede">I'll be your vocal coach. A couple of quick questions and then we'll find your voice together.</p>
              <label className="onb__label" htmlFor="name">
                What should I call you?
              </label>
              <input
                id="name"
                className="field"
                placeholder="Your first name"
                value={name}
                maxLength={24}
                autoComplete="given-name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && next()}
                autoFocus
              />
              <button className="btn btn--primary btn--lg btn--block" disabled={!name.trim()} onClick={next}>
                Nice to meet you <ArrowRight size={20} />
              </button>
            </div>
          )}

          {step === 'goal' && (
            <div className="onb__stack">
              <Bubble mood="idle" text={`Why do you want to sing, ${name.trim()}?`} />
              <div className="onb__choices" role="radiogroup">
                {GOALS.map((g) => (
                  <button key={g.id} className="choice" role="radio" aria-checked={goal === g.id} onClick={() => setGoal(g.id)}>
                    <span className="tile-icon">
                      <g.icon size={22} />
                    </span>
                    <span>
                      <strong>{g.label}</strong>
                      <span className="mute onb__sub">{g.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn btn--primary btn--lg btn--block" disabled={!goal} onClick={next}>
                Continue
              </button>
            </div>
          )}

          {step === 'pace' && (
            <div className="onb__stack">
              <Bubble mood="idle" text="How much time can you give your voice each day?" />
              <div className="onb__choices" role="radiogroup">
                {PACES.map((p) => (
                  <button key={p.minutes} className="choice" role="radio" aria-checked={pace === p.minutes} onClick={() => setPace(p.minutes)}>
                    <span className="onb__pace">{p.minutes}</span>
                    <span>
                      <strong>{p.label}</strong>
                      <span className="mute onb__sub">{p.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mute onb__note">Little and often beats long and rare. You can change this any time.</p>
              <button className="btn btn--primary btn--lg btn--block" disabled={!pace} onClick={next}>
                Continue
              </button>
            </div>
          )}

          {step === 'mic' && (
            <div className="onb__stack">
              <MicGate purpose="so I can hear your voice and find your range">
                <MicCheck onReady={next} />
              </MicGate>
            </div>
          )}

          {step === 'range' && (
            <div className="onb__wide">
              {!manual ? (
                <>
                  <h2 className="onb__h2">Let's find your range</h2>
                  <MicGate>
                    <RangeFinder onDone={gotRange} />
                  </MicGate>
                  <button className="btn btn--ghost btn--sm onb__skip" onClick={() => setManual(true)}>
                    Not now, I'll pick my voice
                  </button>
                </>
              ) : (
                <div className="onb__stack">
                  <Bubble mood="idle" text="No problem! Which sounds most like you? You can test properly later." />
                  <div className="onb__choices">
                    {MANUAL.map((m) => (
                      <button key={m.label} className="choice" onClick={() => gotRange(m.low, m.high)}>
                        <Mic2 size={22} />
                        <span>
                          <strong>{m.label}</strong>
                          <span className="mute onb__sub">{m.blurb}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'reveal' && range && <Reveal name={name} range={range} onFinish={finish} />}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Bubble({ mood, text }: { mood: Mood; text: string }) {
  return (
    <div className="onb__bubble">
      <Mascot mood={mood} size={96} />
      <p className="onb__say">{text}</p>
    </div>
  );
}

function MicCheck({ onReady }: { onReady: () => void }) {
  const [heard, setHeard] = useState(0);
  useEffect(() => {
    let voiced = 0;
    let last: number | null = null;
    return pitchEngine.onFrame((f) => {
      const dt = last === null ? 0 : Math.min(0.1, f.t - last);
      last = f.t;
      if (f.midi !== null) voiced += dt;
      const v = Math.min(1, voiced / 1.2);
      // Returning the previous value lets React skip most re-renders.
      setHeard((prev) => (v - prev > 0.04 || (v === 1 && prev !== 1) ? v : prev));
    });
  }, []);
  const ok = heard >= 1;
  useEffect(() => {
    if (ok) sfx('success');
  }, [ok]);
  return (
    <div className="onb__center">
      <Mascot mood={ok ? 'cheer' : 'listen'} size={150} />
      <h2 className="onb__h2">{ok ? 'I can hear you!' : "Sing a long 'ahh'"}</h2>
      <p className="dim">{ok ? 'Your mic is working perfectly.' : 'Any note is fine. Watch the note name light up.'}</p>
      <div className="card onb__miccard">
        <TuningMeter />
        <div className="bar bar--teal">
          <span style={{ width: `${heard * 100}%` }} />
        </div>
      </div>
      <button className={`btn ${ok ? 'btn--primary' : 'btn--ghost'} btn--lg btn--block`} onClick={onReady}>
        {ok ? 'Find my range' : 'Skip mic check'} <ArrowRight size={20} />
      </button>
    </div>
  );
}

function Reveal({ name, range, onFinish }: { name: string; range: { low: number; high: number }; onFinish: () => void }) {
  const voice = classifyVoice(range.low, range.high);
  const oct = octavesBetween(range.low, range.high);
  useEffect(() => {
    sfx('levelup');
    celebrate('big');
  }, []);
  return (
    <div className="onb__center">
      <Mascot mood="cheer" size={170} />
      <p className="eyebrow">{name.trim()}, your voice is</p>
      <h1 className="onb__title onb__voice">{voice}</h1>
      <p className="dim">
        {midiToName(range.low)} to {midiToName(range.high)} · {oct.toFixed(1)} octaves. Every lesson will be pitched just for you.
      </p>
      <div className="card onb__piano">
        <Piano low={range.low} high={range.high} />
      </div>
      <button className="btn btn--primary btn--lg btn--block" onClick={onFinish}>
        Start my singing path <ArrowRight size={20} />
      </button>
    </div>
  );
}
