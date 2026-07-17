import type { AccountType, AppUser } from "@blockwise/types";
import type { AppUserRecord, AuthRepository, UpdateProfileInput } from "./repository";
import type { VerifiedAuthUser } from "./verifyToken";

export function toAppUser(record: AppUserRecord, isNeighborhoodAdmin: boolean, isSuperAdmin: boolean): AppUser {
  return {
    id: record.id,
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

// A repeat call for the same auth user (e.g. a retried request) is a no-op
// that just returns the existing row, rather than erroring on the unique
// auth_user_id constraint.
export async function completeSignup(
  verified: VerifiedAuthUser,
  accountType: AccountType,
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

export async function completeLogin(
  verified: VerifiedAuthUser,
  repository: AuthRepository
): Promise<CompleteLoginResult> {
  const user = await repository.getByAuthUserId(verified.authUserId);
  if (!user) return { status: "not_signed_up" };

  return { status: "ok", user };
}
