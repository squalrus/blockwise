import { describe, expect, it } from "vitest";
import { listUsersForAdmin } from "./users";
import type { AdminUserRecord, UserRepository } from "./repository";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "../pushSubscriptions/repository";

// In-memory fake, mirroring FakeFeedbackRepository in feedback/feedback.test.ts.
class FakeUserRepository implements UserRepository {
  constructor(private readonly records: AdminUserRecord[]) {}

  async listUsersForAdmin(): Promise<AdminUserRecord[]> {
    return this.records;
  }
}

// Only listForUsers is exercised by listUsersForAdmin -- the rest throw so a
// test that accidentally relies on them fails loudly instead of silently
// returning undefined.
class FakePushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly subscribedUserIds: string[] = []) {}

  async listForUsers(userIds: string[]): Promise<PushSubscriptionRecord[]> {
    return this.subscribedUserIds
      .filter((id) => userIds.includes(id))
      .map((userId) => ({ id: `sub-${userId}`, userId, endpoint: `https://push.example/${userId}`, keys: { p256dh: "", auth: "" }, createdAt: "2026-07-01T00:00:00.000Z" }));
  }

  upsertSubscription(): Promise<PushSubscriptionRecord> {
    throw new Error("not implemented");
  }
  getSubscription(): Promise<PushSubscriptionRecord | null> {
    throw new Error("not implemented");
  }
  deleteSubscription(): Promise<void> {
    throw new Error("not implemented");
  }
  listForUser(): Promise<PushSubscriptionRecord[]> {
    throw new Error("not implemented");
  }
}

describe("listUsersForAdmin", () => {
  it("maps repository records to the snake_case admin view shape", async () => {
    const customization = {
      shape: "oyster",
      cap: "#4A5FA5",
      stalk: "#FBF2E4",
      spots: "#FBF2E4",
      bg: "#DCEBD3",
      spotCount: 3,
      spotShape: "circle",
    };
    const repo = new FakeUserRepository([
      {
        id: "user-1",
        email: "neighbor@example.com",
        displayName: "Neighbor One",
        username: "neighbor1",
        accountType: "consumer",
        visibility: "public",
        createdAt: "2026-07-01T00:00:00.000Z",
        isNeighborhoodAdmin: false,
        isSuperAdmin: false,
        mushroomCustomization: customization,
        authProvider: "google",
        lastLoginAt: "2026-08-20T12:30:00.000Z",
      },
    ]);

    const result = await listUsersForAdmin(repo, new FakePushSubscriptionRepository(["user-1"]));

    expect(result).toEqual([
      {
        id: "user-1",
        email: "neighbor@example.com",
        display_name: "Neighbor One",
        username: "neighbor1",
        account_type: "consumer",
        visibility: "public",
        created_at: "2026-07-01T00:00:00.000Z",
        is_neighborhood_admin: false,
        is_super_admin: false,
        mushroom_customization: customization,
        has_push_enabled: true,
        auth_provider: "google",
        last_login_at: "2026-08-20T12:30:00.000Z",
      },
    ]);
  });

  it("preserves the role-grant flags for a super admin who is also a neighborhood admin", async () => {
    const repo = new FakeUserRepository([
      {
        id: "user-2",
        email: "admin@example.com",
        displayName: null,
        username: null,
        accountType: "business",
        visibility: "private",
        createdAt: "2026-07-02T00:00:00.000Z",
        isNeighborhoodAdmin: true,
        isSuperAdmin: true,
        mushroomCustomization: null,
        authProvider: "email",
        lastLoginAt: "2026-08-20T12:30:00.000Z",
      },
    ]);

    const result = await listUsersForAdmin(repo, new FakePushSubscriptionRepository());

    expect(result[0]).toMatchObject({
      is_neighborhood_admin: true,
      is_super_admin: true,
      mushroom_customization: null,
      has_push_enabled: false,
      auth_provider: "email",
    });
  });

  it("returns an empty list when there are no users", async () => {
    const result = await listUsersForAdmin(new FakeUserRepository([]), new FakePushSubscriptionRepository());
    expect(result).toEqual([]);
  });
});
