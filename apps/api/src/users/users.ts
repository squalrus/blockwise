import type { AppUserAdminView } from "@blockwise/types";
import type { PushSubscriptionRepository } from "../pushSubscriptions/repository";
import type { AdminUserRecord, UserRepository } from "./repository";

function toAppUserAdminView(record: AdminUserRecord, pushEnabledUserIds: Set<string>): AppUserAdminView {
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
    mushroom_customization: record.mushroomCustomization,
    has_push_enabled: pushEnabledUserIds.has(record.id),
    auth_provider: record.authProvider,
    last_login_at: record.lastLoginAt,
  };
}

export async function listUsersForAdmin(
  repository: UserRepository,
  pushSubscriptionRepository: PushSubscriptionRepository
): Promise<AppUserAdminView[]> {
  const records = await repository.listUsersForAdmin();
  // One batched lookup for every listed account rather than N per-user
  // queries -- presence of any row is all "has_push_enabled" needs, so the
  // subscription's own fields (endpoint/keys) are discarded here.
  const subscriptions = await pushSubscriptionRepository.listForUsers(records.map((r) => r.id));
  const pushEnabledUserIds = new Set(subscriptions.map((s) => s.userId));
  return records.map((record) => toAppUserAdminView(record, pushEnabledUserIds));
}
