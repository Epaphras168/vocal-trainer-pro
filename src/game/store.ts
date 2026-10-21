import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALL_LESSONS, UNITS } from '../content/curriculum';
import { classifyVoice, nameToMidi, type VoiceType } from '../audio/notes';
import { BADGES, type Badge, type BadgeContext } from './badges';
import { addDays, dayKey, daysBetween, weekDays, type DayKey } from './dates';
import { gemsFor, levelFromXp, xpFor, type XpBreakdown } from './levels';

// Progress lives on this device (localStorage) and, once signed in, is synced
// to the cloud (see src/cloud). The store is the single place rewards are
// granted, so XP, streaks, gems and badges stay consistent.

export type GoalId = 'fun' | 'confidence' | 'song' | 'choir' | 'career';
export type ActivityKind = 'lesson' | 'range' | 'accuracy' | 'game' | 'warmup' | 'free' | 'ear';
export type ThemePref = 'system' | 'light' | 'dark';
export type AccentId = 'ember' | 'lagoon' | 'orchid' | 'citrus';

export interface ActivityEntry {
  at: number;
  day: DayKey;
  kind: ActivityKind;
  label: string;
  accuracy: number;
  precision: number;
  sustain: number;
  xp: number;
}

export interface RangeSnapshot {
  day: DayKey;
  low: number;
  high: number;
}

export interface LessonRecord {
  completedAt: number;
  best: number;
  plays: number;
}

export interface Reward {
  xp: XpBreakdown;
  gems: number;
  levelBefore: number;
  levelAfter: number;
  streakBefore: number;
  streakAfter: number;
  newBadges: Badge[];
  perfect: boolean;
}

export interface GameState {
  name: string;
  goal: GoalId;
  dailyMinutes: number;
  onboarded: boolean;
  createdAt: number;

  range: { low: number; high: number } | null;
  rangeHistory: RangeSnapshot[];

  xp: number;
  xpByDay: Record<DayKey, number>;
  gems: number;

  streak: number;
  longestStreak: number;
  lastActive: DayKey | null;
  freezes: number;
  frozenDays: DayKey[];
  /** Set when a streak was lost, so Pip can be kind about it once. */
  lostStreak: number;

  lessons: Record<string, LessonRecord>;
  chests: Record<string, boolean>;
  activity: ActivityEntry[];
  badges: Record<string, number>;
  questsClaimed: Record<DayKey, string[]>;
  gameBest: number;
  /** Accepted friends, kept in sync by the Friends screen (for badges). */
  friendCount: number;

  theme: ThemePref;
  accent: AccentId;
  ownedAccents: AccentId[];
  sound: boolean;
  /** Wearing headphones: backing tracks can play while the mic listens. */
  headphones: boolean;

  /** Queue of moments the shell celebrates (level ups, badges). */
  celebrations: Celebration[];
}

export type Celebration =
  | { id: number; type: 'level'; level: number }
  | { id: number; type: 'badge'; badgeId: string }
  | { id: number; type: 'streak'; days: number };

interface Actions {
  completeOnboarding(p: { name: string; goal: GoalId; dailyMinutes: number }): void;
  updateGoals(p: { goal: GoalId; dailyMinutes: number; name?: string }): void;
  setRange(low: number, high: number): void;
  recordActivity(a: {
    kind: ActivityKind;
    label: string;
    accuracy: number;
    precision: number;
    sustain: number;
    lessonId?: string;
    gameLevel?: number;
  }): Reward;
  openChest(unitId: string): number;
  claimQuest(questId: string, gems: number): void;
  buyFreeze(): boolean;
  buyAccent(id: AccentId, price: number): boolean;
  setAccent(id: AccentId): void;
  setTheme(t: ThemePref): void;
  setSound(on: boolean): void;
  setHeadphones(on: boolean): void;
  dismissCelebration(id: number): void;
  setFriendCount(n: number): void;
  acknowledgeLostStreak(): void;
  reconcile(now?: Date): void;
  resetAll(): void;
}

export const FREEZE_PRICE = 50;
export const MAX_FREEZES = 3;
export const CHEST_GEMS = 15;

function initialState(): GameState {
  return {
    name: '',
    goal: 'fun',
    dailyMinutes: 5,
    onboarded: false,
    createdAt: Date.now(),
    range: null,
    rangeHistory: [],
    xp: 0,
    xpByDay: {},
    gems: 20,
    streak: 0,
    longestStreak: 0,
    lastActive: null,
    freezes: 1,
    frozenDays: [],
    lostStreak: 0,
    lessons: {},
    chests: {},
    activity: [],
    badges: {},
    questsClaimed: {},
    gameBest: 0,
    friendCount: 0,
    theme: 'system',
    accent: 'ember',
    ownedAccents: ['ember'],
    sound: true,
    headphones: false,
    celebrations: [],
  };
}

let celebrationId = 1;

const LEGACY_KEYS = ['leagueWeek', 'leagueTier', 'leagueResult', 'promotions'];

