import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeProgress } from './merge';
import { buildSummary, lastSeen, liveStreak, parseFriendCode, rankBoard } from './summary';
import type { FriendRow } from './types';
import type { ActivityEntry, GameState } from '../game/store';

const row = (id: string, relation: FriendRow['relation'], xp: number, weekXp: number, name = id): FriendRow => ({
  id,
  name,
  hue: 0,
  relation,
  xp,
  level: 1,
  streak: 0,
  longestStreak: 0,
  weekXp,
  lessonsCompleted: 0,
  bestAccuracy: 0,
  voiceType: null,
  lastActive: null,
});

describe('rankBoard', () => {
  const rows = [row('me', 'self', 300, 50, 'Epa'), row('a', 'friend', 900, 20), row('b', 'friend', 100, 50), row('c', 'incoming', 0, 0)];

  it('ranks by weekly XP with shared ranks for ties, you first on a tie', () => {
    const r = rankBoard(rows, 'week');
    expect(r.map((x) => x.id)).toEqual(['me', 'b', 'a']);
    expect(r.map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it('ranks by all-time XP and leaves out pending requests', () => {
    const r = rankBoard(rows, 'all');
    expect(r.map((x) => x.id)).toEqual(['a', 'me', 'b']);
    expect(r.find((x) => x.id === 'c')).toBeUndefined();
  });
});

describe('summary helpers', () => {
  it('only counts a streak that is still alive', () => {
    expect(liveStreak(5, '2026-10-18', '2026-10-18')).toBe(5);
    expect(liveStreak(5, '2026-10-17', '2026-10-18')).toBe(5);
    expect(liveStreak(5, '2026-10-15', '2026-10-18')).toBe(0);
    expect(liveStreak(5, null, '2026-10-18')).toBe(0);
  });

  it('describes when someone last sang', () => {
    expect(lastSeen('2026-10-18', '2026-10-18')).toBe('today');
    expect(lastSeen('2026-10-17', '2026-10-18')).toBe('yesterday');
    expect(lastSeen('2026-10-12', '2026-10-18')).toBe('6 days ago');
    expect(lastSeen(null)).toBe('not yet');
  });

  it('reads codes from typed codes and pasted invite links', () => {
    expect(parseFriendCode(' k7q2-mx ')).toBe('K7Q2MX');
    expect(parseFriendCode('https://belto.app/add/K7Q2MX')).toBe('K7Q2MX');
  });

  afterEach(() => vi.useRealTimers());

  it('publishes this week\'s XP, level and best accuracy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 12));
    const activity: ActivityEntry[] = [
      { at: 1, day: '2026-10-18', kind: 'lesson', label: 'x', accuracy: 88, precision: 80, sustain: 80, xp: 30 },
      { at: 2, day: '2026-10-18', kind: 'range', label: 'x', accuracy: 0, precision: 0, sustain: 0, xp: 8 },
    ];
    const s = buildSummary(
      {
        name: 'Epa',
        xp: 400,
        xpByDay: { '2026-10-18': 38, '2026-10-11': 362 },
        streak: 2,
        longestStreak: 4,
        lastActive: '2026-10-18',
        lessons: { a: { completedAt: 1, best: 88, plays: 1 } },
        activity,
        range: { low: 43, high: 64 },
      },
      'user-1',
    );
    expect(s).toMatchObject({ displayName: 'Epa', level: 4, weekId: '2026-10-12', weekXp: 38, bestAccuracy: 88, lessonsCompleted: 1, voiceType: 'Bass', streak: 2 });
  });
});

describe('mergeProgress', () => {
  const base: Partial<GameState> = { onboarded: true, createdAt: 100, name: 'Epa', xp: 0, xpByDay: {}, lessons: {}, badges: {}, activity: [], rangeHistory: [] };

  it('takes the cloud copy on a fresh device', () => {
    const remote = { ...base, xp: 500, name: 'Cloud Epa' };
    expect(mergeProgress({ onboarded: false, xp: 0 }, remote)).toEqual(remote);
  });

  it('keeps local progress when the cloud has nothing', () => {
    const local = { ...base, xp: 120 };
    expect(mergeProgress(local, null)).toBe(local);
    expect(mergeProgress(local, { onboarded: false, xp: 0 })).toBe(local);
  });

  it('combines two devices without losing lessons, badges or days', () => {
    const local: Partial<GameState> = {
      ...base,
      xp: 60,
      xpByDay: { '2026-10-17': 60 },
      lessons: { 'breath-1': { completedAt: 5, best: 70, plays: 1 } },
      badges: { 'first-note': 5 },
      lastActive: '2026-10-17',
      streak: 1,
      gems: 30,
    };
    const remote: Partial<GameState> = {
      ...base,
      xp: 90,
      xpByDay: { '2026-10-17': 40, '2026-10-18': 50 },
      lessons: { 'breath-1': { completedAt: 3, best: 92, plays: 2 }, 'breath-2': { completedAt: 9, best: 80, plays: 1 } },
      badges: { perfect: 9 },
      lastActive: '2026-10-18',
      streak: 2,
      longestStreak: 2,
      gems: 45,
    };
    const m = mergeProgress(local, remote);
    expect(m.xpByDay).toEqual({ '2026-10-17': 60, '2026-10-18': 50 });
    expect(m.xp).toBe(110);
    expect(m.lessons?.['breath-1']).toEqual({ completedAt: 3, best: 92, plays: 2 });
    expect(Object.keys(m.lessons ?? {})).toHaveLength(2);
    expect(Object.keys(m.badges ?? {}).sort()).toEqual(['first-note', 'perfect']);
    expect(m.streak).toBe(2);
    expect(m.lastActive).toBe('2026-10-18');
    expect(m.gems).toBe(45);
    expect(m.name).toBe('Epa');
  });
});
