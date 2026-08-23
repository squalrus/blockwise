import { describe, expect, it } from "vitest";
import type { MushroomCustomization } from "@blockwise/types";
import { resolveMushroomConfig } from "@blockwise/types";
import {
  TOP_VISITORS_LIMIT,
  evaluateCheckin,
  performCheckin,
  rankRecentVisitors,
  resolveTopVisitors,
  toMushroomConfig,
} from "./checkin";
import type {
  CheckinRecord,
  CheckinRepository,
  CheckinVenue,
  LocationCoords,
  NeighborhoodVisitorMosaic,
} from "./repository";

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
  users = new Map<string, { username: string | null; displayName: string | null; visibility: string }>(); // userId -> profile
  private nextId = 1;

  constructor(private readonly locations: LocationCoords[] = []) {}

  async getLocation(locationId: string): Promise<LocationCoords | null> {
    return this.locations.find((l) => l.id === locationId) ?? null;
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
  }): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      id: `checkin-${this.nextId++}`,
      userId: input.userId,
      venueId: input.venueId,
      deviceLat: input.deviceLat,
      deviceLng: input.deviceLng,
      checkedInAt: new Date().toISOString(),
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

  async listRecentVisitorMushroomsForNeighborhood(
    _neighborhoodId: string,
    limit: number
  ): Promise<NeighborhoodVisitorMosaic> {
    const ranked = rankRecentVisitors(
      this.checkins.map((c) => ({ userId: c.userId, checkedInAt: c.checkedInAt })),
      limit
    );
    const mushrooms = ranked.map(({ userId, visitCount }) => ({
      mushroom: resolveMushroomConfig(userId, toMushroomConfig(this.mushroomCustomizations.get(userId) ?? null)),
      visitCount,
    }));
    return { mushrooms, topVisitors: resolveTopVisitors(ranked, this.users, TOP_VISITORS_LIMIT) };
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

});

describe("rankRecentVisitors", () => {
  it("ranks distinct visitors most-visits-first, tie-broken by most recent", () => {
    const result = rankRecentVisitors(
      [
        // user-1 visits twice within the window.
        { userId: "user-1", checkedInAt: "2026-07-01T00:00:00Z" },
        { userId: "user-1", checkedInAt: "2026-07-03T00:00:00Z" },
        // user-2 and user-3 each visit once -- tied on visitCount, so
        // user-3 (more recent) should rank ahead of user-2.
        { userId: "user-2", checkedInAt: "2026-07-02T00:00:00Z" },
        { userId: "user-3", checkedInAt: "2026-07-04T00:00:00Z" },
      ],
      12
    );

    expect(result).toEqual([
      { userId: "user-1", visitCount: 2 },
      { userId: "user-3", visitCount: 1 },
      { userId: "user-2", visitCount: 1 },
    ]);
  });

  it("caps at the given limit", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      userId: `user-${i + 1}`,
      checkedInAt: new Date(2026, 6, i + 1).toISOString(),
    }));

    const result = rankRecentVisitors(rows, 3);
    expect(result).toHaveLength(3);
  });
});

describe("resolveTopVisitors", () => {
  it("names the top-ranked visitors in order when their profiles are public", () => {
    const ranked = [
      { userId: "user-1", visitCount: 5 },
      { userId: "user-2", visitCount: 3 },
      { userId: "user-3", visitCount: 1 },
    ];
    const users = new Map([
      ["user-1", { username: "topvisitor", displayName: "Top Visitor", visibility: "public" }],
      ["user-2", { username: "second", displayName: "Second Visitor", visibility: "public" }],
      ["user-3", { username: "third", displayName: "Third Visitor", visibility: "public" }],
    ]);

    expect(resolveTopVisitors(ranked, users, 3)).toEqual([
      { username: "topvisitor", displayName: "Top Visitor", visitCount: 5 },
      { username: "second", displayName: "Second Visitor", visitCount: 3 },
      { username: "third", displayName: "Third Visitor", visitCount: 1 },
    ]);
  });

  it("skips a private or nameless visitor rather than blanking the whole list", () => {
    const ranked = [
      { userId: "user-1", visitCount: 5 },
      { userId: "user-2", visitCount: 3 },
      { userId: "user-3", visitCount: 2 },
      { userId: "user-4", visitCount: 1 },
    ];
    const users = new Map([
      ["user-1", { username: "topvisitor", displayName: "Top Visitor", visibility: "private" }],
      ["user-2", { username: "second", displayName: "Second Visitor", visibility: "public" }],
      ["user-3", { username: null, displayName: null, visibility: "public" }],
      ["user-4", { username: "fourth", displayName: "Fourth Visitor", visibility: "public" }],
    ]);

    expect(resolveTopVisitors(ranked, users, 3)).toEqual([
      { username: "second", displayName: "Second Visitor", visitCount: 3 },
      { username: "fourth", displayName: "Fourth Visitor", visitCount: 1 },
    ]);
  });

  it("stops at the given limit", () => {
    const ranked = [
      { userId: "user-1", visitCount: 5 },
      { userId: "user-2", visitCount: 3 },
    ];
    const users = new Map([
      ["user-1", { username: "topvisitor", displayName: "Top Visitor", visibility: "public" }],
      ["user-2", { username: "second", displayName: "Second Visitor", visibility: "public" }],
    ]);

    expect(resolveTopVisitors(ranked, users, 1)).toEqual([
      { username: "topvisitor", displayName: "Top Visitor", visitCount: 5 },
    ]);
  });

  it("returns an empty array when there are no ranked visitors", () => {
    expect(resolveTopVisitors([], new Map(), TOP_VISITORS_LIMIT)).toEqual([]);
  });
});
