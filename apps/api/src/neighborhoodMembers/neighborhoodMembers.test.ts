import { describe, expect, it } from "vitest";
import {
  joinNeighborhood,
  leaveNeighborhood,
  listMembershipsForUser,
  setHomeNeighborhood,
} from "./neighborhoodMembers";
import type {
  NeighborhoodMemberRecord,
  NeighborhoodMemberRepository,
  NeighborhoodMembershipSummary,
} from "./repository";

// In-memory fake, mirroring FakeFavoriteRepository in favorites/favorite.test.ts.
class FakeNeighborhoodMemberRepository implements NeighborhoodMemberRepository {
  memberships: NeighborhoodMemberRecord[] = [];
  private nextId = 1;

  constructor(
    private readonly neighborhoodIds: Set<string>,
    private readonly neighborhoodInfo: Map<string, { name: string; slug: string; city: string; state: string }>
  ) {}

  async neighborhoodExists(neighborhoodId: string): Promise<boolean> {
    return this.neighborhoodIds.has(neighborhoodId);
  }

  async getMembership(
    userId: string,
    neighborhoodId: string
  ): Promise<NeighborhoodMemberRecord | null> {
    return (
      this.memberships.find((m) => m.userId === userId && m.neighborhoodId === neighborhoodId) ??
      null
    );
  }

  async createMembership(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord> {
    const record: NeighborhoodMemberRecord = {
      id: `membership-${this.nextId++}`,
      userId,
      neighborhoodId,
      isPrimary: false,
      createdAt: new Date().toISOString(),
    };
    this.memberships.push(record);
    return record;
  }

  async deleteMembership(userId: string, neighborhoodId: string): Promise<void> {
    this.memberships = this.memberships.filter(
      (m) => !(m.userId === userId && m.neighborhoodId === neighborhoodId)
    );
  }

  async listMembershipsForUser(userId: string): Promise<NeighborhoodMembershipSummary[]> {
    return this.memberships
      .filter((m) => m.userId === userId)
      .map((m) => {
        const info = this.neighborhoodInfo.get(m.neighborhoodId)!;
        return {
          neighborhoodId: m.neighborhoodId,
          name: info.name,
          slug: info.slug,
          city: info.city,
          state: info.state,
          isPrimary: m.isPrimary,
        };
      });
  }

  async setPrimary(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord> {
    this.memberships = this.memberships.map((m) =>
      m.userId === userId ? { ...m, isPrimary: m.neighborhoodId === neighborhoodId } : m
    );
    return this.memberships.find(
      (m) => m.userId === userId && m.neighborhoodId === neighborhoodId
    )!;
  }

  async countMembersForNeighborhood(neighborhoodId: string): Promise<number> {
    return this.memberships.filter((m) => m.neighborhoodId === neighborhoodId).length;
  }
}

function makeRepo() {
  return new FakeNeighborhoodMemberRepository(
    new Set(["hood-1", "hood-2"]),
    new Map([
      ["hood-1", { name: "Phinneywood", slug: "phinneywood", city: "Seattle", state: "WA" }],
      ["hood-2", { name: "Ballard", slug: "ballard", city: "Seattle", state: "WA" }],
    ])
  );
}

describe("joinNeighborhood", () => {
  it("returns not_found for an unknown neighborhood", async () => {
    const repo = makeRepo();
    const result = await joinNeighborhood("missing", "user-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("creates a membership and is idempotent on repeat calls", async () => {
    const repo = makeRepo();

    const first = await joinNeighborhood("hood-1", "user-1", repo);
    expect(first.status).toBe("created");

    const second = await joinNeighborhood("hood-1", "user-1", repo);
    expect(second.status).toBe("already_joined");
    expect(repo.memberships).toHaveLength(1);
  });

  it("sets a first join as home automatically", async () => {
    const repo = makeRepo();

    const result = await joinNeighborhood("hood-1", "user-1", repo);
    expect(result.status).toBe("created");
    if (result.status === "created") expect(result.membership.isPrimary).toBe(true);

    const memberships = await listMembershipsForUser("user-1", repo);
    expect(memberships.find((m) => m.neighborhood_id === "hood-1")?.is_primary).toBe(true);
  });

  it("does not change home when joining a second neighborhood", async () => {
    const repo = makeRepo();

    await joinNeighborhood("hood-1", "user-1", repo);
    const second = await joinNeighborhood("hood-2", "user-1", repo);
    expect(second.status).toBe("created");
    if (second.status === "created") expect(second.membership.isPrimary).toBe(false);

    const memberships = await listMembershipsForUser("user-1", repo);
    expect(memberships.find((m) => m.neighborhood_id === "hood-1")?.is_primary).toBe(true);
    expect(memberships.find((m) => m.neighborhood_id === "hood-2")?.is_primary).toBe(false);
  });
});

describe("leaveNeighborhood", () => {
  it("returns not_found for an unknown neighborhood", async () => {
    const repo = makeRepo();
    const result = await leaveNeighborhood("missing", "user-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("removes an existing membership", async () => {
    const repo = makeRepo();
    await joinNeighborhood("hood-1", "user-1", repo);

    const result = await leaveNeighborhood("hood-1", "user-1", repo);
    expect(result).toEqual({ status: "removed" });
    expect(repo.memberships).toHaveLength(0);
  });
});

describe("setHomeNeighborhood", () => {
  it("returns not_a_member when the user hasn't joined", async () => {
    const repo = makeRepo();
    const result = await setHomeNeighborhood("hood-1", "user-1", repo);
    expect(result).toEqual({ status: "not_a_member" });
  });

  it("marks exactly one membership as primary, clearing any previous one", async () => {
    const repo = makeRepo();
    await joinNeighborhood("hood-1", "user-1", repo);
    await joinNeighborhood("hood-2", "user-1", repo);

    await setHomeNeighborhood("hood-1", "user-1", repo);
    let memberships = await listMembershipsForUser("user-1", repo);
    expect(memberships.find((m) => m.neighborhood_id === "hood-1")?.is_primary).toBe(true);
    expect(memberships.find((m) => m.neighborhood_id === "hood-2")?.is_primary).toBe(false);

    await setHomeNeighborhood("hood-2", "user-1", repo);
    memberships = await listMembershipsForUser("user-1", repo);
    expect(memberships.find((m) => m.neighborhood_id === "hood-1")?.is_primary).toBe(false);
    expect(memberships.find((m) => m.neighborhood_id === "hood-2")?.is_primary).toBe(true);
  });
});
