import type { AccountType, AppUser } from "@blockwise/types";
import type { AppUserRecord, AuthRepository, UpdateProfileInput } from "./repository";
import type { VerifiedAuthUser } from "./verifyToken";

export function toAppUser(record: AppUserRecord, isNeighborhoodAdmin: boolean, isSuperAdmin: boolean): AppUser {
  return {
    id: record.id,
    is_anonymous: record.isAnonymous,
    account_type: record.accountType,
    email: record.email,
    phone: record.phone,
    display_name: record.displayName,
    avatar_url: record.avatarUrl,
    avatar_style: record.avatarStyle,
    mushroom_customization: record.mushroomCustomization,
    username: record.username,
    visibility: record.visibility,
    created_at: record.createdAt,
    is_neighborhood_admin: isNeighborhoodAdmin,
    is_super_admin: isSuperAdmin,
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
    avatarUrl: verified.avatarUrl,
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

// Self-service profile edit (BACKLOG.md "User profiles with public or
// private visibility"). Only fields present in `input` are changed -- a
// field explicitly set to null clears it, one simply omitted is left alone.
// Blank display names are treated as "not set" rather than stored as an
// empty string.
export async function updateProfile(
  user: AppUserRecord,
  input: UpdateProfileInput,
  repository: AuthRepository
): Promise<AppUserRecord> {
  const patch: UpdateProfileInput = {};
  if ("displayName" in input) {
    const trimmed = input.displayName?.trim();
    patch.displayName = trimmed ? trimmed : null;
  }
  if ("avatarStyle" in input) patch.avatarStyle = input.avatarStyle;
  if ("mushroomCustomization" in input) patch.mushroomCustomization = input.mushroomCustomization;
  if ("username" in input) {
    const trimmed = input.username?.trim().toLowerCase();
    patch.username = trimmed ? trimmed : null;
  }
  if ("visibility" in input) patch.visibility = input.visibility;

  return repository.updateProfile(user.id, patch);
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
  if (deviceUser?.id === user.id) return { status: "ok", user };

  // Device already belongs to a different authenticated account (e.g. a
  // shared or reset device) -- don't steal it.
  if (deviceUser && !deviceUser.isAnonymous) return { status: "ok", user };

  if (!deviceUser) {
    // First time this device has ever been seen -- nothing to merge, but it
    // still needs to be linked to the account now. Otherwise every check-in
    // made from it afterward looks up this same (still-unclaimed) device id,
    // finds no account, and silently creates a brand-new anonymous app_user
    // instead of attributing to the account just logged into.
    const linked = await repository.linkDevice(user.id, anonymousDeviceId);
    return { status: "ok", user: linked };
  }

  const merged = await repository.mergeAnonymousHistory(user.id, deviceUser.id, anonymousDeviceId);
  return { status: "ok", user: merged };
}
