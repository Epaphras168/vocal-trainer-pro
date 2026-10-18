import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levelFromXp, xpFor } from './levels';
import { outcomeFor, standings, cohortFor } from './league';
import { questsFor } from './quests';
import { useGame, weekXp } from './store';
import { weekStart } from './dates';

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

describe('league', () => {
  it('is deterministic per week and tier', () => {
    expect(cohortFor('2026-10-12', 0)).toEqual(cohortFor('2026-10-12', 0));
    expect(cohortFor('2026-10-12', 0)).not.toEqual(cohortFor('2026-10-19', 0));
  });

  it('ranks the singer among 20', () => {
    const table = standings('2026-10-12', 0, 'Epa', 99999, 0.5);
    expect(table).toHaveLength(20);
    expect(table[0].isYou).toBe(true);
    expect(outcomeFor(1, 0, 100)).toBe('promoted');
    expect(outcomeFor(18, 0, 0)).toBe('stayed');
    expect(outcomeFor(18, 2, 5)).toBe('demoted');
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

  it('settles the league when a new week starts', () => {
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    useGame.setState({ name: 'Epa', leagueWeek: weekStart('2026-10-12') });
    for (let i = 0; i < 40; i++) sing();
    expect(weekXp(useGame.getState().xpByDay, '2026-10-12')).toBeGreaterThan(400);
    vi.setSystemTime(new Date(2026, 9, 20, 10));
    useGame.getState().reconcile();
    const s = useGame.getState();
    expect(s.leagueWeek).toBe('2026-10-19');
    expect(s.leagueResult?.outcome).toBe('promoted');
    expect(s.leagueTier).toBe(1);
  });
});
