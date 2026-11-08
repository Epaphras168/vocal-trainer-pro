import { useEffect, useRef } from 'react';

// Cloudflare Turnstile: a privacy-friendly "are you a person?" check on sign-up,
// sign-in and password reset, so bots can't use Belto to send floods of email.
// Off unless VITE_TURNSTILE_SITE_KEY is set (and CAPTCHA protection is switched
// on in Supabase: Authentication > Attack Protection).

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const captchaEnabled = Boolean(SITE_KEY);

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function load(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not start')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the check'));
    };
    document.head.append(s);
  });
  return loading;
}

/** Renders the check. `onToken` gets a one-use token when it passes, and null when it expires or fails. Change `resetKey` to ask again. */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let widget: string | null = null;
    let gone = false;
    callback.current(null);
    load()
      .then((api) => {
        if (gone || !box.current) return;
        widget = api.render(box.current, {
          sitekey: SITE_KEY,
          callback: (t: string) => callback.current(t),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
          theme: 'auto',
        });
      })
      .catch(() => callback.current(null));
    return () => {
      gone = true;
      if (widget && window.turnstile) window.turnstile.remove(widget);
    };
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="signin__captcha" />;
}
