import { describe, expect, it } from "vitest";
import type { MushroomCustomization } from "@blockwise/types";
import { evaluateCheckin, performCheckin } from "./checkin";
import type { CheckinRecord, CheckinRepository, CheckinVenue, LocationCoords } from "./repository";

const VENUE: LocationCoords = { id: "venue-1", lat: 47.6062, lng: -122.3321 };
const AT_VENUE = { lat: 47.6062, lng: -122.3321 };
const FAR_AWAY = { lat: 45.5152, lng: -122.6784 }; // ~230km away (Portland)
const PAST_COOLDOWN_MS = 5 * 60 * 60 * 1000;
const PAST_GLOBAL_COOLDOWN_MS = 3 * 60 * 1000;

describe("evaluateCheckin", () => {
  it("allows a check-in within the geofence with no prior check-in", () => {
    const decision = evaluateCheckin({
      target: VENUE,
      device: AT_VENUE,
      lastCheckinForTarget: null,
      lastCheckinAnywhere: null,
      now: Date.now(),
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("rejects a check-in outside the geofence radius", () => {
    const decision = evaluateCheckin({
      target: VENUE,
      device: FAR_AWAY,
      lastCheckinForTarget: null,
      lastCheckinAnywhere: null,
      now: Date.now(),
    });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "too_far" });
  });

  it("rejects a check-in still within the per-venue cooldown window", () => {
    const now = Date.parse("2026-07-06T12:00:00Z");
    const lastCheckin: CheckinRecord = {
      id: "checkin-1",
      userId: "user-1",
      venueId: "venue-1",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date(now - 60 * 60 * 1000).toISOString(), // 1 hour ago
    };

    const decision = evaluateCheckin({
      target: VENUE,
      device: AT_VENUE,
      lastCheckinForTarget: lastCheckin,
      lastCheckinAnywhere: lastCheckin,
      now,
    });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "cooldown", scope: "target" });
  });

  it("rejects a check-in within the global cross-venue cooldown even at a new venue", () => {
    const now = Date.parse("2026-07-06T12:00:00Z");
    const lastCheckinElsewhere: CheckinRecord = {
      id: "checkin-1",
      userId: "user-1",
      venueId: "venue-2",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date(now - 60 * 1000).toISOString(), // 1 minute ago
    };

    const decision = evaluateCheckin({
      target: VENUE,
      device: AT_VENUE,
      lastCheckinForTarget: null,
      lastCheckinAnywhere: lastCheckinElsewhere,
      now,
    });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "cooldown", scope: "global" });
  });

  it("allows a check-in once both cooldown windows have elapsed", () => {
    const now = Date.parse("2026-07-06T12:00:00Z");
    const lastCheckin: CheckinRecord = {
      id: "checkin-1",
      userId: "user-1",
      venueId: "venue-1",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    };

    const decision = evaluateCheckin({
      target: VENUE,
      device: AT_VENUE,
      lastCheckinForTarget: lastCheckin,
      lastCheckinAnywhere: lastCheckin,
      now,
    });
    expect(decision).toEqual({ allowed: true });
  });
});

// In-memory fake, mirroring the pattern used for LocationRepository tests.
// One id space for either kind (business or POI) since the venue/poi merge
// (BACKLOG.md "POIs and venues managed almost the same").
class FakeCheckinRepository implements CheckinRepository {
  checkins: CheckinRecord[] = [];
  mushroomCustomizations = new Map<string, MushroomCustomization>(); // userId -> customization
  private nextId = 1;

  constructor(private readonly locations: LocationCoords[] = []) {}

  async getLocation(locationId: string): Promise<LocationCoords | null> {
    return this.locations.find((l) => l.id === locationId) ?? null;
  }

  async getMushroomCustomization(userId: string): Promise<MushroomCustomization | null> {
    return this.mushroomCustomizations.get(userId) ?? null;
  }

