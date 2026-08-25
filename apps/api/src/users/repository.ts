import type { AccountType, MushroomCustomization, ProfileVisibility } from "@blockwise/types";

export interface AdminUserRecord {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  accountType: AccountType;
  visibility: ProfileVisibility;
  createdAt: string;
  isNeighborhoodAdmin: boolean;
  isSuperAdmin: boolean;
  // How the account signed up -- Supabase's app_metadata.provider at token
  // verification time (verifyToken.ts), "email" when there's no OAuth
  // provider. Null only for rows old enough to predate this column.
  authProvider: string | null;
  // Stamped by AuthRepository.recordLogin on every real POST
  // /auth/complete-login -- backs the admin user list's "Last login" column.
  lastLoginAt: string;
  // Lets the admin user list render each account's real current mushroom
  // (a saved customizer choice, when present) rather than only the
  // hash-derived default -- unlike the neighborhood claims admin page's
  // mushroomConfigForUser(claim.claimed_by_user_id), this list is a user's
  // own account row, so showing the wrong look (their auto default instead
  // of what they actually customized) reads as a bug, not a stand-in.
  mushroomCustomization: MushroomCustomization | null;
}

// Abstracts persistence so users.ts's listing logic can be tested against
// an in-memory fake, mirroring feedback/repository.ts.
export interface UserRepository {
  listUsersForAdmin(): Promise<AdminUserRecord[]>;
}
