import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AudioLines, Check, Flame, Gem, Map, Pencil, Play, RefreshCw, Snowflake, Sunrise, Target, Timer, Users, X } from 'lucide-react';
import { midiToName, octavesBetween } from '../audio/notes';
import { sfx } from '../audio/synth';
import { Mascot } from '../components/Mascot';
import { Piano } from '../components/Piano';
import { ICONS } from '../components/icons';
import { findLesson } from '../content/curriculum';
import { dayKey, timeOfDayGreeting, weekDays, weekStart } from '../game/dates';
import { questsFor } from '../game/quests';
import { dailyXpGoal, effectiveRange, nextLessonId, todayActivity, useGame, voiceTypeOf } from '../game/store';
import { GOALS, PACES } from './Onboarding';
import './Home.css';

export function Home() {
  const s = useGame();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const today = dayKey();
  const voice = voiceTypeOf(s);
  const range = effectiveRange(s);
  const nextId = nextLessonId(s.lessons);
  const next = nextId ? findLesson(nextId) : null;
  const xpToday = s.xpByDay[today] ?? 0;
  const goalXp = dailyXpGoal(s.dailyMinutes);
  const goal = GOALS.find((g) => g.id === s.goal) ?? GOALS[0];

  const greeting = useMemo(() => {
    const hi = `${timeOfDayGreeting()}, ${s.name || 'friend'}!`;
    if (s.lostStreak > 0) return `${hi} Your ${s.lostStreak}-day streak took a nap. Let's start a fresh one today.`;
    if (s.lastActive === today) return `${hi} You've already sung today. Want to go for a bonus round?`;
    if (s.streak > 0) return `${hi} Keep your ${s.streak}-day streak alive with one quick lesson.`;
    return `${hi} Your ${voice ? voice.toLowerCase() : ''} voice is warmed up and waiting.`.replace('  ', ' ');
  }, [s.name, s.lostStreak, s.lastActive, s.streak, today, voice]);

  return (
    <div className="home">
      <section className="home__greet">
        <Mascot mood={s.lostStreak ? 'encourage' : s.lastActive === today ? 'cheer' : 'idle'} size={120} />
        <p className="home__bubble">
          {greeting}
          {s.lostStreak > 0 && (
            <button className="icon-btn home__bubble-x" onClick={s.acknowledgeLostStreak} aria-label="Dismiss">
              <X size={16} />
            </button>
          )}
        </p>
      </section>

      <div className="home__grid">
        <section className="card home__voice">
          <div className="spread">
            <div>
              <p className="eyebrow">Your voice</p>
              <h2 className="home__voicetype">{voice ?? 'Not measured yet'}</h2>
              <p className="mute home__voicemeta">
                {s.range
                  ? `${midiToName(range.low)} to ${midiToName(range.high)} · ${octavesBetween(range.low, range.high).toFixed(1)} octaves`
                  : 'Lessons use a middle range until you take the test.'}
              </p>
            </div>
            <Link to="/practice/range" className="btn btn--sm">
              <RefreshCw size={16} /> {s.range ? 'Retest range' : 'Find my range'}
            </Link>
          </div>
          <Piano low={range.low} high={range.high} />
        </section>

        <section className="card card--accent home__next">
          <p className="eyebrow home__next-eyebrow">Up next</p>
          {next ? (
            <>
              <h2 className="home__next-title">{next.lesson.title}</h2>
              <p className="home__next-meta">
                {next.unit.title} · lesson {next.index + 1} of {next.unit.lessons.length} · {next.lesson.minutes} min
              </p>
            </>
          ) : (
            <>
              <h2 className="home__next-title">Path complete!</h2>
              <p className="home__next-meta">Replay any lesson or keep sharp in Practice.</p>
            </>
          )}
          <div className="home__next-actions">
            {next && (
              <button className="btn btn--gold" onClick={() => nav(`/lesson/${next.lesson.id}`)}>
                <Play size={18} /> Start lesson
              </button>
            )}
            <Link to="/path" className="btn home__ink-btn">
              <Map size={18} /> Open path
            </Link>
            <Link to="/practice/free" className="btn home__ink-btn">
              <AudioLines size={18} /> Free sing
            </Link>
          </div>
        </section>

        <section className="card home__daily">
          <div className="spread">
            <p className="eyebrow">Today</p>
            <span className="mute home__small">{xpToday >= goalXp ? 'Goal smashed!' : `${goalXp - xpToday} XP to go`}</span>
          </div>
          <div className="home__goalrow">
            <GoalRing value={xpToday} goal={goalXp} />
            <WeekStrip />
          </div>
          <Link to="/practice/warmup" className="btn btn--block">
            <Sunrise size={18} /> 2-minute warm-up
          </Link>
        </section>

        <Quests />

        <section className="card home__goals">
          <div className="spread">
            <p className="eyebrow">Goals</p>
            <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit goals">
              <Pencil size={18} />
            </button>
          </div>
          <p className="home__goal">
            <Target size={20} className="home__goal-icon" /> {goal.label}
          </p>
          <p className="home__goal">
            <Timer size={20} className="home__goal-icon home__goal-icon--teal" /> {s.dailyMinutes} minutes a day
          </p>
          <Link to="/friends" className="home__goal">
            <Users size={20} className="home__goal-icon home__goal-icon--gold" />{' '}
            {s.friendCount ? `${s.friendCount} ${s.friendCount === 1 ? 'friend' : 'friends'} singing with you` : 'Add friends to sing with'}
          </Link>
        </section>
      </div>

      {editing && <GoalsEditor onClose={() => setEditing(false)} />}
    </div>
  );
}

