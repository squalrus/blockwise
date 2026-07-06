import { createClient } from "@supabase/supabase-js";

// Server-side only: uses the service role key, which bypasses row-level
// security. Never expose this client or key to apps/web or any browser code.
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment"
    );
  }

  return createClient(url, serviceRoleKey);
}
