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

  async recordNeighborhoodCollection(userId: string, neighborhoodId: string): Promise<boolean> {
    return this.record("neighborhood", neighborhoodId, `Neighborhood ${neighborhoodId}`);
  }

  private record(sourceType: "checkin" | "connection" | "neighborhood", sourceId: string, sourceName: string): boolean {
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
      sourceSlug:
        sourceType === "connection" ? `user-${sourceId}` : sourceType === "neighborhood" ? `hood-${sourceId}` : null,
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

  it("collects a neighborhood's own species when joined, bumping on rejoin", async () => {
    const repo = new FakeMushroomCollectionRepository();
    await repo.recordNeighborhoodCollection("user-1", "hood-1");
    await repo.recordNeighborhoodCollection("user-1", "hood-1");

    const [entry] = await getMushroomCollectionForUser("user-1", repo);
    expect(entry.source_type).toBe("neighborhood");
    expect(entry.source_id).toBe("hood-1");
    expect(entry.quantity).toBe(2);
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
