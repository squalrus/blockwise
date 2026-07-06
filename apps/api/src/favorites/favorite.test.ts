import { describe, expect, it } from "vitest";
import { addFavorite, getFavoriteStatus, removeFavorite } from "./favorite";
import type { FavoriteRecord, FavoriteRepository } from "./repository";

// In-memory fake, mirroring FakeCheckinRepository in checkins/checkin.test.ts.
class FakeFavoriteRepository implements FavoriteRepository {
  users = new Map<string, string>(); // anonymousDeviceId -> userId
  favorites: FavoriteRecord[] = [];
  private nextId = 1;

  constructor(private readonly venueIds: Set<string>) {}

  async venueExists(venueId: string): Promise<boolean> {
    return this.venueIds.has(venueId);
  }

  async getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string> {
    let userId = this.users.get(anonymousDeviceId);
    if (!userId) {
      userId = `user-${this.users.size + 1}`;
      this.users.set(anonymousDeviceId, userId);
    }
    return userId;
  }

  async getFavorite(userId: string, venueId: string): Promise<FavoriteRecord | null> {
    return this.favorites.find((f) => f.userId === userId && f.venueId === venueId) ?? null;
  }

  async createFavorite(userId: string, venueId: string): Promise<FavoriteRecord> {
    const record: FavoriteRecord = {
      id: `favorite-${this.nextId++}`,
      userId,
      venueId,
      createdAt: new Date().toISOString(),
    };
    this.favorites.push(record);
    return record;
  }

  async deleteFavorite(userId: string, venueId: string): Promise<void> {
    this.favorites = this.favorites.filter((f) => !(f.userId === userId && f.venueId === venueId));
  }
}

describe("addFavorite", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeFavoriteRepository(new Set());
    const result = await addFavorite("missing-venue", "device-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("creates a favorite and reuses the same anonymous user on repeat calls", async () => {
    const repo = new FakeFavoriteRepository(new Set(["venue-1"]));

    const first = await addFavorite("venue-1", "device-1", repo);
    expect(first.status).toBe("created");

    const second = await addFavorite("venue-1", "device-1", repo);
    expect(second.status).toBe("already_favorited");
    if (first.status !== "not_found" && second.status !== "not_found") {
      expect(second.favorite.user_id).toBe(first.favorite.user_id);
    }
    expect(repo.favorites).toHaveLength(1);
  });
});

describe("removeFavorite", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeFavoriteRepository(new Set());
    const result = await removeFavorite("missing-venue", "device-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("removes an existing favorite", async () => {
    const repo = new FakeFavoriteRepository(new Set(["venue-1"]));
    await addFavorite("venue-1", "device-1", repo);

    const result = await removeFavorite("venue-1", "device-1", repo);
    expect(result).toEqual({ status: "removed" });
    expect(repo.favorites).toHaveLength(0);
  });

  it("is a no-op when the venue was never favorited", async () => {
    const repo = new FakeFavoriteRepository(new Set(["venue-1"]));
    const result = await removeFavorite("venue-1", "device-1", repo);
    expect(result).toEqual({ status: "removed" });
  });
});

describe("getFavoriteStatus", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeFavoriteRepository(new Set());
    const result = await getFavoriteStatus("missing-venue", "device-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("reports false when not favorited, true after favoriting", async () => {
    const repo = new FakeFavoriteRepository(new Set(["venue-1"]));

    const before = await getFavoriteStatus("venue-1", "device-1", repo);
    expect(before).toEqual({ status: "found", favorited: false });

    await addFavorite("venue-1", "device-1", repo);

    const after = await getFavoriteStatus("venue-1", "device-1", repo);
    expect(after).toEqual({ status: "found", favorited: true });
  });
});
