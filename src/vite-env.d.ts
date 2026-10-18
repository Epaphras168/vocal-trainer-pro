/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" runs a pretend friends server in localStorage, for development. */
  readonly VITE_CLOUD_MOCK?: string;
}