function withoutLegacyKeys(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).filter(([k]) => !LEGACY_KEYS.includes(k)));
}

/** The saved part of the state: everything except actions and transient UI queues. */
export function snapshot(s: GameState): Partial<GameState> {
  const { celebrations: _c, ...rest } = s;
  void _c;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<GameState>;
}

export function weekXp(xpByDay: Record<DayKey, number>, weekId: DayKey): number {
  return weekDays(weekId).reduce((sum, d) => sum + (xpByDay[d] ?? 0), 0);
}

export function completedUnitIds(lessons: Record<string, LessonRecord>): string[] {
  return UNITS.filter((u) => u.lessons.every((l) => lessons[l.id])).map((u) => u.id);
}

export function unitsCompleted(lessons: Record<string, LessonRecord>): number {
  return completedUnitIds(lessons).length;
}

function badgeContext(s: GameState): BadgeContext {
  return {
    xp: s.xp,
    streak: s.streak,
    longestStreak: s.longestStreak,
    lessonsCompleted: s.activity.filter((a) => a.kind === 'lesson').length,
    perfectRuns: s.activity.filter((a) => a.accuracy >= 90).length,
    drillsCompleted: s.activity.filter((a) => a.kind !== 'lesson').length,
    rangeSemitones: s.range ? s.range.high - s.range.low : 0,
    unitsCompleted: unitsCompleted(s.lessons),
    unitIds: completedUnitIds(s.lessons),
    totalUnits: UNITS.length,
    gameBest: s.gameBest,
    friends: s.friendCount,
    warmups: s.activity.filter((a) => a.kind === 'warmup').length,
  };
}

function newBadges(s: GameState): Badge[] {
  const ctx = badgeContext(s);
  return BADGES.filter((b) => !s.badges[b.id] && b.earned(ctx));
}

/** Apply streak freezes for missed days (or end the streak) before today's activity. */
function settleStreak(s: GameState, today: DayKey): Partial<GameState> {
  if (!s.lastActive || s.streak === 0) return {};
  const gap = daysBetween(s.lastActive, today);
  if (gap <= 1) return {};
  const missed = gap - 1;
  if (s.freezes >= missed) {
    const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastActive as DayKey, i + 1));
    return { freezes: s.freezes - missed, frozenDays: [...s.frozenDays, ...frozen], lastActive: addDays(today, -1) };
  }
  return { lostStreak: s.streak, streak: 0 };
}

