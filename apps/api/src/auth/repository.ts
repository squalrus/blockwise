import type { AccountType, AvatarStyle, MushroomCustomization, ProfileVisibility } from "@blockwise/types";

export interface AppUserRecord {
  id: string;
  accountType: AccountType;
  authUserId: string | null;
  authProvider: string | null;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  avatarStyle: AvatarStyle;
  mushroomCustomization: MushroomCustomization | null;
  username: string | null;
  visibility: ProfileVisibility;
  createdAt: string;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  // avatarUrl is intentionally absent -- it's seeded once from the OAuth
  // provider at signup (CompleteSignupInput.avatarUrl below) and is never
  // client-settable afterward, closing off arbitrary/explicit-content image
  // URLs. avatarStyle (social vs. mushroom) is the only avatar choice a user
  // can make via PATCH /me/profile.
  avatarStyle?: AvatarStyle;
  // BACKLOG.md Ref 75 "Mushroom avatar customizer" -- null clears back to the
  // hash-derived default (mushroomConfigForUser); already validated against
  // the approved cap/stalk/pattern enum by the route handler before this
  // point, so the repository just persists it.
  mushroomCustomization?: MushroomCustomization | null;
  username?: string | null;
  visibility?: ProfileVisibility;
}

export interface CompleteSignupInput {
  authUserId: string;
  authProvider: string;
  email: string | null;
  phone: string | null;
  // Google's OAuth profile picture (BACKLOG.md "Show profile picture from
  // Google") -- seeds avatar_url on a fresh signup only; never touched again
  // afterward, so a later manual edit (or manual clear) via PATCH /me/profile
  // always wins.
  avatarUrl: string | null;
  accountType: AccountType;
}

// BACKLOG.md "User profiles with public or private visibility": PATCH
// /me/profile setting a username already taken by another account.
export class UsernameTakenError extends Error {
  constructor(username: string) {
    super(`Username "${username}" is already taken`);
    this.name = "UsernameTakenError";
  }
}

// Abstracts persistence so the signup/login linking logic (auth.ts) can be
// tested against an in-memory fake, mirroring checkins/repository.ts.
export interface AuthRepository {
  getByAuthUserId(authUserId: string): Promise<AppUserRecord | null>;
  // BACKLOG.md "Public user profiles": the username-keyed lookup backing
  // GET /users/:username, mirroring how neighborhoods resolve by slug.
  getByUsername(username: string): Promise<AppUserRecord | null>;
  // Creates a fresh app_user row for a newly authenticated Supabase user.
  completeSignup(input: CompleteSignupInput): Promise<AppUserRecord>;
  // Flips an existing account's account_type in place -- same row, same
  // identity, no new signup. Used to let a consumer account become a
  // business account (e.g. after claiming a venue) without creating a
  // second account for the same person.
  updateAccountType(userId: string, accountType: AccountType): Promise<AppUserRecord>;
  // Self-service profile edit (display name, avatar, public/private
  // visibility) -- only ever called for the caller's own row (requireAuthUser
  // resolves req.appUser from the caller's own token), never another user's.
  updateProfile(userId: string, input: UpdateProfileInput): Promise<AppUserRecord>;
}
