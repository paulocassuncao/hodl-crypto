"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser Supabase client (singleton). Reads the public project URL + publishable
 * key from env; row access is enforced server-side by RLS. Used by client
 * components/providers (auth, portfolio).
 */
let client: SupabaseClient<Database> | undefined;

export const getSupabaseBrowserClient = (): SupabaseClient<Database> => {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
};
