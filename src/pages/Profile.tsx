import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Gem, Lock, LogIn, LogOut, Monitor, Moon, Snowflake, Star, Sun, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { midiToName } from '../audio/notes';
import { BADGES } from '../game/badges';
import { addDays, dayKey, parseDay, weekStart } from '../game/dates';
import { levelFromXp } from '../game/levels';
import { useGame, voiceTypeOf, type ThemePref } from '../game/store';
import { signOut, useAccount } from '../cloud/account';
import { ALL_LESSONS } from '../content/curriculum';
import { BarChart, LineChart, RangeChart } from '../components/charts';
import { ICONS } from '../components/icons';
import { Mascot } from '../components/Mascot';
import './Profile.css';

const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => parseDay(d).toLocaleDateString(undefined, opts);

export function Profile() {
  const s = useGame();
  const lvl = levelFromXp(s.xp);
  const voice = voiceTypeOf(s);
  const today = dayKey();
  const lessonsDone = Object.keys(s.lessons).length;
  const graded = s.activity.filter((a) => a.kind !== 'range');
  const bestAcc = Math.max(0, ...graded.map((a) => a.accuracy));

  // XP per day, last 14 days.
  const xpDays = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => ({
    label: fmt(d, { weekday: 'short', month: 'short', day: 'numeric' }),
    tick: fmt(d, { day: 'numeric' }),
    value: s.xpByDay[d] ?? 0,
  }));

  // Last 20 graded sessions.
  const recent = graded.slice(-20);
  const sessionLabels = recent.map((a) => `${a.label} · ${fmt(a.day, { month: 'short', day: 'numeric' })}`);

  return (
    <div className="profile">
      <header className="profile__head card">
        <div className="profile__avatar">
          <Mascot mood="cheer" size={110} still />
          <span className="profile__lvl num">{lvl.level}</span>
        </div>
        <div className="profile__who">
          <h1 className="profile__name">{s.name || 'Singer'}</h1>
          <p className="dim">
            {voice ?? 'Voice not measured'} · singing since {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
          <div className="profile__lvlbar">
            <div className="bar">
              <span style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
            </div>
            <span className="mute num">
              {lvl.into}/{lvl.needed} XP to level {lvl.level + 1}
            </span>
          </div>
        </div>
      </header>

      <section className="profile__stats">
        <Stat icon={<Flame />} tone="accent" value={s.streak} label="Day streak" sub={`Longest ${s.longestStreak}`} />
        <Stat icon={<Zap />} tone="gold" value={s.xp} label="Total XP" />
        <Stat icon={<Star />} tone="teal" value={`${lessonsDone}/${ALL_LESSONS.length}`} label="Lessons" />
        <Stat icon={<Trophy />} tone="violet" value={bestAcc ? `${bestAcc}%` : '--'} label="Best accuracy" />
        <Stat icon={<Snowflake />} tone="ice" value={s.freezes} label="Streak freezes" sub={<Link to="/shop">Get more</Link>} />
        <Stat icon={<Gem />} tone="teal" value={s.gems} label="Gems" sub={<Link to="/shop">Shop</Link>} />
      </section>

      <div className="profile__grid">
        <section className="card profile__card">
          <h2 className="h3">Streak calendar</h2>
          <StreakCalendar />
        </section>

        <section className="card profile__card">
          <h2 className="h3">XP, last 14 days</h2>
          <BarChart data={xpDays} unit="XP" title="XP earned per day over the last 14 days" />
        </section>

        <section className="card profile__card profile__wide">
          <h2 className="h3">Accuracy trend</h2>
          {recent.length >= 2 ? (
            <LineChart
              labels={sessionLabels}
              title="Precision and sustain over your last sessions"
              series={[
                { name: 'Precision', color: 'var(--series-1)', values: recent.map((a) => a.precision) },
                { name: 'Sustain', color: 'var(--series-2)', values: recent.map((a) => a.sustain) },
              ]}
            />
          ) : (
            <Empty text="Finish a couple of lessons or drills and your accuracy trend shows up here." />
          )}
        </section>

        <section className="card profile__card profile__wide">
          <div className="spread">
            <h2 className="h3">Vocal range over time</h2>
            <Link to="/practice/range" className="btn btn--sm">
              Retest
            </Link>
          </div>
          {s.rangeHistory.length ? (
            <RangeChart
              title="Your measured range on each test date"
              rows={s.rangeHistory.slice(-6).map((r, i, arr) => ({
                name: fmt(r.day, { month: 'short', day: 'numeric' }) + (i === arr.length - 1 ? ' (latest)' : ''),
                low: r.low,
                high: r.high,
                highlight: i === arr.length - 1,
              }))}
            />
          ) : (
            <Empty text="Take the range test to start tracking how your range grows." />
          )}
          {s.range && (
            <p className="mute profile__note">
              Currently {midiToName(s.range.low)} to {midiToName(s.range.high)}.
            </p>
          )}
        </section>

        <section className="card profile__card profile__wide">
          <h2 className="h3">
            Badges <span className="mute num">{Object.keys(s.badges).length}/{BADGES.length}</span>
          </h2>
          <ul className="badges">
            {BADGES.map((b) => {
              const Icon = ICONS[b.icon];
              const earned = s.badges[b.id];
              return (
                <li key={b.id} className={`badge ${earned ? 'is-earned' : ''}`} title={b.blurb}>
                  <span className={`badge__icon badge__icon--${b.color}`}>{earned ? <Icon size={26} /> : <Lock size={22} />}</span>
                  <strong>{b.name}</strong>
                  <span className="mute">{earned ? new Date(earned).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : b.blurb}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <Settings />
      </div>
    </div>
  );
}

function Stat({ icon, tone, value, label, sub }: { icon: React.ReactNode; tone: string; value: React.ReactNode; label: string; sub?: React.ReactNode }) {
  return (
    <div className="stat card card--tight">
      <span className={`stat__icon stat__icon--${tone}`}>{icon}</span>
      <div>
        <strong className="stat__value num">{value}</strong>
        <span className="stat__label">{label}</span>
        {sub && <span className="stat__sub">{sub}</span>}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="profile__empty">
      <Mascot mood="sleep" size={80} still />
      <p className="mute">{text}</p>
    </div>
  );
}

function StreakCalendar() {
  const xpByDay = useGame((s) => s.xpByDay);
  const frozen = useGame((s) => s.frozenDays);
  const today = dayKey();
  const start = addDays(weekStart(today), -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const max = Math.max(30, ...Object.values(xpByDay));
  const level = (xp: number) => (xp <= 0 ? 0 : xp < max * 0.25 ? 1 : xp < max * 0.5 ? 2 : xp < max * 0.75 ? 3 : 4);
  return (
    <div className="cal">
      <div className="cal__grid" role="grid" aria-label="Practice calendar, last 12 weeks">
        {weeks.map((week, wi) => (
          <div key={wi} className="cal__col" role="row">
            {week.map((d) => {
              const xp = xpByDay[d] ?? 0;
              const ice = frozen.includes(d);
              const future = d > today;
              const label = `${fmt(d, { weekday: 'short', month: 'short', day: 'numeric' })}: ${ice ? 'streak freeze used' : `${xp} XP`}`;
              return (
                <span
                  key={d}
                  role="gridcell"
                  className={`cal__cell ${d === today ? 'is-today' : ''} ${future ? 'is-future' : ''}`}
                  data-level={ice ? 'ice' : level(xp)}
                  title={future ? undefined : label}
                  aria-label={future ? undefined : label}
                >
                  {ice && <Snowflake size={10} />}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="cal__legend mute">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="cal__cell" data-level={l} />
        ))}
        <span>More</span>
        <span className="cal__cell" data-level="ice">
          <Snowflake size={10} />
        </span>
        <span>Freeze</span>
      </div>
    </div>
  );
}

function Settings() {
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const sound = useGame((s) => s.sound);
  const setSound = useGame((s) => s.setSound);
  const reset = useGame((s) => s.resetAll);
  const [confirm, setConfirm] = useState(false);
  const account = useAccount((s) => s.status);
  const themes: { id: ThemePref; label: string; icon: typeof Sun }[] = [
    { id: 'system', label: 'Auto', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];
  return (
    <section className="card profile__card profile__wide settings">
      <h2 className="h3">Settings</h2>
      <AccountRow />
      <div className="settings__row">
        <span>Appearance</span>
        <div className="seg" role="radiogroup" aria-label="Appearance">
          {themes.map((t) => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings__row">
        <span>Sound effects</span>
        <button className="btn btn--sm" onClick={() => setSound(!sound)} aria-pressed={sound}>
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />} {sound ? 'On' : 'Off'}
        </button>
      </div>
      <div className="settings__row">
        <span>Accent colour</span>
        <Link to="/shop" className="btn btn--sm">
          Change in shop
        </Link>
      </div>
      <div className="settings__row">
        <span>Legal</span>
        <span className="row">
          <Link to="/privacy" className="btn btn--sm btn--ghost">
            Privacy
          </Link>
          <Link to="/terms" className="btn btn--sm btn--ghost">
            Terms
          </Link>
        </span>
      </div>
      <div className="settings__row">
        <span>Reset all progress</span>
        {confirm ? (
          <span className="row">
            <button className="btn btn--sm btn--ghost" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn btn--sm btn--primary"
              onClick={() => {
                reset();
                location.assign('/');
              }}
            >
              Yes, reset
            </button>
          </span>
        ) : (
          <button className="btn btn--sm btn--ghost" onClick={() => setConfirm(true)}>
            Reset
          </button>
        )}
      </div>
      <p className="mute profile__note">
        Progress is saved on this device{account === 'signed-in' ? ' and backed up to your account' : ''}. Pitch detection runs entirely in your browser; no audio ever leaves it.
      </p>
    </section>
  );
}

function AccountRow() {
  const status = useAccount((s) => s.status);
  const email = useAccount((s) => s.user?.email);
  if (status === 'disabled') return null;
  return (
    <div className="settings__row">
      <span>
        Account
        <span className="mute settings__sub">{status === 'signed-in' ? `Signed in as ${email ?? 'you'}` : 'Back up progress and add friends'}</span>
      </span>
      {status === 'signed-in' ? (
        <button className="btn btn--sm btn--ghost" onClick={() => void signOut()}>
          <LogOut size={16} /> Sign out
        </button>
      ) : (
        <Link to="/friends" className="btn btn--sm btn--primary">
          <LogIn size={16} /> Sign in
        </Link>
      )}
    </div>
  );
}
