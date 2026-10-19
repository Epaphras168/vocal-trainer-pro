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
}