  async getLastCheckinForLocation(userId: string, locationId: string): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter((c) => c.userId === userId && c.venueId === locationId);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))[0];
  }

  async getLastCheckinAnywhere(userId: string): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter((c) => c.userId === userId);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))[0];
  }

  async createCheckin(input: {
    userId: string;
    venueId: string;
    deviceLat: number;
    deviceLng: number;
    mushroomSnapshot: CheckinRecord["mushroomSnapshot"];
  }): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      id: `checkin-${this.nextId++}`,
      userId: input.userId,
      venueId: input.venueId,
      deviceLat: input.deviceLat,
      deviceLng: input.deviceLng,
      checkedInAt: new Date().toISOString(),
      mushroomSnapshot: input.mushroomSnapshot,
    };
    this.checkins.push(record);
    return record;
  }

  async listCheckinsForUser(_userId: string): Promise<CheckinVenue[]> {
    return [];
  }

  async countCheckinsForLocation(locationId: string): Promise<number> {
    return this.checkins.filter((c) => c.venueId === locationId).length;
  }

  async countCheckinsForNeighborhood(): Promise<number> {
    return this.checkins.length;
  }

  async listRecentCheckinSnapshotsForNeighborhood(
    _neighborhoodId: string,
    limit: number
  ): Promise<NonNullable<CheckinRecord["mushroomSnapshot"]>[]> {
    const mostRecentFirst = [...this.checkins].sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));
    const seenUsers = new Set<string>();
    const snapshots: NonNullable<CheckinRecord["mushroomSnapshot"]>[] = [];
    for (const c of mostRecentFirst) {
      if (snapshots.length >= limit) break;
      if (!c.mushroomSnapshot || seenUsers.has(c.userId)) continue;
      seenUsers.add(c.userId);
      snapshots.push(c.mushroomSnapshot);
    }
    return snapshots;
  }
}

