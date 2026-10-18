// Level curve: 60 XP to reach level 2, and each level after asks for 30 more.

export function xpToNext(level: number): number {
  return 60 + (level - 1) * 30;
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, into: remaining, needed: xpToNext(level) };
}

export interface XpBreakdown {
  base: number;
  accuracyBonus: number;
  perfectBonus: number;
  total: number;
}

/**
 * Reward shape: everyone who finishes gets the base, accuracy adds on top.
 * Singing is physically hard, so a rough take still earns most of the XP.
 */
export function xpFor(kind: 'lesson' | 'drill', accuracy: number): XpBreakdown {
  const base = kind === 'lesson' ? 15 : 8;
  const accuracyBonus = Math.round((Math.max(0, accuracy) / 100) * (kind === 'lesson' ? 10 : 6));
  const perfectBonus = accuracy >= 90 ? (kind === 'lesson' ? 10 : 5) : 0;
  return { base, accuracyBonus, perfectBonus, total: base + accuracyBonus + perfectBonus };
}

export function gemsFor(kind: 'lesson' | 'drill', accuracy: number): number {
  if (kind === 'drill') return accuracy >= 90 ? 2 : 0;
  return 3 + (accuracy >= 90 ? 3 : accuracy >= 75 ? 1 : 0);
}
