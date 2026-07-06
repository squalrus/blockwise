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

// The redirect through Google loses whatever account-type choice was made
// on the signup form, so stash it here and pick it back up in
// completeOAuthSignIn. Login's Google button doesn't set this -- a repeat
// login doesn't need an account type, and completeSignup only consults it
// the first time an auth user is seen.
const PENDING_ACCOUNT_TYPE_KEY = "blockwise_pending_account_type";

export async function signInWithGoogle(accountType?: AccountType): Promise<void> {
  if (accountType) window.localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);

  const { error } = await getBrowserSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

// Google sign-in doesn't tell us up front whether this is a first-time
// signup or a repeat login (unlike the email/password forms, which know
// which button was pressed) -- so try login first, since it's the one that
// also merges this device's anonymous history (see completeLogin's README
// §14.2 note), and only fall back to signup for a first-time auth user.
export async function completeOAuthSignIn(): Promise<AppUser> {
  const { data } = await getBrowserSupabaseClient().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("No session found after sign-in -- please try again.");

  const anonymousDeviceId = getOrCreateDeviceId();
  const loginRes = await fetch(clientApiUrl("/auth/complete-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ anonymous_device_id: anonymousDeviceId }),
  });
  if (loginRes.ok) return loginRes.json();
  if (loginRes.status !== 404) {
    const error = await loginRes.json().catch(() => ({}));
    throw new Error(error.error ?? "Request to /auth/complete-login failed");
  }

  const accountType = (window.localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) as AccountType | null) ?? "consumer";
  window.localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);

  return completeAuth("/auth/complete-signup", accessToken, {
    anonymous_device_id: anonymousDeviceId,
    account_type: accountType,
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

export async function promoteToBusiness(): Promise<AppUser> {
  const token = await getAccessToken();
  if (!token) throw new Error("You must be signed in to do this.");

  const res = await fetch(clientApiUrl("/auth/promote-to-business"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? "Failed to upgrade to a business account");
  }
  return res.json();
}
