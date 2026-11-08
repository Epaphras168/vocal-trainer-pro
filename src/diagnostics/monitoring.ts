import { buildLabel } from './info';

// Optional crash reporting. Off unless VITE_SENTRY_DSN is set. It sends the
// error's name, message and stack, the build, the page path and the browser
// string: no account, name, email, progress or audio. Uses Sentry's plain HTTP
// ingest, so there is no SDK in the bundle.

const LAST_KEY = 'belto-last-error';
const MAX_PER_SESSION = 10;

interface Dsn {
  url: string;
  key: string;
}

function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\/+/, '');
    if (!u.username || !project) return null;
    return { url: `${u.protocol}//${u.host}/api/${project}/envelope/`, key: u.username };
  } catch {
    return null;
  }
}

const dsn = parseDsn(import.meta.env.VITE_SENTRY_DSN);
const seen = new Set<string>();
let sent = 0;

/** True when crash reports leave the device. The Privacy page changes its wording to match. */
export const reportingEnabled = dsn !== null;

export function lastError(): string | null {
  try {
    return sessionStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function remember(text: string): void {
  try {
    sessionStorage.setItem(LAST_KEY, text.slice(0, 600));
  } catch {
    // private mode: fine
  }
}

export function reportError(error: unknown, where = 'app'): void {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  console.error(`[${where}]`, err);
  remember(`${err.name}: ${err.message} (${where})`);
  if (!dsn || sent >= MAX_PER_SESSION) return;
  const signature = `${err.name}:${err.message}`;
  if (seen.has(signature)) return;
  seen.add(signature);
  sent++;
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    release: buildLabel(),
    tags: { where },
    request: { url: location.origin + location.pathname, headers: { 'User-Agent': navigator.userAgent } },
    exception: { values: [{ type: err.name, value: err.message.slice(0, 500), stacktrace: undefined }] },
    extra: { stack: (err.stack ?? '').slice(0, 3000) },
  };
  const body = [{ event_id: event.event_id, sent_at: new Date().toISOString() }, { type: 'event' }, event].map((x) => JSON.stringify(x)).join('\n');
  void fetch(`${dsn.url}?sentry_version=7&sentry_key=${dsn.key}`, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }).catch(() => undefined);
}

export function initMonitoring(): void {
  window.addEventListener('error', (e) => {
    // Browsers report cross-origin script noise and resize-observer chatter with no useful error.
    if (!e.error && /ResizeObserver|Script error/i.test(e.message)) return;
    reportError(e.error ?? e.message, 'window');
  });
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}
