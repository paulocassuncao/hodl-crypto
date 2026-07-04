import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role Supabase client for trusted server-side jobs (the sleeve cron
 * has no user session, so RLS-scoped clients can't write its rows). The key
 * bypasses RLS — this module must NEVER be imported from client code, and the
 * key is read at call time so builds succeed without env (cgFetch pattern).
 */
export const createSupabaseServiceClient = (): SupabaseClient<Database> => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from the Supabase " +
        "dashboard (Project Settings → API) into the server env.",
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
