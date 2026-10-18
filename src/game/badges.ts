// Achievements. Each badge is a pure check over the saved progress.

export interface BadgeContext {
  xp: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  perfectRuns: number;
  drillsCompleted: number;
  rangeSemitones: number;
  unitsCompleted: number;
  gameBest: number;
  friends: number;
  warmups: number;
}

export interface Badge {
  id: string;
  name: string;
  blurb: string;
  /** lucide icon name, see components/BadgeIcon. */
  icon: 'Mic' | 'Star' | 'Flame' | 'Sparkles' | 'Trophy' | 'Music' | 'Mountain' | 'Crown' | 'Gamepad2' | 'Sunrise' | 'Medal' | 'Zap' | 'Users';
  color: 'accent' | 'gold' | 'teal' | 'pink' | 'violet';
  earned: (c: BadgeContext) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-note', name: 'First note', blurb: 'Finished your first lesson or drill.', icon: 'Mic', color: 'accent', earned: (c) => c.lessonsCompleted + c.drillsCompleted >= 1 },
  { id: 'perfect', name: 'Bullseye', blurb: 'Scored 90% or more on a run.', icon: 'Star', color: 'gold', earned: (c) => c.perfectRuns >= 1 },
  { id: 'perfect-10', name: 'Pitch sniper', blurb: 'Ten perfect runs.', icon: 'Sparkles', color: 'gold', earned: (c) => c.perfectRuns >= 10 },
  { id: 'streak-3', name: 'Warming up', blurb: 'A 3-day streak.', icon: 'Flame', color: 'accent', earned: (c) => c.longestStreak >= 3 },
  { id: 'streak-7', name: 'Week of song', blurb: 'A 7-day streak.', icon: 'Flame', color: 'pink', earned: (c) => c.longestStreak >= 7 },
  { id: 'streak-30', name: 'Unstoppable', blurb: 'A 30-day streak.', icon: 'Zap', color: 'violet', earned: (c) => c.longestStreak >= 30 },
  { id: 'range-2', name: 'Two octaves', blurb: 'Measured a range of 24 semitones.', icon: 'Mountain', color: 'teal', earned: (c) => c.rangeSemitones >= 24 },
  { id: 'unit-1', name: 'Breath boss', blurb: 'Completed your first unit.', icon: 'Medal', color: 'teal', earned: (c) => c.unitsCompleted >= 1 },
  { id: 'unit-4', name: 'Halfway there', blurb: 'Completed four units.', icon: 'Music', color: 'violet', earned: (c) => c.unitsCompleted >= 4 },
  { id: 'xp-1000', name: 'Thousand club', blurb: 'Earned 1,000 XP.', icon: 'Trophy', color: 'gold', earned: (c) => c.xp >= 1000 },
  { id: 'game-5', name: 'Echo master', blurb: 'Reached level 5 in the pitch game.', icon: 'Gamepad2', color: 'pink', earned: (c) => c.gameBest >= 5 },
  { id: 'warmup-5', name: 'Early bird', blurb: 'Did the daily warm-up five times.', icon: 'Sunrise', color: 'accent', earned: (c) => c.warmups >= 5 },
  { id: 'duet', name: 'Duet', blurb: 'Added your first friend.', icon: 'Users', color: 'teal', earned: (c) => c.friends >= 1 },
  { id: 'choir', name: 'Choir', blurb: 'Five friends singing with you.', icon: 'Crown', color: 'gold', earned: (c) => c.friends >= 5 },
];
