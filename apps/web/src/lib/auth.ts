import type { AccountType, AppUser } from "@blockwise/types";
import { clientApiUrl } from "./clientApi";
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

// When "Confirm email" is on (the production setting), signUp() returns no
// session -- the account_type chosen here has to survive until the user
// clicks the confirmation link and lands back on /auth/callback, possibly in
// a new tab, so it's stashed the same way the Google OAuth flow stashes it.
// Without emailRedirectTo, Supabase's default Site URL points at the app
// root rather than /auth/callback, so the confirmation link never runs
// completeSignInRedirect and no app_user row gets created.
export async function signUp(
  email: string,
  password: string,
  accountType: AccountType
): Promise<AppUser> {
  window.localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);

  const { data, error } = await getBrowserSupabaseClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error(
      "Account created -- check your email to confirm it, then log in. (If this is local dev, disable \"Confirm email\" under Supabase Auth settings.)"
    );
  }

  window.localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
  const user = await completeAuth("/auth/complete-signup", data.session.access_token, {
    account_type: accountType,
  });
  setCachedUser(user);
  return user;
}

// Falls back to signup on a 404/not_signed_up rather than hard-failing --
// this is what makes the eel-avatar-pumice@duck.com incident (Supabase
// confirmed the email, but no app_user row existed to log into) self-heal
// instead of permanently locking the account out. Shared with
// completeSignInRedirect below, which needs the identical fallback for the
// OAuth/email-confirmation redirect.
async function completeLoginOrSignup(accessToken: string): Promise<AppUser> {
  const loginRes = await fetch(clientApiUrl("/auth/complete-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
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
    account_type: accountType,
  });
  setCachedUser(user);
  return user;
}

export async function logIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  return completeLoginOrSignup(data.session.access_token);
}

// The redirect through Google (or through the email confirmation link) loses
// whatever account-type choice was made on the signup form, so both signUp
// and signInWithGoogle stash it here and completeSignInRedirect picks it back
// up. Login's Google button doesn't set this -- a repeat login doesn't need
// an account type, and completeSignup only consults it the first time an
// auth user is seen.
const PENDING_ACCOUNT_TYPE_KEY = "blockwise_pending_account_type";

export async function signInWithGoogle(accountType?: AccountType): Promise<void> {
  if (accountType) window.localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);

  const { error } = await getBrowserSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message);
}

// Shared by /auth/callback for both the Google OAuth redirect and the
// email-confirmation link (see emailRedirectTo in signUp above). Neither
// case tells us up front whether this is a first-time signup or a repeat
// login (unlike the email/password login form, which knows which button was
// pressed) -- completeLoginOrSignup handles that by trying login first, and
// only falling back to signup for a first-time auth user.
export async function completeSignInRedirect(): Promise<AppUser> {
  const { data } = await getBrowserSupabaseClient().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("No session found after sign-in -- please try again.");

  return completeLoginOrSignup(accessToken);
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
