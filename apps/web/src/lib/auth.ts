import type { AccountType, AppUser } from "@blockwise/types";
import { clientApiUrl } from "./clientApi";
import { getOrCreateDeviceId } from "./deviceId";
import { getBrowserSupabaseClient } from "./supabaseClient";

async function completeAuth(path: "/auth/complete-signup" | "/auth/complete-login", accessToken: string, body: object): Promise<AppUser> {
  const res = await fetch(clientApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Request to ${path} failed`);
  }
  return res.json();
}

// README §14.2: the device's existing anonymous check-in history (if any)
// gets attached by passing its id along -- the same app_user row is
// completed, not migrated.
export async function signUp(
  email: string,
  password: string,
  accountType: AccountType
): Promise<AppUser> {
  const { data, error } = await getBrowserSupabaseClient().auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error(
      "Account created -- check your email to confirm it, then log in. (If this is local dev, disable \"Confirm email\" under Supabase Auth settings.)"
    );
  }

  return completeAuth("/auth/complete-signup", data.session.access_token, {
    anonymous_device_id: getOrCreateDeviceId(),
    account_type: accountType,
  });
}

export async function logIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  return completeAuth("/auth/complete-login", data.session.access_token, {
    anonymous_device_id: getOrCreateDeviceId(),
  });
}

export async function logOut(): Promise<void> {
  await getBrowserSupabaseClient().auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getBrowserSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(clientApiUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}
