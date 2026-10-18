import type { ActivityEntry, GameState, LessonRecord, RangeSnapshot } from '../game/store';

// Combine progress saved on this device with progress saved in the cloud.
//
// The usual cases are simple: a brand-new device takes the cloud copy, and a
// first sign-in uploads the local copy. When both have real progress (the
// same account used on two devices offline), we merge item by item so no
// lesson, badge or day of practice is lost.

type Progress = Partial<GameState>;

const isFresh = (p: Progress) => !p.onboarded && !(p.xp ?? 0);

function unionBy<T>(a: T[] = [], b: T[] = [], key: (x: T) => string): T[] {
  const map = new Map<string, T>();
  for (const x of [...a, ...b]) if (!map.has(key(x))) map.set(key(x), x);
  return [...map.values()];
}

export function mergeProgress(local: Progress, remote: Progress | null): Progress {
  if (!remote || isFresh(remote)) return local;
  if (isFresh(local)) return { ...remote };

  // Name, goals and preferences follow the device in your hand.
  const base = local;
  // Streak state comes from whichever side sang most recently.
  const recent = (local.lastActive ?? '') >= (remote.lastActive ?? '') ? local : remote;

  const xpByDay: Record<string, number> = { ...remote.xpByDay };
  for (const [d, xp] of Object.entries(local.xpByDay ?? {})) xpByDay[d] = Math.max(xp, xpByDay[d] ?? 0);

  const lessons: Record<string, LessonRecord> = { ...remote.lessons };
  for (const [id, l] of Object.entries(local.lessons ?? {})) {
    const r = lessons[id];
    lessons[id] = r
      ? { completedAt: Math.min(l.completedAt, r.completedAt), best: Math.max(l.best, r.best), plays: Math.max(l.plays, r.plays) }
      : l;
  }

  const badges: Record<string, number> = { ...remote.badges };
  for (const [id, at] of Object.entries(local.badges ?? {})) badges[id] = Math.min(at, badges[id] ?? at);

  const activity = unionBy<ActivityEntry>(local.activity, remote.activity, (a) => `${a.at}:${a.kind}`)
    .sort((a, b) => a.at - b.at)
    .slice(-500);

  const rangeHistory = unionBy<RangeSnapshot>(local.rangeHistory, remote.rangeHistory, (r) => r.day).sort((a, b) =>
    a.day.localeCompare(b.day),
  );
  const latestRange = rangeHistory[rangeHistory.length - 1];

  const sumXp = Object.values(xpByDay).reduce((a, b) => a + b, 0);

  return {
    ...base,
    onboarded: !!(local.onboarded || remote.onboarded),
    createdAt: Math.min(local.createdAt ?? Date.now(), remote.createdAt ?? Date.now()),
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0, sumXp),
    xpByDay,
    gems: Math.max(local.gems ?? 0, remote.gems ?? 0),
    freezes: Math.max(local.freezes ?? 0, remote.freezes ?? 0),
    streak: recent.streak ?? 0,
    lastActive: recent.lastActive ?? null,
    frozenDays: [...new Set([...(local.frozenDays ?? []), ...(remote.frozenDays ?? [])])].sort(),
    lostStreak: recent.lostStreak ?? 0,
    longestStreak: Math.max(local.longestStreak ?? 0, remote.longestStreak ?? 0),
    lessons,
    badges,
    chests: { ...remote.chests, ...local.chests },
    activity,
    rangeHistory,
    range: latestRange ? { low: latestRange.low, high: latestRange.high } : (local.range ?? remote.range ?? null),
    gameBest: Math.max(local.gameBest ?? 0, remote.gameBest ?? 0),
    ownedAccents: [...new Set([...(local.ownedAccents ?? []), ...(remote.ownedAccents ?? [])])],
    questsClaimed: { ...remote.questsClaimed, ...local.questsClaimed },
  };
}
