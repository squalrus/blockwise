import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-side client for Supabase Auth only -- it never touches app tables
// directly. All app_user/business_claim/checkin reads and writes still go
// through apps/api's service-role client (see apps/api/src/supabase.ts),
// keeping this project's "only the backend talks to Postgres" boundary
// intact. Built lazily (like getSupabaseClient() in apps/api) so importing
// this module doesn't crash pages that never call it, e.g. if the env vars
// aren't set yet in local dev.
let client: SupabaseClient | undefined;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  }

  client = createClient(url, anonKey);
  return client;
}
