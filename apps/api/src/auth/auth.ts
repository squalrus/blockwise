import type { AccountType, AppUser } from "@blockwise/types";
import type { AppUserRecord, AuthRepository } from "./repository";
import type { VerifiedAuthUser } from "./verifyToken";

export function toAppUser(record: AppUserRecord, isNeighborhoodAdmin: boolean): AppUser {
  return {
    id: record.id,
    is_anonymous: record.isAnonymous,
    account_type: record.accountType,
    email: record.email,
    phone: record.phone,
    created_at: record.createdAt,
    is_neighborhood_admin: isNeighborhoodAdmin,
  };
}

// README §14.2: signing up completes the same app_user row rather than
// migrating data, so a repeat call for the same auth user (e.g. a retried
// request) is a no-op that just returns the existing row.
export async function completeSignup(
  verified: VerifiedAuthUser,
  accountType: AccountType,
  anonymousDeviceId: string | null,
  repository: AuthRepository
): Promise<AppUserRecord> {
  const existing = await repository.getByAuthUserId(verified.authUserId);
  if (existing) return existing;

  return repository.completeSignup({
    authUserId: verified.authUserId,
    authProvider: verified.authProvider,
    email: verified.email,
    phone: verified.phone,
    accountType,
    anonymousDeviceId,
  });
}

// Lets a signed-in consumer account become a business account in place --
// same row, same identity, no separate signup -- so a user who created a
// consumer account before deciding to claim a venue isn't stuck starting
// over. Idempotent if the account is already a business account.
export async function promoteToBusiness(
  user: AppUserRecord,
  repository: AuthRepository
): Promise<AppUserRecord> {
  if (user.accountType === "business") return user;
  return repository.updateAccountType(user.id, "business");
}

export type CompleteLoginResult =
  | { status: "ok"; user: AppUserRecord }
  | { status: "not_signed_up" };

// README §14.2 edge case: if the device being logged in on already
// accumulated anonymous check-in/badge history under a *different* app_user
// row than the account being logged into, fold that history into the
// authenticated row rather than losing it or leaving it orphaned.
export async function completeLogin(
  verified: VerifiedAuthUser,
  anonymousDeviceId: string | null,
  repository: AuthRepository
): Promise<CompleteLoginResult> {
  const user = await repository.getByAuthUserId(verified.authUserId);
  if (!user) return { status: "not_signed_up" };

  if (!anonymousDeviceId) return { status: "ok", user };

  const deviceUser = await repository.getByAnonymousDeviceId(anonymousDeviceId);
  if (!deviceUser || !deviceUser.isAnonymous || deviceUser.id === user.id) {
    return { status: "ok", user };
  }

  const merged = await repository.mergeAnonymousHistory(user.id, deviceUser.id, anonymousDeviceId);
  return { status: "ok", user: merged };
}
