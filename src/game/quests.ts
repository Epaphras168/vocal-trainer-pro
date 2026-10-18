import type { ActivityEntry } from './store';
import type { DayKey } from './dates';

// Three small daily quests, picked deterministically from the date.

export interface Quest {
  id: string;
  title: string;
  target: number;
  gems: number;
  icon: 'Zap' | 'BookOpen' | 'Target' | 'Sunrise' | 'Gamepad2' | 'Star';
  progress: (today: ActivityEntry[], xpToday: number) => number;
}

const POOL: Quest[] = [
  { id: 'xp-30', title: 'Earn 30 XP', target: 30, gems: 5, icon: 'Zap', progress: (_, xp) => xp },
  { id: 'xp-60', title: 'Earn 60 XP', target: 60, gems: 10, icon: 'Zap', progress: (_, xp) => xp },
  { id: 'lessons-2', title: 'Finish 2 lessons', target: 2, gems: 8, icon: 'BookOpen', progress: (t) => t.filter((a) => a.kind === 'lesson').length },
  { id: 'acc-85', title: 'Score 85% or more', target: 1, gems: 6, icon: 'Target', progress: (t) => t.filter((a) => a.accuracy >= 85).length },
  { id: 'warmup', title: 'Do the daily warm-up', target: 1, gems: 5, icon: 'Sunrise', progress: (t) => t.filter((a) => a.kind === 'warmup').length },
  { id: 'game', title: 'Play the pitch game', target: 1, gems: 5, icon: 'Gamepad2', progress: (t) => t.filter((a) => a.kind === 'game').length },
  { id: 'perfect', title: 'Land a perfect run', target: 1, gems: 10, icon: 'Star', progress: (t) => t.filter((a) => a.accuracy >= 90).length },
];

export function questsFor(day: DayKey): Quest[] {
  let seed = Number(day.replaceAll('-', ''));
  const pool = [...POOL];
  // Always one XP quest, plus two others.
  const xpQuest = pool.splice(seed % 2, 1)[0];
  const others = pool.filter((q) => !q.id.startsWith('xp'));
  const picks: Quest[] = [xpQuest];
  while (picks.length < 3 && others.length) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    picks.push(others.splice(seed % others.length, 1)[0]);
  }
  return picks;
}
