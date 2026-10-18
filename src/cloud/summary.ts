import { classifyVoice } from '../audio/notes';
import { addDays, dayKey, daysBetween, weekStart } from '../game/dates';
import { levelFromXp } from '../game/levels';
import { weekXp, type GameState } from '../game/store';
import type { FriendRow, ProfileSummary } from './types';

// Pure helpers for the Friends screen: what we publish, and how we rank.

export function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

type SummarySource = Pick<
  GameState,
  'name' | 'xp' | 'xpByDay' | 'streak' | 'longestStreak' | 'lastActive' | 'lessons' | 'activity' | 'range'
>;

export function buildSummary(s: SummarySource, userId: string, now = new Date()): ProfileSummary {
  const today = dayKey(now);
  const week = weekStart(today);
  const graded = s.activity.filter((a) => a.kind !== 'range');
  return {
    displayName: (s.name || 'Singer').slice(0, 24),
    avatarHue: hueFor(userId),
    xp: s.xp,
    level: levelFromXp(s.xp).level,
    streak: liveStreak(s.streak, s.lastActive, today),
    longestStreak: s.longestStreak,
    weekId: week,
    weekXp: weekXp(s.xpByDay, week),
    lessonsCompleted: Object.keys(s.lessons).length,
    bestAccuracy: Math.min(100, Math.max(0, ...graded.map((a) => a.accuracy))),
    voiceType: s.range ? classifyVoice(s.range.low, s.range.high) : null,
    lastActive: s.lastActive,
  };
}

/** A streak only counts if the singer sang today or yesterday. */
export function liveStreak(streak: number, lastActive: string | null, today = dayKey()): number {
  if (!lastActive) return 0;
  return lastActive >= addDays(today, -1) ? streak : 0;
}

export type BoardMode = 'week' | 'all';

export interface RankedRow extends FriendRow {
  rank: number;
  score: number;
}

/** You and your friends, ranked by week or all-time XP. Ties share a rank. */
export function rankBoard(rows: FriendRow[], mode: BoardMode): RankedRow[] {
  const score = (r: FriendRow) => (mode === 'week' ? r.weekXp : r.xp) ?? 0;
  const sorted = rows
    .filter((r) => r.relation === 'self' || r.relation === 'friend')
    .map((r) => ({ ...r, score: score(r) }))
    .sort((a, b) => b.score - a.score || (a.relation === 'self' ? -1 : b.relation === 'self' ? 1 : a.name.localeCompare(b.name)));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.score !== sorted[i - 1].score) rank = i + 1;
    return { ...r, rank };
  });
}

/** "today", "yesterday", "3 days ago", or "a while ago". */
export function lastSeen(lastActive: string | null, today = dayKey()): string {
  if (!lastActive) return 'not yet';
  const d = daysBetween(lastActive, today);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  return 'a while ago';
}

/** Turn whatever a friend typed or pasted (a code or an invite link) into a code. */
export function parseFriendCode(input: string): string {
  const fromLink = /\/add\/([A-Za-z0-9-]+)/.exec(input);
  return (fromLink ? fromLink[1] : input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}
