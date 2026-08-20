import { mushroomConfigForUser } from "@blockwise/types";
import { describe, expect, it } from "vitest";
import { getMushroomCollectionForUser, revealMushroomCollectionEntry } from "./collection";
import type { MushroomCollectionListItem, MushroomCollectionRepository } from "./repository";

// In-memory fake, mirroring FakeFavoriteRepository in favorites/favorite.test.ts.
class FakeMushroomCollectionRepository implements MushroomCollectionRepository {
  items: MushroomCollectionListItem[] = [];
  private nextId = 1;

  async recordVenueCollection(userId: string, venueId: string): Promise<boolean> {
    return this.record("checkin", venueId, `Venue ${venueId}`);
  }

  async recordConnectionCollection(userId: string, connectionUserId: string): Promise<boolean> {
    return this.record("connection", connectionUserId, `User ${connectionUserId}`);
  }

  private record(sourceType: "checkin" | "connection", sourceId: string, sourceName: string): boolean {
    const existing = this.items.find((i) => i.sourceType === sourceType && i.sourceId === sourceId);
    if (existing) {
      existing.quantity += 1;
      return false;
    }
    this.items.push({
      id: `collection-${this.nextId++}`,
      sourceType,
      sourceId,
      sourceName,
      sourceUsername: sourceType === "connection" ? `user-${sourceId}` : null,
      quantity: 1,
      firstCollectedAt: new Date().toISOString(),
      revealedAt: null,
    });
    return true;
  }

  async listCollectionForUser(_userId: string): Promise<MushroomCollectionListItem[]> {
    return this.items;
  }

  async countCollectionForUser(_userId: string): Promise<number> {
    return this.items.length;
  }

  async revealCollectionItem(_userId: string, id: string): Promise<MushroomCollectionListItem | null> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return null;
    if (item.revealedAt === null) item.revealedAt = new Date().toISOString();
    return item;
  }
}

describe("getMushroomCollectionForUser", () => {
  it("derives a stable species look and name from the source id", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordVenueCollection("user-1", "venue-1");

    const [entry] = await getMushroomCollectionForUser("user-1", repo);
    expect(entry.source_type).toBe("checkin");
    expect(entry.source_id).toBe("venue-1");
    expect(entry.species_name).toBeTruthy();
    expect(entry.mushroom).toMatchObject({ shape: expect.any(String), cap: expect.any(String) });

    // Same source id -> same species look/name every time, regardless of
    // how many times it's re-collected (mirrors mushroomConfigForUser's own
    // determinism guarantee).
    const [again] = await getMushroomCollectionForUser("user-1", repo);
    expect(again.species_name).toBe(entry.species_name);
    expect(again.mushroom).toEqual(entry.mushroom);
  });

  it("bumps quantity on repeat collection of the same source, without creating a second entry", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordVenueCollection("user-1", "venue-1");
    await repo.recordVenueCollection("user-1", "venue-1");
    await repo.recordConnectionCollection("user-1", "user-2");

    const entries = await getMushroomCollectionForUser("user-1", repo);
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.source_id === "venue-1")?.quantity).toBe(2);
    expect(entries.find((e) => e.source_id === "user-2")?.quantity).toBe(1);
  });

  it("a connection's collected species differs from that same user's own avatar", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordConnectionCollection("user-1", "user-2");

    const [entry] = await getMushroomCollectionForUser("user-1", repo);
    // "species:"-namespaced, so it can't coincidentally render identical to
    // user-2's own personal avatar (mushroomConfigForUser("user-2")).
    expect(entry.mushroom).not.toEqual(mushroomConfigForUser("user-2"));
  });

  it("a newly-recorded entry starts unrevealed", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordVenueCollection("user-1", "venue-1");

    const [entry] = await getMushroomCollectionForUser("user-1", repo);
    expect(entry.revealed).toBe(false);
  });
});

describe("revealMushroomCollectionEntry", () => {
  it("flips an entry to revealed", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordVenueCollection("user-1", "venue-1");
    const [{ id }] = await getMushroomCollectionForUser("user-1", repo);

    const revealed = await revealMushroomCollectionEntry("user-1", id, repo);
    expect(revealed?.revealed).toBe(true);

    const [entry] = await getMushroomCollectionForUser("user-1", repo);
    expect(entry.revealed).toBe(true);
  });

  it("is idempotent on a second reveal", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordVenueCollection("user-1", "venue-1");
    const [{ id }] = await getMushroomCollectionForUser("user-1", repo);

    await revealMushroomCollectionEntry("user-1", id, repo);
    const second = await revealMushroomCollectionEntry("user-1", id, repo);
    expect(second?.revealed).toBe(true);
  });

  it("returns null for an unknown id", async () => {
    const repo = new FakeMushroomCollectionRepository();
    const result = await revealMushroomCollectionEntry("user-1", "missing-id", repo);
    expect(result).toBeNull();
  });
});
