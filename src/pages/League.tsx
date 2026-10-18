import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react';
import { addDays, dayKey, parseDay, weekProgress, weekStart } from '../game/dates';
import { COHORT_SIZE, DEMOTE, PROMOTE, standings, TIERS } from '../game/league';
import { useGame, weekXp } from '../game/store';
import { Mascot } from '../components/Mascot';
import './League.css';

function timeLeft(now: Date): string {
  const end = parseDay(addDays(weekStart(dayKey(now)), 7));
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h left`;
}

export function League() {
  const name = useGame((s) => s.name);
  const tierIdx = useGame((s) => s.leagueTier);
  const weekId = useGame((s) => s.leagueWeek);
  const xpByDay = useGame((s) => s.xpByDay);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const tier = TIERS[tierIdx];
  const myXp = weekXp(xpByDay, weekId);
  const table = standings(weekId, tierIdx, name, myXp, weekProgress(now));
  const me = table.find((r) => r.isYou)!;
  const canPromote = tierIdx < TIERS.length - 1;
  const canDemote = tierIdx > 0;
  const zone = (rank: number) =>
    canPromote && rank <= PROMOTE ? 'up' : canDemote && rank > COHORT_SIZE - DEMOTE ? 'down' : 'safe';
  const gap = me.rank > PROMOTE ? table[PROMOTE - 1].xp - me.xp + 1 : 0;

  return (
    <div className="league">
      <header className="league__head card">
        <div className="league__ladder" aria-label="League tiers">
          {TIERS.map((t, i) => (
            <span key={t.id} className={`crest ${i === tierIdx ? 'is-current' : i < tierIdx ? 'is-past' : ''}`} style={{ ['--crest' as string]: t.color }} title={t.name}>
              <Shield size={i === tierIdx ? 34 : 22} />
            </span>
          ))}
        </div>
        <h1 className="league__title">{tier.name} league</h1>
        <p className="dim league__sub">
          <Clock size={16} /> {timeLeft(now)} · top {PROMOTE} move up{canDemote ? `, bottom ${DEMOTE} move down` : ''}
        </p>
        <p className="league__callout">
          {myXp === 0
            ? 'Finish a lesson to join this week\'s league!'
            : me.rank <= PROMOTE && canPromote
              ? `You're in the promotion zone at #${me.rank}. Hold on to it!`
              : gap > 0
                ? `${gap} XP to break into the top ${PROMOTE}.`
                : `You're #${me.rank} this week.`}
        </p>
      </header>

      <ol className="standings">
        {table.map((row, i) => {
          const z = zone(row.rank);
          const prev = i > 0 ? zone(table[i - 1].rank) : null;
          return (
            <li key={row.id} className={`standing standing--${z} ${row.isYou ? 'is-you' : ''}`}>
              {z === 'safe' && prev === 'up' && (
                <span className="standing__divider standing__divider--up">
                  <ChevronUp size={14} /> Promotion zone
                </span>
              )}
              {z === 'down' && prev !== 'down' && (
                <span className="standing__divider standing__divider--down">
                  <ChevronDown size={14} /> Demotion zone
                </span>
              )}
              <span className="standing__rank num">{row.rank}</span>
              {row.isYou ? (
                <span className="standing__avatar standing__avatar--you">
                  <Mascot size={40} still title="" />
                </span>
              ) : (
                <span className="standing__avatar" style={{ background: `hsl(${row.hue} 60% 55%)` }}>
                  {row.name[0]}
                </span>
              )}
              <span className="standing__name">{row.isYou ? `${row.name} (you)` : row.name}</span>
              <span className="standing__xp num">{row.xp} XP</span>
            </li>
          );
        })}
      </ol>
      <p className="mute league__fine">
        Your league-mates are practice buddies generated on this device, since Belto keeps everything local. Their XP grows through the week, so keep singing!
      </p>
    </div>
  );
}
