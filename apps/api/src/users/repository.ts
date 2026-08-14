import type { AccountType, ProfileVisibility } from "@blockwise/types";

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
}

// Abstracts persistence so users.ts's listing logic can be tested against
// an in-memory fake, mirroring feedback/repository.ts.
export interface UserRepository {
  listUsersForAdmin(): Promise<AdminUserRecord[]>;
}
