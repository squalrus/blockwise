import { describe, expect, it } from "vitest";
import { evaluateCheckin, performCheckin } from "./checkin";
import type { CheckinRecord, CheckinRepository, CheckinVenue, VenueLocation } from "./repository";

const VENUE: VenueLocation = { id: "venue-1", lat: 47.6062, lng: -122.3321 };
const AT_VENUE = { lat: 47.6062, lng: -122.3321 };
const FAR_AWAY = { lat: 45.5152, lng: -122.6784 }; // ~230km away (Portland)
const PAST_COOLDOWN_MS = 5 * 60 * 60 * 1000;

describe("evaluateCheckin", () => {
  it("allows a check-in within the geofence with no prior check-in", () => {
    const decision = evaluateCheckin({
      venue: VENUE,
      device: AT_VENUE,
      lastCheckin: null,
      now: Date.now(),
    });
    expect(decision).toEqual({ allowed: true });
  });

  it("rejects a check-in outside the geofence radius", () => {
    const decision = evaluateCheckin({
      venue: VENUE,
      device: FAR_AWAY,
      lastCheckin: null,
      now: Date.now(),
    });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "too_far" });
  });

  it("rejects a check-in still within the cooldown window", () => {
    const now = Date.parse("2026-07-06T12:00:00Z");
    const lastCheckin: CheckinRecord = {
      id: "checkin-1",
      userId: "user-1",
      venueId: "venue-1",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date(now - 60 * 60 * 1000).toISOString(), // 1 hour ago
    };

    const decision = evaluateCheckin({ venue: VENUE, device: AT_VENUE, lastCheckin, now });
    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ reason: "cooldown" });
  });

  it("allows a check-in once the cooldown window has elapsed", () => {
    const now = Date.parse("2026-07-06T12:00:00Z");
    const lastCheckin: CheckinRecord = {
      id: "checkin-1",
      userId: "user-1",
      venueId: "venue-1",
      deviceLat: AT_VENUE.lat,
      deviceLng: AT_VENUE.lng,
      checkedInAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    };

    const decision = evaluateCheckin({ venue: VENUE, device: AT_VENUE, lastCheckin, now });
    expect(decision).toEqual({ allowed: true });
  });
});

// In-memory fake, mirroring the pattern used for VenueDetailRepository tests.
class FakeCheckinRepository implements CheckinRepository {
  users = new Map<string, string>(); // anonymousDeviceId -> userId
  checkins: CheckinRecord[] = [];
  private nextId = 1;

  constructor(private readonly venue: VenueLocation | null) {}

  async getVenueLocation(venueId: string): Promise<VenueLocation | null> {
    return this.venue && this.venue.id === venueId ? this.venue : null;
  }

  async getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string> {
    let userId = this.users.get(anonymousDeviceId);
    if (!userId) {
      userId = `user-${this.users.size + 1}`;
      this.users.set(anonymousDeviceId, userId);
    }
    return userId;
  }

  async getLastCheckin(userId: string, venueId: string): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter((c) => c.userId === userId && c.venueId === venueId);
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
}

describe("performCheckin", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeCheckinRepository(null);
    const result = await performCheckin("missing-venue", "device-1", AT_VENUE, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("creates a checkin and reuses the same anonymous user on repeat visits", async () => {
    const repo = new FakeCheckinRepository(VENUE);

    const first = await performCheckin("venue-1", "device-1", AT_VENUE, repo);
    expect(first.status).toBe("created");

    // Same device, well past cooldown -> allowed again, same user_id reused.
    const later = Date.now() + PAST_COOLDOWN_MS;
    const second = await performCheckin("venue-1", "device-1", AT_VENUE, repo, later);
    expect(second.status).toBe("created");
    if (first.status === "created" && second.status === "created") {
      expect(second.checkin.user_id).toBe(first.checkin.user_id);
    }
  });

  it("blocks a repeat check-in within the cooldown window", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    await performCheckin("venue-1", "device-1", AT_VENUE, repo);
    const result = await performCheckin("venue-1", "device-1", AT_VENUE, repo);
    expect(result.status).toBe("cooldown");
  });

  it("blocks a check-in outside the geofence", async () => {
    const repo = new FakeCheckinRepository(VENUE);
    const result = await performCheckin("venue-1", "device-1", FAR_AWAY, repo);
    expect(result).toEqual({ status: "too_far", distanceMeters: expect.any(Number) });
  });
});
