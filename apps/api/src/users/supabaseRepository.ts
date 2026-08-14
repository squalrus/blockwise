import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountType, ProfileVisibility } from "@blockwise/types";
import type { AdminUserRecord, UserRepository } from "./repository";

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  account_type: AccountType;
  visibility: ProfileVisibility;
  created_at: string;
};

const COLUMNS = "id, email, display_name, username, account_type, visibility, created_at";

export class SupabaseUserRepository implements UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listUsersForAdmin(): Promise<AdminUserRecord[]> {
    // Role grants live in their own tables (neighborhood_admin, super_admin,
    // BACKLOG.md "super admin"), not on app_user itself -- fetched
    // separately (not per-row) and turned into Sets, same shape as
    // NeighborhoodAdminRepository/SuperAdminRepository's own queries.
    const [usersResult, neighborhoodAdminsResult, superAdminsResult] = await Promise.all([
      this.supabase.from("app_user").select(COLUMNS).order("created_at", { ascending: false }),
      this.supabase.from("neighborhood_admin").select("user_id"),
      this.supabase.from("super_admin").select("user_id"),
    ]);

    if (usersResult.error) throw new Error(`listUsersForAdmin failed: ${usersResult.error.message}`);
    if (neighborhoodAdminsResult.error) throw new Error(`listUsersForAdmin failed: ${neighborhoodAdminsResult.error.message}`);
    if (superAdminsResult.error) throw new Error(`listUsersForAdmin failed: ${superAdminsResult.error.message}`);

    const neighborhoodAdminIds = new Set((neighborhoodAdminsResult.data ?? []).map((row) => row.user_id as string));
    const superAdminIds = new Set((superAdminsResult.data ?? []).map((row) => row.user_id as string));

    return ((usersResult.data ?? []) as Row[]).map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      username: row.username,
      accountType: row.account_type,
      visibility: row.visibility,
      createdAt: row.created_at,
      isNeighborhoodAdmin: neighborhoodAdminIds.has(row.id),
      isSuperAdmin: superAdminIds.has(row.id),
    }));
  }
}
