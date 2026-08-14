import type { AppUserAdminView } from "@blockwise/types";
import type { AdminUserRecord, UserRepository } from "./repository";

function toAppUserAdminView(record: AdminUserRecord): AppUserAdminView {
  return {
    id: record.id,
    email: record.email,
    display_name: record.displayName,
    username: record.username,
    account_type: record.accountType,
    visibility: record.visibility,
    created_at: record.createdAt,
    is_neighborhood_admin: record.isNeighborhoodAdmin,
    is_super_admin: record.isSuperAdmin,
  };
}

export async function listUsersForAdmin(repository: UserRepository): Promise<AppUserAdminView[]> {
  const records = await repository.listUsersForAdmin();
  return records.map(toAppUserAdminView);
}
