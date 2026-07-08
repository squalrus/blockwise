import { describe, expect, it } from "vitest";
import { evaluateCheckin, performCheckin } from "./checkin";
import type {
  CheckinRecord,
  CheckinRepository,
  CheckinTarget,
  CheckinVenue,
  PoiLocation,
  VenueLocation,
} from "./repository";

const VENUE: VenueLocation = { id: "venue-1", lat: 47.6062, lng: -122.3321 };
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
      poiId: null,
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
      poiId: null,
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
      poiId: null,
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

// In-memory fake, mirroring the pattern used for VenueDetailRepository tests.
class FakeCheckinRepository implements CheckinRepository {
  users = new Map<string, string>(); // anonymousDeviceId -> userId
  checkins: CheckinRecord[] = [];
  private nextId = 1;

  constructor(
    private readonly venue: VenueLocation | null,
    private readonly poi: PoiLocation | null = null
  ) {}

  async getVenueLocation(venueId: string): Promise<VenueLocation | null> {
    return this.venue && this.venue.id === venueId ? this.venue : null;
  }

  async getPoiLocation(poiId: string): Promise<PoiLocation | null> {
    return this.poi && this.poi.id === poiId ? this.poi : null;
  }

  async getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string> {
    let userId = this.users.get(anonymousDeviceId);
    if (!userId) {
      userId = `user-${this.users.size + 1}`;
      this.users.set(anonymousDeviceId, userId);
    }
    return userId;
  }

  async getLastCheckinForTarget(userId: string, target: CheckinTarget): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter(
      (c) =>
        c.userId === userId &&
        (target.kind === "venue" ? c.venueId === target.id : c.poiId === target.id)
    );
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
    venueId?: string;
    poiId?: string;
    deviceLat: number;
    deviceLng: number;
  }): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      id: `checkin-${this.nextId++}`,
      userId: input.userId,
      venueId: input.venueId ?? null,
      poiId: input.poiId ?? null,
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

  async countCheckinsForVenue(venueId: string): Promise<number> {
    return this.checkins.filter((c) => c.venueId === venueId).length;
  }
}

describe("performCheckin", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeCheckinRepository(null);
    const result = await performCheckin({ kind: "venue", id: "missing-venue" }, "device-1", AT_VENUE, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("creates a checkin and reuses the same anonymous user on repeat visits", async () => {
    const repo = new FakeCheckinRepository(VENUE);

    const first = await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", AT_VENUE, repo);
    expect(first.status).toBe("created");

    // Same device, well past both cooldowns -> allowed again, same user_id reused.
    const later = Date.now() + PAST_COOLDOWN_MS;
    const second = await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", AT_VENUE, repo, later);
    expect(second.status).toBe("created");
    if (first.status === "created" && second.status === "created") {
      expect(second.checkin.user_id).toBe(first.checkin.user_id);
    }
  });

  it("blocks a repeat check-in within the per-venue cooldown window", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", AT_VENUE, repo);
    const result = await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", AT_VENUE, repo);
    expect(result.status).toBe("cooldown");
    if (result.status === "cooldown") expect(result.scope).toBe("target");
  });

  it("blocks a check-in at a different venue within the global cooldown window", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    repo.checkins.push({
      id: "checkin-0",
      userId: "user-1",
      venueId: "venue-other",
      poiId: null,
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date().toISOString(),
    });
    repo.users.set("device-1", "user-1");

    const result = await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", AT_VENUE, repo);
    expect(result.status).toBe("cooldown");
    if (result.status === "cooldown") expect(result.scope).toBe("global");
  });

  it("allows a check-in at a different venue once the global cooldown has elapsed", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    repo.checkins.push({
      id: "checkin-0",
      userId: "user-1",
      venueId: "venue-other",
      poiId: null,
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date().toISOString(),
    });
    repo.users.set("device-1", "user-1");

    const result = await performCheckin(
      { kind: "venue", id: "venue-1" },
      "device-1",
      AT_VENUE,
      repo,
      Date.now() + PAST_GLOBAL_COOLDOWN_MS
    );
    expect(result.status).toBe("created");
  });

  it("blocks a check-in outside the geofence", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    const result = await performCheckin({ kind: "venue", id: "venue-1" }, "device-1", FAR_AWAY, repo);
    expect(result).toEqual({ status: "too_far", distanceMeters: expect.any(Number) });
  });

  it("checks in against a POI target", async () => {
    const poi: PoiLocation = { id: "poi-1", lat: 47.6062, lng: -122.3321 };
    const repo = new FakeCheckinRepository(null, poi);
    const result = await performCheckin({ kind: "poi", id: "poi-1" }, "device-1", AT_VENUE, repo);
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.checkin.poi_id).toBe("poi-1");
      expect(result.checkin.venue_id).toBeNull();
    }
  });
});
