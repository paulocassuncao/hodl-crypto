/**
 * Public Supabase connection values, shared by the browser + server clients.
 *
 * In real environments these come from the Vercel project env (the
 * browser-exposed NEXT_PUBLIC_* vars). During a build with no env configured —
 * e.g. CI prerendering the app-shell pages (/_not-found, /alerts) — we fall back
 * to inert placeholders so @supabase/ssr can construct a client instead of
 * throwing "Your project's URL and API key are required". The placeholder client
 * is never used to fetch in that context; real requests only run with real env.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
