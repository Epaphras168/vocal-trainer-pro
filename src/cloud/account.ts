import { create } from 'zustand';
import { snapshot, useGame } from '../game/store';
import { mergeProgress } from './merge';
import { buildSummary } from './summary';
import type { CloudBackend, CloudUser } from './types';

// Signed-in state and background sync. The app stays local-first: progress
// is always saved on the device, and when you're signed in it is mirrored to
// the cloud a couple of seconds after each change, so friends see it and
// another device can pick it up.

export type AccountStatus = 'disabled' | 'loading' | 'signed-out' | 'signed-in';

interface AccountState {
  status: AccountStatus;
  user: CloudUser | null;
  friendCode: string | null;
  error: string | null;
}

export const useAccount = create<AccountState>(() => ({ status: 'loading', user: null, friendCode: null, error: null }));

let backend: CloudBackend | null = null;
let syncedUser: string | null = null;
let stopAutosync: (() => void) | null = null;

export function cloud(): CloudBackend {
  if (!backend) throw new Error('Cloud is not configured');
  return backend;
}

async function loadBackend(): Promise<CloudBackend | null> {
  if (import.meta.env.VITE_CLOUD_MOCK === 'true') return (await import('./mockBackend')).mockBackend;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  const { createSupabaseBackend } = await import('./supabaseBackend');
  return createSupabaseBackend(url, key);
}

export async function initCloud(): Promise<void> {
  try {
    backend = await loadBackend();
  } catch (err) {
    console.error('Cloud failed to load', err);
  }
  if (!backend) {
    useAccount.setState({ status: 'disabled' });
    return;
  }
  backend.onAuthChange((u) => (u ? void signedIn(u) : signedOut()));
  const user = await backend.currentUser().catch(() => null);
  if (user) await signedIn(user);
  else useAccount.setState({ status: 'signed-out' });
}

async function pushAll(userId: string): Promise<void> {
  const b = cloud();
  const game = useGame.getState();
  await Promise.all([b.pushProgress(snapshot(game) as Record<string, unknown>), b.pushSummary(buildSummary(game, userId))]);
}

async function signedIn(user: CloudUser): Promise<void> {
  // Supabase reports the same session more than once (initial load, sign-in, refresh).
  if (syncedUser === user.id) return;
  syncedUser = user.id;
  useAccount.setState({ status: 'loading', user, error: null });
  try {
    const b = cloud();
    const remote = await b.pullProgress();
    const local = snapshot(useGame.getState());
    const merged = mergeProgress(local, remote as Parameters<typeof mergeProgress>[1]);
    if (merged !== local) useGame.setState(merged);
    const { friendCode } = await b.ensureProfile(buildSummary(useGame.getState(), user.id));
    await pushAll(user.id);
    useAccount.setState({ status: 'signed-in', friendCode });
    startAutosync(user.id);
  } catch (err) {
    syncedUser = null;
    useAccount.setState({ status: 'signed-in', error: (err as Error).message });
  }
}

function signedOut(): void {
  syncedUser = null;
  stopAutosync?.();
  stopAutosync = null;
  useAccount.setState({ status: 'signed-out', user: null, friendCode: null, error: null });
}

function startAutosync(userId: string): void {
  stopAutosync?.();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    dirty = false;
    pushAll(userId).catch((err) => {
      dirty = true;
      useAccount.setState({ error: (err as Error).message });
    });
  };
  const offStore = useGame.subscribe((s, prev) => {
    // Celebrations are UI-only; ignore changes that touch nothing else.
    const changed = (Object.keys(s) as (keyof typeof s)[]).some((k) => k !== 'celebrations' && s[k] !== prev[k]);
    if (!changed) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 2500);
  });
  const onHide = () => document.visibilityState === 'hidden' && flush();
  document.addEventListener('visibilitychange', onHide);
  stopAutosync = () => {
    clearTimeout(timer);
    flush();
    offStore();
    document.removeEventListener('visibilitychange', onHide);
  };
}

export async function signOut(): Promise<void> {
  stopAutosync?.();
  await cloud().signOut();
  signedOut();
}

// ---- Invite links ----------------------------------------------------------

const INVITE_KEY = 'belto-invite';

export function rememberInvite(code: string): void {
  try {
    sessionStorage.setItem(INVITE_KEY, code);
  } catch {
    // private mode: the invite just won't survive onboarding
  }
}

export function takeInvite(): string | null {
  try {
    const code = sessionStorage.getItem(INVITE_KEY);
    sessionStorage.removeItem(INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}

export function hasInvite(): boolean {
  try {
    return !!sessionStorage.getItem(INVITE_KEY);
  } catch {
    return false;
  }
}

export function inviteLink(code: string): string {
  return `${location.origin}/add/${code}`;
}
