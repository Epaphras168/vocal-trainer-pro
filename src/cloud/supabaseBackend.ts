import { createClient, type User } from '@supabase/supabase-js';
import type { AddFriendResult, BlockedPerson, CloudBackend, CloudUser, FriendRow, ProfileSummary } from './types';

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

const toUser = (u: User | null | undefined): CloudUser | null =>
  u ? { id: u.id, email: u.email ?? null, name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null } : null;

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

    async signInWithGoogle() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}${location.pathname}` },
      });
      if (error) throw new Error(error.message);
    },

    async signInWithPassword(email, password, captchaToken) {
      const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) throw new Error(error.message);
    },

    async signUp(email, password, captchaToken) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/friends`, captchaToken } });
      if (error) throw new Error(error.message);
      // No session means the project asks new users to confirm their email first.
      return data.session ? 'signed-in' : 'confirm-email';
    },

    async sendPasswordReset(email, captchaToken) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/signin?reset=1`, captchaToken });
      if (error) throw new Error(error.message);
    },

    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw new Error(error.message);
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

    async blockUser(otherId) {
      check(await sb.rpc('block_user', { p_other: otherId }));
    },

    async unblockUser(otherId) {
      check(await sb.rpc('unblock_user', { p_other: otherId }));
    },

    async blockedList() {
      const rows = check(await sb.rpc('blocked_list')) as { id: string; display_name: string; avatar_hue: number }[];
      return rows.map((r): BlockedPerson => ({ id: r.id, name: r.display_name, hue: r.avatar_hue }));
    },

    async reportUser(otherId, reason) {
      return check(await sb.rpc('report_user', { p_other: otherId, p_reason: reason })) as 'reported' | 'rate_limited';
    },

    async exportData() {
      const id = await uid();
      const profile = check(await sb.from('profiles').select('*').eq('id', id).maybeSingle());
      const progress = check(await sb.from('progress').select('data, updated_at').eq('user_id', id).maybeSingle());
      const board = (check(await sb.rpc('friend_board', { p_week: '' })) as BoardRecord[]).map((r) => ({ name: r.display_name, relation: r.relation }));
      const blocked = check(await sb.rpc('blocked_list')) as { display_name: string }[];
      const { data } = await sb.auth.getSession();
      return { account: { id, email: data.session?.user.email ?? null }, profile, progress, people: board.filter((r) => r.relation !== 'self'), blocked: blocked.map((b) => b.display_name) };
    },

    async deleteAccount() {
      check(await sb.rpc('delete_my_account'));
      // The account is gone; clear the local session without asking the server.
      await sb.auth.signOut({ scope: 'local' });
    },
  };
}
