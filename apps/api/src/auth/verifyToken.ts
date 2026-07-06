import type { SupabaseClient } from "@supabase/supabase-js";

export interface VerifiedAuthUser {
  authUserId: string;
  authProvider: string;
  email: string | null;
  phone: string | null;
}

// Delegates JWT verification to Supabase's Auth API (rather than verifying
// the signature locally) -- simplest correct option, and consistent with
// this project not maintaining any bespoke crypto/session code elsewhere.
export async function verifyAccessToken(
  supabase: SupabaseClient,
  accessToken: string
): Promise<VerifiedAuthUser | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return {
    authUserId: data.user.id,
    authProvider: data.user.app_metadata?.provider ?? "email",
    email: data.user.email ?? null,
    phone: data.user.phone ?? null,
  };
}
