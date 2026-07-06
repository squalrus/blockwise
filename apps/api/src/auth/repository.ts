import type { AccountType } from "@blockwise/types";

export interface AppUserRecord {
  id: string;
  isAnonymous: boolean;
  accountType: AccountType;
  authUserId: string | null;
  authProvider: string | null;
  email: string | null;
  phone: string | null;
  anonymousDeviceId: string | null;
  createdAt: string;
}

export interface CompleteSignupInput {
  authUserId: string;
  authProvider: string;
  email: string | null;
  phone: string | null;
  accountType: AccountType;
  // Present when the device had prior anonymous history to claim (README
  // §14.2) -- the row it identifies, if still anonymous, gets converted in
  // place rather than migrated.
  anonymousDeviceId: string | null;
}

// Abstracts persistence so the signup/login linking logic (auth.ts) can be
// tested against an in-memory fake, mirroring checkins/repository.ts.
export interface AuthRepository {
  getByAuthUserId(authUserId: string): Promise<AppUserRecord | null>;
  getByAnonymousDeviceId(deviceId: string): Promise<AppUserRecord | null>;
  // Converts the anonymous row for anonymousDeviceId into an authenticated
  // one (README §14.2: "signing up doesn't migrate data -- it completes the
  // same row"), or creates a fresh row if no anonymous row exists for that
  // device, or one exists but already belongs to a different auth user.
  completeSignup(input: CompleteSignupInput): Promise<AppUserRecord>;
  // README §14.2 edge case: reassigns an anonymous device's check-in history
  // onto the already-authenticated account being logged into, then removes
  // the now-empty anonymous row.
  mergeAnonymousHistory(
    targetUserId: string,
    anonymousUserId: string,
    deviceId: string
  ): Promise<AppUserRecord>;
}
