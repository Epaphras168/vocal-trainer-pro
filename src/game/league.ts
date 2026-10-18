// Weekly leagues. Belto runs fully on-device, so a singer's cohort is a
// deterministic set of practice buddies generated from the week and tier:
// the same week always produces the same rivals, and their XP grows as the
// week goes by. Swap `cohortFor` for a server call to make it multiplayer.

export interface Tier {
  id: string;
  name: string;
  /** CSS colour token used for the tier crest. */
  color: string;
}

export const TIERS: Tier[] = [
  { id: 'sparrow', name: 'Sparrow', color: '#c59a7a' },
  { id: 'finch', name: 'Finch', color: '#f4d03f' },
  { id: 'robin', name: 'Robin', color: '#ff7a45' },
  { id: 'lark', name: 'Lark', color: '#34d1b6' },
  { id: 'nightingale', name: 'Nightingale', color: '#b48cff' },
  { id: 'songbird', name: 'Songbird', color: '#ff5fa2' },
];

export const COHORT_SIZE = 20;
export const PROMOTE = 5;
export const DEMOTE = 5;

export interface Rival {
  id: string;
  name: string;
  /** Hue for the avatar. */
  hue: number;
  /** XP they will have by the end of the week. */
  weekTotal: number;
  /** Shapes when in the week they practise (0 = early bird, 1 = last-minute). */
  lean: number;
}

export interface Standing {
  id: string;
  name: string;
  hue: number;
  xp: number;
  isYou: boolean;
  rank: number;
}

const NAMES = [
  'Maya', 'Theo', 'Amara', 'Kofi', 'Lena', 'Jun', 'Priya', 'Mateo', 'Ines', 'Noah',
  'Zara', 'Felix', 'Aiko', 'Omar', 'Chloé', 'Sven', 'Leila', 'Diego', 'Nia', 'Ravi',
  'Freya', 'Kai', 'Yara', 'Luca', 'Imani', 'Hugo', 'Sana', 'Eli', 'Rosa', 'Tariq',
];
const SUFFIX = ['', '', '', ' S.', ' K.', ' M.', ' B.', ' R.'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cohortFor(weekId: string, tier: number): Rival[] {
  const rand = mulberry32(hash(`${weekId}:${tier}`));
  const pool = [...NAMES];
  const rivals: Rival[] = [];
  const scale = 1 + tier * 0.45;
  for (let i = 0; i < COHORT_SIZE - 1; i++) {
    const name = pool.splice(Math.floor(rand() * pool.length), 1)[0] + SUFFIX[Math.floor(rand() * SUFFIX.length)];
    // A realistic spread: a few keen singers, a big middle, a few who barely show up.
    const r = rand();
    const base = r < 0.15 ? 5 + rand() * 25 : r < 0.8 ? 60 + rand() * 220 : 280 + rand() * 360;
    rivals.push({
      id: `r${i}`,
      name,
      hue: Math.floor(rand() * 360),
      weekTotal: Math.round((base * scale) / 5) * 5,
      lean: rand(),
    });
  }
  return rivals;
}

/** A rival's XP at a given point in the week, in quantised daily-ish steps. */
export function rivalXpAt(rival: Rival, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const exponent = 0.6 + rival.lean * 1.4;
  const steps = 14;
  const stepped = Math.floor(p * steps) / steps;
  return Math.round(rival.weekTotal * Math.pow(stepped, exponent));
}

export function standings(weekId: string, tier: number, youName: string, youXp: number, progress: number): Standing[] {
  const rows = cohortFor(weekId, tier).map((r) => ({
    id: r.id,
    name: r.name,
    hue: r.hue,
    xp: rivalXpAt(r, progress),
    isYou: false,
  }));
  rows.push({ id: 'you', name: youName || 'You', hue: 18, xp: youXp, isYou: true });
  // Ties go to you: you showed up today.
  rows.sort((a, b) => b.xp - a.xp || (a.isYou ? -1 : b.isYou ? 1 : 0));
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export type Outcome = 'promoted' | 'demoted' | 'stayed';

export function outcomeFor(rank: number, tier: number, youXp: number): Outcome {
  if (youXp > 0 && rank <= PROMOTE && tier < TIERS.length - 1) return 'promoted';
  if (rank > COHORT_SIZE - DEMOTE && tier > 0) return 'demoted';
  return 'stayed';
}

export function podiumGems(rank: number): number {
  return rank === 1 ? 30 : rank === 2 ? 20 : rank === 3 ? 10 : 0;
}
