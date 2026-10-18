import { addDays, dayKey, weekStart } from '../game/dates';
import type { AddFriendResult, CloudBackend, CloudUser, FriendRow, ProfileSummary } from './types';

// A pretend server kept in localStorage, for local development and demos
// without a Supabase project. Enabled with VITE_CLOUD_MOCK=true; never part of
// a production build otherwise. Any 6-digit code signs you in.

const KEY = 'belto-mock-cloud';

interface MockState {
  user: CloudUser | null;
  friendCode: string;
  summary: ProfileSummary | null;
  progress: Record<string, unknown> | null;
  others: FriendRow[];
}

function seed(): FriendRow[] {
  const today = dayKey();
  const mk = (id: string, name: string, hue: number, relation: FriendRow['relation'], xp: number, weekXp: number, streak: number, lessons: number, acc: number, voice: string, last: number): FriendRow => ({
    id,
    name,
    hue,
    relation,
    xp,
    level: 1 + Math.floor(xp / 120),
    streak,
    longestStreak: streak + 4,
    weekXp,
    lessonsCompleted: lessons,
    bestAccuracy: acc,
    voiceType: voice,
    lastActive: addDays(today, -last),
  });
  return [
    mk('m1', 'Ama', 330, 'friend', 1820, 210, 12, 14, 96, 'Alto', 0),
    mk('m2', 'Kofi', 160, 'friend', 940, 95, 3, 8, 88, 'Baritone', 1),
    mk('m3', 'Lena', 200, 'friend', 610, 40, 0, 5, 79, 'Soprano', 5),
    { ...mk('m4', 'Theo', 45, 'incoming', 0, 0, 0, 0, 0, 'Tenor', 0), xp: null, level: null, streak: null, longestStreak: null, weekXp: null, lessonsCompleted: null, bestAccuracy: null, voiceType: null, lastActive: null },
  ];
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // fall through to a fresh state
  }
  return { user: null, friendCode: 'PIP42X', summary: null, progress: null, others: seed() };
}

let state = load();
const listeners = new Set<(u: CloudUser | null) => void>();
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export const mockBackend: CloudBackend = {
  async currentUser() {
    return state.user;
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async sendCode() {
    await wait();
  },
  async verifyCode(email, code) {
    await wait();
    if (!/^\d{6}$/.test(code)) throw new Error('That code did not work. Check the email and try again.');
    state.user = { id: 'mock-user', email };
    save();
    listeners.forEach((l) => l(state.user));
    return state.user;
  },
  async signOut() {
    state.user = null;
    save();
    listeners.forEach((l) => l(null));
  },
  async ensureProfile(summary) {
    state.summary ??= summary;
    save();
    return { friendCode: state.friendCode };
  },
  async pushSummary(summary) {
    state.summary = summary;
    save();
  },
  async pullProgress() {
    return state.progress;
  },
  async pushProgress(data) {
    state.progress = data;
    save();
  },
  async friendBoard(weekId) {
    await wait(150);
    const me = state.summary;
    const self: FriendRow = {
      id: 'mock-user',
      name: me?.displayName ?? 'You',
      hue: me?.avatarHue ?? 18,
      relation: 'self',
      xp: me?.xp ?? 0,
      level: me?.level ?? 1,
      streak: me?.streak ?? 0,
      longestStreak: me?.longestStreak ?? 0,
      weekXp: me && me.weekId === weekId ? me.weekXp : 0,
      lessonsCompleted: me?.lessonsCompleted ?? 0,
      bestAccuracy: me?.bestAccuracy ?? 0,
      voiceType: me?.voiceType ?? null,
      lastActive: me?.lastActive ?? null,
    };
    const current = weekStart(dayKey());
    return [self, ...state.others.map((o) => (weekId === current ? o : { ...o, weekXp: o.weekXp === null ? null : 0 }))];
  },
  async addFriend(code): Promise<AddFriendResult> {
    await wait();
    if (code === state.friendCode) return 'self';
    if (code === 'ZURI77') {
      if (state.others.some((o) => o.id === 'm5')) return 'already_requested';
      state.others.push({ ...seed()[3], id: 'm5', name: 'Zuri', hue: 280, relation: 'outgoing' });
      save();
      return 'requested';
    }
    return 'not_found';
  },
  async respond(otherId, accept) {
    await wait();
    state.others = state.others.flatMap((o) => {
      if (o.id !== otherId) return [o];
      if (!accept) return [];
      return [{ ...o, relation: 'friend' as const, xp: 450, level: 4, streak: 2, longestStreak: 6, weekXp: 70, lessonsCompleted: 4, bestAccuracy: 84, voiceType: 'Tenor', lastActive: dayKey() }];
    });
    save();
  },
  async removeFriend(otherId) {
    await wait();
    state.others = state.others.filter((o) => o.id !== otherId);
    save();
  },
};
