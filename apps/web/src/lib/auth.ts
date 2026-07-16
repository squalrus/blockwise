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

  const user = await completeAuth("/auth/complete-signup", data.session.access_token, {
    anonymous_device_id: getOrCreateDeviceId(),
    account_type: accountType,
  });
  setCachedUser(user);
  return user;
}

export async function logIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const user = await completeAuth("/auth/complete-login", data.session.access_token, {
    anonymous_device_id: getOrCreateDeviceId(),
  });
  setCachedUser(user);
  return user;
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
  if (loginRes.ok) {
    const user = await loginRes.json();
    setCachedUser(user);
    return user;
  }
  if (loginRes.status !== 404) {
    const error = await loginRes.json().catch(() => ({}));
    throw new Error(error.error ?? "Request to /auth/complete-login failed");
  }

  const accountType = (window.localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) as AccountType | null) ?? "consumer";
  window.localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);

  const user = await completeAuth("/auth/complete-signup", accessToken, {
    anonymous_device_id: anonymousDeviceId,
    account_type: accountType,
  });
  setCachedUser(user);
  return user;
}

export async function logOut(): Promise<void> {
  await getBrowserSupabaseClient().auth.signOut();
  setCachedUser(null);
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getBrowserSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}

async function fetchCurrentUser(): Promise<AppUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(clientApiUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Every caller of getCurrentUser() (16+ components, from the nav pill down
// to one-off "am I signed in" checks) independently re-fetched /auth/me on
// its own mount with no sharing -- harmless individually, but on a page like
// /checkin it meant the slide-to-check-in thumb's mushroom only appeared
// after its own private round trip, visibly "popping in" after the rest of
// the page had already settled. Caching the in-flight/resolved promise here
// means every caller mounted in the same navigation shares one fetch (and
// resolves together), and callers that already have a fresh AppUser
// (login/signup/promote, or a profile-save response) can push it in via
// setCachedUser instead of forcing a refetch. Lives only as long as this
// module instance -- i.e. resets on a hard reload, survives client-side
// navigation.
let cachedUserPromise: Promise<AppUser | null> | null = null;

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!cachedUserPromise) {
    cachedUserPromise = fetchCurrentUser();
  }
  return cachedUserPromise;
}

export function setCachedUser(user: AppUser | null): void {
  cachedUserPromise = Promise.resolve(user);
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
  const user = await res.json();
  setCachedUser(user);
  return user;
}
