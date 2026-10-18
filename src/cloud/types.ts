// The contract between the app and whatever stores accounts and friends.
// The real implementation is Supabase (supabaseBackend.ts); a local mock
// (mockBackend.ts) exists for development and screenshots.

export interface CloudUser {
  id: string;
  email: string | null;
}

/** What friends can see about you, written after each session. */
export interface ProfileSummary {
  displayName: string;
  avatarHue: number;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  weekId: string;
  weekXp: number;
  lessonsCompleted: number;
  bestAccuracy: number;
  voiceType: string | null;
  lastActive: string | null;
}

export type Relation = 'self' | 'friend' | 'incoming' | 'outgoing';

/** A row on the Friends screen. Stats are null for pending requests. */
export interface FriendRow {
  id: string;
  name: string;
  hue: number;
  relation: Relation;
  xp: number | null;
  level: number | null;
  streak: number | null;
  longestStreak: number | null;
  weekXp: number | null;
  lessonsCompleted: number | null;
  bestAccuracy: number | null;
  voiceType: string | null;
  lastActive: string | null;
}

export type AddFriendResult = 'requested' | 'accepted' | 'already_friends' | 'already_requested' | 'not_found' | 'self' | 'limit';

export interface CloudBackend {
  currentUser(): Promise<CloudUser | null>;
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  /** Emails a sign-in link that also carries a 6-digit code. */
  sendCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<CloudUser>;
  signOut(): Promise<void>;

  /** Creates the profile on first sign-in; returns the singer's friend code. */
  ensureProfile(summary: ProfileSummary): Promise<{ friendCode: string }>;
  pushSummary(summary: ProfileSummary): Promise<void>;
  pullProgress(): Promise<Record<string, unknown> | null>;
  pushProgress(data: Record<string, unknown>): Promise<void>;

  friendBoard(weekId: string): Promise<FriendRow[]>;
  addFriend(code: string): Promise<AddFriendResult>;
  respond(otherId: string, accept: boolean): Promise<void>;
  removeFriend(otherId: string): Promise<void>;
}
