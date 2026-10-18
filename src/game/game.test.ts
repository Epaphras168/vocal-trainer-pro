import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levelFromXp, xpFor } from './levels';
import { questsFor } from './quests';
import { useGame } from './store';

describe('levels', () => {
  it('needs 60 XP for level 2', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 60 });
    expect(levelFromXp(60).level).toBe(2);
    expect(levelFromXp(150)).toEqual({ level: 3, into: 0, needed: 120 });
  });

  it('pays a perfect run a bonus', () => {
    expect(xpFor('lesson', 95).total).toBeGreaterThan(xpFor('lesson', 70).total + 5);
    expect(xpFor('lesson', 0).total).toBe(15);
  });
});

describe('quests', () => {
  it('picks three distinct quests for a day', () => {
    const q = questsFor('2026-10-18');
    expect(q).toHaveLength(3);
    expect(new Set(q.map((x) => x.id)).size).toBe(3);
  });
});

describe('streaks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGame.getState().resetAll();
  });
  afterEach(() => vi.useRealTimers());

  const sing = () =>
    useGame.getState().recordActivity({ kind: 'warmup', label: 'Warm-up', accuracy: 80, precision: 80, sustain: 80 });

  it('counts consecutive days once each', () => {
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    sing();
    sing();
    expect(useGame.getState().streak).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 13, 9));
    sing();
    expect(useGame.getState().streak).toBe(2);
  });

  it('spends a freeze on a missed day', () => {
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    sing();
    vi.setSystemTime(new Date(2026, 9, 14, 10));
    const r = sing();
    const s = useGame.getState();
    expect(r.streakAfter).toBe(2);
    expect(s.freezes).toBe(0);
    expect(s.frozenDays).toEqual(['2026-10-13']);
  });

  it('resets without enough freezes', () => {
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    sing();
    vi.setSystemTime(new Date(2026, 9, 16, 10));
    useGame.getState().reconcile();
    expect(useGame.getState().lostStreak).toBe(1);
    expect(sing().streakAfter).toBe(1);
  });

  it('awards friend badges once', () => {
    useGame.getState().setFriendCount(1);
    expect(useGame.getState().badges.duet).toBeTruthy();
    expect(useGame.getState().badges.choir).toBeUndefined();
    useGame.getState().setFriendCount(5);
    expect(useGame.getState().badges.choir).toBeTruthy();
  });
});

describe('storage migration', () => {
  it('drops the old league fields from v1 saves', async () => {
    const v1 = { state: { name: 'Epa', onboarded: true, xp: 77, leagueWeek: '2026-10-12', leagueTier: 2, leagueResult: null, promotions: 1 }, version: 1 };
    localStorage.setItem('belto-progress', JSON.stringify(v1));
    await useGame.persist.rehydrate();
    const s = useGame.getState() as unknown as Record<string, unknown>;
    expect(s.xp).toBe(77);
    expect(s.leagueTier).toBeUndefined();
    expect(s.promotions).toBeUndefined();
  });
});
