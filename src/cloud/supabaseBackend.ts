import { createClient, type User } from '@supabase/supabase-js';
import type { AddFriendResult, CloudBackend, CloudUser, FriendRow, ProfileSummary } from './types';

// Supabase implementation. The database side lives in
// supabase/migrations: row level security keeps every table private to its
// owner, and friend operations go through security-definer functions.

interface BoardRecord {
  id: string;
  display_name: string;
  avatar_hue: number;
  relation: FriendRow['relation'];
  xp: number | null;
  level: number | null;
  streak: number | null;
  longest_streak: number | null;
  week_xp: number | null;
  lessons_completed: number | null;
  best_accuracy: number | null;
  voice_type: string | null;
  last_active: string | null;
}

const toUser = (u: User | null | undefined): CloudUser | null => (u ? { id: u.id, email: u.email ?? null } : null);

function profileColumns(s: ProfileSummary) {
  return {
    display_name: s.displayName,
    avatar_hue: s.avatarHue,
    xp: s.xp,
    level: s.level,
    streak: s.streak,
    longest_streak: s.longestStreak,
    week_id: s.weekId,
    week_xp: s.weekXp,
    lessons_completed: s.lessonsCompleted,
    best_accuracy: s.bestAccuracy,
    voice_type: s.voiceType,
    last_active: s.lastActive,
    updated_at: new Date().toISOString(),
  };
}

export function createSupabaseBackend(url: string, key: string): CloudBackend {
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  const uid = async () => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Not signed in');
    return id;
  };

  const check = <T>(res: { data: T; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  return {
    async currentUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },

    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: `${location.origin}/friends` },
      });
      if (error) throw new Error(error.message);
    },

    async verifyCode(email, code) {
      const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.user) throw new Error(error?.message ?? 'That code did not work');
      return toUser(data.user)!;
    },

    async signOut() {
      await sb.auth.signOut();
    },

    async ensureProfile(summary) {
      const id = await uid();
      const existing = check(await sb.from('profiles').select('friend_code').eq('id', id).maybeSingle());
      if (existing) return { friendCode: existing.friend_code as string };
      // Insert, not upsert: clients may not update the id column, and the
      // friend code is assigned by the database.
      const created = check(
        await sb
          .from('profiles')
          .insert({ id, ...profileColumns(summary) })
          .select('friend_code')
          .single(),
      );
      if (!created) throw new Error('Could not create your profile');
      return { friendCode: created.friend_code as string };
    },

    async pushSummary(summary) {
      const id = await uid();
      check(await sb.from('profiles').update(profileColumns(summary)).eq('id', id));
    },

    async pullProgress() {
      const id = await uid();
      const row = check(await sb.from('progress').select('data').eq('user_id', id).maybeSingle());
      return (row?.data as Record<string, unknown> | undefined) ?? null;
    },

    async pushProgress(data) {
      const id = await uid();
      check(await sb.from('progress').upsert({ user_id: id, data, updated_at: new Date().toISOString() }));
    },

    async friendBoard(weekId) {
      const rows = check(await sb.rpc('friend_board', { p_week: weekId })) as BoardRecord[];
      return rows.map((r) => ({
        id: r.id,
        name: r.display_name,
        hue: r.avatar_hue,
        relation: r.relation,
        xp: r.xp,
        level: r.level,
        streak: r.streak,
        longestStreak: r.longest_streak,
        weekXp: r.week_xp,
        lessonsCompleted: r.lessons_completed,
        bestAccuracy: r.best_accuracy,
        voiceType: r.voice_type,
        lastActive: r.last_active,
      }));
    },

    async addFriend(code) {
      return check(await sb.rpc('add_friend', { p_code: code })) as AddFriendResult;
    },

    async respond(otherId, accept) {
      check(await sb.rpc('respond_friend', { p_other: otherId, p_accept: accept }));
    },

    async removeFriend(otherId) {
      check(await sb.rpc('remove_friend', { p_other: otherId }));
    },
  };
}