describe("performCheckin", () => {
  it("returns not_found for an unknown location", async () => {
    const repo = new FakeCheckinRepository();
    const result = await performCheckin("missing-venue", "user-1", AT_VENUE, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("creates a checkin, and a repeat visit past cooldown creates another for the same user", async () => {
    const repo = new FakeCheckinRepository([VENUE]);

    const first = await performCheckin("venue-1", "user-1", AT_VENUE, repo);
    expect(first.status).toBe("created");

    const later = Date.now() + PAST_COOLDOWN_MS;
    const second = await performCheckin("venue-1", "user-1", AT_VENUE, repo, later);
    expect(second.status).toBe("created");
    if (first.status === "created" && second.status === "created") {
      expect(second.checkin.user_id).toBe(first.checkin.user_id);
    }
  });

  it("blocks a repeat check-in within the per-venue cooldown window", async () => {
    const repo = new FakeCheckinRepository([VENUE]);
    await performCheckin("venue-1", "user-1", AT_VENUE, repo);
    const result = await performCheckin("venue-1", "user-1", AT_VENUE, repo);
    expect(result.status).toBe("cooldown");
    if (result.status === "cooldown") expect(result.scope).toBe("target");
  });

  it("blocks a check-in at a different venue within the global cooldown window", async () => {
    const repo = new FakeCheckinRepository([VENUE]);
    repo.checkins.push({
      id: "checkin-0",
      userId: "user-1",
      venueId: "venue-other",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date().toISOString(),
      mushroomSnapshot: null,
    });
    const result = await performCheckin("venue-1", "user-1", AT_VENUE, repo);
    expect(result.status).toBe("cooldown");
    if (result.status === "cooldown") expect(result.scope).toBe("global");
  });

  it("allows a check-in at a different venue once the global cooldown has elapsed", async () => {
    const repo = new FakeCheckinRepository([VENUE]);
    repo.checkins.push({
      id: "checkin-0",
      userId: "user-1",
      venueId: "venue-other",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date().toISOString(),
      mushroomSnapshot: null,
    });
    const result = await performCheckin(
      "venue-1",
      "user-1",
      AT_VENUE,
      repo,
      Date.now() + PAST_GLOBAL_COOLDOWN_MS
    );
    expect(result.status).toBe("created");
  });

  it("blocks a check-in outside the geofence", async () => {
    const repo = new FakeCheckinRepository([VENUE]);
    const result = await performCheckin("venue-1", "user-1", FAR_AWAY, repo);
    expect(result).toEqual({ status: "too_far", distanceMeters: expect.any(Number) });
  });

  it("checks in against a former-POI-kind location the same way as a business (BACKLOG.md 'POIs and venues managed almost the same')", async () => {
    const poi: LocationCoords = { id: "poi-1", lat: 47.6062, lng: -122.3321 };
    const repo = new FakeCheckinRepository([poi]);
    const result = await performCheckin("poi-1", "user-1", AT_VENUE, repo);
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.checkin.venue_id).toBe("poi-1");
    }
  });

  it("stamps a mushroom_snapshot on the created checkin, honoring a saved customization over the hash default", async () => {
    const VENUE_2: LocationCoords = { id: "venue-2", lat: AT_VENUE.lat, lng: AT_VENUE.lng };
    const repo = new FakeCheckinRepository([VENUE, VENUE_2]);
    // First check-in with no saved customization -- gets the hash-derived
    // default, tagged with the current snapshot algorithm version.
    const first = await performCheckin("venue-1", "user-1", AT_VENUE, repo);
    expect(first.status).toBe("created");
    if (first.status !== "created") return;
    expect(first.checkin.mushroom_snapshot).toMatchObject({ v: 2 });

    // Same user saves a customization, then checks in again elsewhere --
    // the new snapshot should reflect the saved look, not the hash default.
    const customization = {
      cap: "#2b1b12",
      stalk: "#f2a93b",
      spots: "#f2a93b",
      bg: "#f2a93b",
      spotCount: 4,
      spotShape: "star",
    };
    repo.mushroomCustomizations.set(first.checkin.user_id, customization);
    const second = await performCheckin(
      "venue-2",
      "user-1",
      AT_VENUE,
      repo,
      Date.now() + PAST_GLOBAL_COOLDOWN_MS
    );
    expect(second.status).toBe("created");
    if (second.status !== "created") return;
    expect(second.checkin.mushroom_snapshot).toEqual({ v: 2, ...customization });
  });
});

describe("listRecentCheckinSnapshotsForNeighborhood", () => {
  it("returns the most recent distinct-user snapshots, excluding repeat visits and null-snapshot rows", async () => {
    const repo = new FakeCheckinRepository();
    const snapshotFor = (n: number) => ({
      v: 2,
      cap: "#e8542a",
      stalk: "#fbf2e4",
      spots: "#fbf2e4",
      bg: "#fbf2e4",
      spotCount: n,
      spotShape: "circle" as const,
    });
    repo.checkins.push(
      // user-1 visits twice -- only the more recent snapshot should count.
      { id: "c1", userId: "user-1", venueId: "v1", deviceLat: 0, deviceLng: 0, checkedInAt: "2026-07-01T00:00:00Z", mushroomSnapshot: snapshotFor(1) },
      { id: "c2", userId: "user-1", venueId: "v1", deviceLat: 0, deviceLng: 0, checkedInAt: "2026-07-03T00:00:00Z", mushroomSnapshot: snapshotFor(2) },
      // user-2's check-in predates snapshot capture -- excluded entirely.
      { id: "c3", userId: "user-2", venueId: "v1", deviceLat: 0, deviceLng: 0, checkedInAt: "2026-07-02T00:00:00Z", mushroomSnapshot: null },
      { id: "c4", userId: "user-3", venueId: "v1", deviceLat: 0, deviceLng: 0, checkedInAt: "2026-07-04T00:00:00Z", mushroomSnapshot: snapshotFor(3) }
    );

    const result = await repo.listRecentCheckinSnapshotsForNeighborhood("neighborhood-1", 12);
    expect(result).toEqual([snapshotFor(3), snapshotFor(2)]);
  });

  it("caps at the given limit", async () => {
    const repo = new FakeCheckinRepository();
    for (let i = 1; i <= 5; i++) {
      repo.checkins.push({
        id: `c${i}`,
        userId: `user-${i}`,
        venueId: "v1",
        deviceLat: 0,
        deviceLng: 0,
        checkedInAt: new Date(2026, 6, i).toISOString(),
        mushroomSnapshot: { v: 2, cap: "#e8542a", stalk: "#fbf2e4", spots: "#fbf2e4", bg: "#fbf2e4", spotCount: 1, spotShape: "circle" },
      });
    }

    const result = await repo.listRecentCheckinSnapshotsForNeighborhood("neighborhood-1", 3);
    expect(result).toHaveLength(3);
  });
});
