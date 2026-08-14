import { describe, expect, it } from "vitest";
import { listUsersForAdmin } from "./users";
import type { AdminUserRecord, UserRepository } from "./repository";

// In-memory fake, mirroring FakeFeedbackRepository in feedback/feedback.test.ts.
class FakeUserRepository implements UserRepository {
  constructor(private readonly records: AdminUserRecord[]) {}

  async listUsersForAdmin(): Promise<AdminUserRecord[]> {
    return this.records;
  }
}

describe("listUsersForAdmin", () => {
  it("maps repository records to the snake_case admin view shape", async () => {
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
      },
    ]);

    const result = await listUsersForAdmin(repo);

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
      },
    ]);

    const result = await listUsersForAdmin(repo);

    expect(result[0]).toMatchObject({ is_neighborhood_admin: true, is_super_admin: true });
  });

  it("returns an empty list when there are no users", async () => {
    const result = await listUsersForAdmin(new FakeUserRepository([]));
    expect(result).toEqual([]);
  });
});