function GoalRing({ value, goal }: { value: number; goal: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const k = Math.min(1, value / goal);
  return (
    <div className="goalring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="goalring__track" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          className={`goalring__fill ${k >= 1 ? 'is-done' : ''}`}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - k) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="goalring__label">
        <strong className="num">{value}</strong>
        <span className="num">/ {goal} XP</span>
      </div>
    </div>
  );
}

function WeekStrip() {
  const xpByDay = useGame((s) => s.xpByDay);
  const frozen = useGame((s) => s.frozenDays);
  const today = dayKey();
  const days = weekDays(weekStart(today));
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <ol className="weekstrip" aria-label="This week">
      {days.map((d, i) => {
        const sang = (xpByDay[d] ?? 0) > 0;
        const ice = frozen.includes(d);
        const state = sang ? 'sang' : ice ? 'frozen' : d === today ? 'today' : d < today ? 'missed' : 'future';
        return (
          <li key={d} data-state={state} aria-label={`${d}: ${state}`}>
            <span className="weekstrip__dot">{sang ? <Flame size={16} /> : ice ? <Snowflake size={14} /> : null}</span>
            <span className="weekstrip__day">{labels[i]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Quests() {
  const activity = useGame((s) => s.activity);
  const xpByDay = useGame((s) => s.xpByDay);
  const claimed = useGame((s) => s.questsClaimed);
  const claim = useGame((s) => s.claimQuest);
  const today = dayKey();
  const quests = questsFor(today);
  const done = todayActivity(activity, today);
  const xp = xpByDay[today] ?? 0;
  const claimedToday = claimed[today] ?? [];
  return (
    <section className="card home__quests">
      <div className="spread">
        <p className="eyebrow">Daily quests</p>
        <span className="mute home__small">Resets at midnight</span>
      </div>
      <ul className="quests">
        {quests.map((q) => {
          const Icon = ICONS[q.icon] ?? Target;
          const p = Math.min(q.target, q.progress(done, xp));
          const complete = p >= q.target;
          const isClaimed = claimedToday.includes(q.id);
          return (
            <li key={q.id} className="quest" data-done={complete}>
              <span className="tile-icon tile-icon--gold quest__icon">
                <Icon size={20} />
              </span>
              <div className="quest__body">
                <strong>{q.title}</strong>
                <div className="bar bar--gold">
                  <span style={{ width: `${(p / q.target) * 100}%` }} />
                </div>
              </div>
              {isClaimed ? (
                <span className="quest__claimed" aria-label="Claimed">
                  <Check size={20} />
                </span>
              ) : complete ? (
                <button
                  className="btn btn--teal btn--sm"
                  onClick={() => {
                    sfx('gem');
                    claim(q.id, q.gems);
                  }}
                >
                  <Gem size={16} /> {q.gems}
                </button>
              ) : (
                <span className="quest__reward num">
                  <Gem size={14} /> {q.gems}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GoalsEditor({ onClose }: { onClose: () => void }) {
  const s = useGame();
  const [goal, setGoal] = useState(s.goal);
  const [pace, setPace] = useState(s.dailyMinutes);
  const [name, setName] = useState(s.name);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Edit goals" onClick={onClose}>
      <div className="modal__card card" onClick={(e) => e.stopPropagation()}>
        <div className="spread">
          <h2 className="h3">Your goals</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <label className="onb__label" htmlFor="ename">
          Name
        </label>
        <input id="ename" className="field" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        <p className="onb__label">Why you sing</p>
        <div className="modal__chips">
          {GOALS.map((g) => (
            <button key={g.id} className="choice modal__chip" aria-pressed={goal === g.id} onClick={() => setGoal(g.id)}>
              <g.icon size={18} /> {g.label}
            </button>
          ))}
        </div>
        <p className="onb__label">Daily practice</p>
        <div className="modal__chips">
          {PACES.map((p) => (
            <button key={p.minutes} className="choice modal__chip" aria-pressed={pace === p.minutes} onClick={() => setPace(p.minutes)}>
              {p.blurb}
            </button>
          ))}
        </div>
        <button
          className="btn btn--primary btn--block"
          onClick={() => {
            s.updateGoals({ goal, dailyMinutes: pace, name });
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