export const useGame = create<GameState & Actions>()(
  persist(
    (set, get) => ({
      ...initialState(),

      completeOnboarding: ({ name, goal, dailyMinutes }) =>
        set({ name: name.trim(), goal, dailyMinutes, onboarded: true }),

      updateGoals: ({ goal, dailyMinutes, name }) =>
        set((s) => ({ goal, dailyMinutes, name: name === undefined ? s.name : name.trim() })),

      setRange: (low, high) =>
        set((s) => {
          const today = dayKey();
          const history = s.rangeHistory.filter((r) => r.day !== today);
          const next = { ...s, range: { low, high }, rangeHistory: [...history, { day: today, low, high }] };
          const earned = newBadges(next);
          return {
            range: next.range,
            rangeHistory: next.rangeHistory,
            badges: { ...s.badges, ...Object.fromEntries(earned.map((b) => [b.id, Date.now()])) },
            celebrations: [...s.celebrations, ...earned.map((b) => ({ id: celebrationId++, type: 'badge' as const, badgeId: b.id }))],
          };
        }),

      recordActivity: (a) => {
        get().reconcile();
        const s = get();
        const today = dayKey();
        const kind = a.kind === 'lesson' ? 'lesson' : 'drill';
        const xp = xpFor(kind, a.accuracy);
        const firstTime = a.lessonId ? !s.lessons[a.lessonId] : true;
        // Replaying a finished lesson still pays, just less; gems are for first clears.
        const gems = a.kind === 'lesson' && !firstTime ? (a.accuracy >= 90 ? 1 : 0) : gemsFor(kind, a.accuracy);
        if (a.kind === 'lesson' && !firstTime) xp.total = Math.max(5, Math.round(xp.total * 0.6));

        const levelBefore = levelFromXp(s.xp).level;
        const streakBefore = s.streak;
        const extendsStreak = s.lastActive !== today;
        const streak = extendsStreak ? s.streak + 1 : s.streak;

        const entry: ActivityEntry = {
          at: Date.now(),
          day: today,
          kind: a.kind,
          label: a.label,
          accuracy: Math.round(a.accuracy),
          precision: Math.round(a.precision),
          sustain: Math.round(a.sustain),
          xp: xp.total,
        };

        const lessons = { ...s.lessons };
        if (a.lessonId) {
          const prev = lessons[a.lessonId];
          lessons[a.lessonId] = {
            completedAt: prev?.completedAt ?? Date.now(),
            best: Math.max(prev?.best ?? 0, Math.round(a.accuracy)),
            plays: (prev?.plays ?? 0) + 1,
          };
        }

        const next: GameState = {
          ...s,
          xp: s.xp + xp.total,
          xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp.total },
          gems: s.gems + gems,
          streak,
          longestStreak: Math.max(s.longestStreak, streak),
          lastActive: today,
          lostStreak: 0,
          lessons,
          activity: [...s.activity, entry].slice(-500),
          gameBest: Math.max(s.gameBest, a.gameLevel ?? 0),
        };
        const earned = newBadges(next);
        const levelAfter = levelFromXp(next.xp).level;
        const celebrations: Celebration[] = [...s.celebrations];
        if (levelAfter > levelBefore) celebrations.push({ id: celebrationId++, type: 'level', level: levelAfter });
        earned.forEach((b) => celebrations.push({ id: celebrationId++, type: 'badge', badgeId: b.id }));

        set({
          ...next,
          badges: { ...s.badges, ...Object.fromEntries(earned.map((b) => [b.id, Date.now()])) },
          celebrations,
        });

        return {
          xp,
          gems,
          levelBefore,
          levelAfter,
          streakBefore,
          streakAfter: streak,
          newBadges: earned,
          perfect: a.accuracy >= 90,
        };
      },

      openChest: (unitId) => {
        const s = get();
        if (s.chests[unitId]) return 0;
        set({ chests: { ...s.chests, [unitId]: true }, gems: s.gems + CHEST_GEMS });
        return CHEST_GEMS;
      },

      claimQuest: (questId, gems) =>
        set((s) => {
          const today = dayKey();
          const claimed = s.questsClaimed[today] ?? [];
          if (claimed.includes(questId)) return {};
          // Only keep today's claims around.
          return { gems: s.gems + gems, questsClaimed: { [today]: [...claimed, questId] } };
        }),

      buyFreeze: () => {
        const s = get();
        if (s.gems < FREEZE_PRICE || s.freezes >= MAX_FREEZES) return false;
        set({ gems: s.gems - FREEZE_PRICE, freezes: s.freezes + 1 });
        return true;
      },

      buyAccent: (id, price) => {
        const s = get();
        if (s.ownedAccents.includes(id)) {
          set({ accent: id });
          return true;
        }
        if (s.gems < price) return false;
        set({ gems: s.gems - price, ownedAccents: [...s.ownedAccents, id], accent: id });
        return true;
      },

      setAccent: (id) => set((s) => (s.ownedAccents.includes(id) ? { accent: id } : {})),
      setTheme: (theme) => set({ theme }),
      setSound: (sound) => set({ sound }),
      setHeadphones: (headphones) => set({ headphones }),
      dismissCelebration: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),
      setFriendCount: (n) =>
        set((s) => {
          if (n === s.friendCount) return {};
          const earned = newBadges({ ...s, friendCount: n });
          return {
            friendCount: n,
            badges: { ...s.badges, ...Object.fromEntries(earned.map((b) => [b.id, Date.now()])) },
            celebrations: [...s.celebrations, ...earned.map((b) => ({ id: celebrationId++, type: 'badge' as const, badgeId: b.id }))],
          };
        }),
      acknowledgeLostStreak: () => set({ lostStreak: 0 }),

      reconcile: (now = new Date()) => {
        const s = get();
        const today = dayKey(now);
        const patch = settleStreak(s, today);
        if (Object.keys(patch).length) set(patch);
      },

      resetAll: () => set({ ...initialState() }),
    }),
    {
      name: 'belto-progress',
      version: 2,
      partialize: (s) => snapshot(s),
      // v1 had a simulated weekly league; friends replaced it in v2.
      migrate: (persisted) => withoutLegacyKeys(persisted as Record<string, unknown>) as unknown as GameState,
    },
  ),
);

// ---- Derived helpers -------------------------------------------------------

export const DEFAULT_RANGE = { low: nameToMidi('C3'), high: nameToMidi('C5') };

export function effectiveRange(s: Pick<GameState, 'range'>): { low: number; high: number } {
  return s.range ?? DEFAULT_RANGE;
}

export function voiceTypeOf(s: Pick<GameState, 'range'>): VoiceType | null {
  return s.range ? classifyVoice(s.range.low, s.range.high) : null;
}

/** The next lesson to play: the first one not yet completed. */
export function nextLessonId(lessons: Record<string, LessonRecord>): string | null {
  return ALL_LESSONS.find((l) => !lessons[l.id])?.id ?? null;
}

export function isLessonUnlocked(lessons: Record<string, LessonRecord>, id: string): boolean {
  const idx = ALL_LESSONS.findIndex((l) => l.id === id);
  return idx === 0 || !!lessons[id] || (idx > 0 && !!lessons[ALL_LESSONS[idx - 1].id]);
}

export function todayActivity(activity: ActivityEntry[], today = dayKey()): ActivityEntry[] {
  return activity.filter((a) => a.day === today);
}

export function dailyXpGoal(dailyMinutes: number): number {
  // Roughly 10 XP a minute of practice.
  return Math.max(20, Math.round((dailyMinutes * 10) / 10) * 10);
}
