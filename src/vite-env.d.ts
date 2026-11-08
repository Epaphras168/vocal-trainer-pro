/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" shows "Continue with Google". Needs a Google OAuth app that is published to production. */
  readonly VITE_GOOGLE_SIGNIN?: string;
  /** Shown on the Privacy and Terms pages, so people can ask for their account to be deleted. */
  readonly VITE_CONTACT_EMAIL?: string;
  /** "true" runs a pretend friends server in localStorage, for development. */
  readonly VITE_CLOUD_MOCK?: string;
  /** Optional: a Sentry project key. Unhandled errors are then reported (no personal data). */
  readonly VITE_SENTRY_DSN?: string;
  /** Optional: Cloudflare Turnstile site key. Turns on the sign-up CAPTCHA (also enable it in Supabase). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;
