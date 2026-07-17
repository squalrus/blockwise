import { describe, expect, it } from "vitest";
import { listActivityForUsers, listMyActivity, listRecentActivity } from "./activity";
import type { ActivityRecord, ActivityRepository } from "./repository";

class FakeActivityRepository implements ActivityRepository {
  constructor(private readonly records: ActivityRecord[]) {}

  async listRecentActivity(_neighborhoodId: string, limit: number): Promise<ActivityRecord[]> {
    return this.records.slice(0, limit);
  }

  async listActivityForUsers(userIds: string[], limit: number): Promise<ActivityRecord[]> {
    return this.records.filter((r) => userIds.includes(r.actorUsername ?? "")).slice(0, limit);
  }
}

function record(overrides: Partial<ActivityRecord>): ActivityRecord {
  return {
    id: "activity-1",
    type: "checkin",
    actorDisplayName: "Casey",
    actorUsername: "casey",
    actorVisibility: "public",
    venueId: "venue-1",
    venueName: "Herkimer Coffee",
    badgeName: null,
    badgeIcon: null,
    challengeTitle: null,
    eventId: null,
    eventTitle: null,
    otherUserId: null,
    otherUserDisplayName: null,
    otherUserUsername: null,
    otherUserVisibility: null,
    occurredAt: "2026-07-10T12:00:00.000Z",
    ...overrides,
  };
}

describe("listRecentActivity", () => {
  it("shows a public actor's display name", async () => {
    const repo = new FakeActivityRepository([record({})]);
    const result = await listRecentActivity("neighborhood-1", repo);
    expect(result[0].actor_name).toBe("Casey");
  });

  it("falls back to username when display_name is unset", async () => {
    const repo = new FakeActivityRepository([record({ actorDisplayName: null })]);
    const result = await listRecentActivity("neighborhood-1", repo);
    expect(result[0].actor_name).toBe("casey");
  });

  it("masks a private actor as 'A user' regardless of display_name", async () => {
    const repo = new FakeActivityRepository([record({ actorVisibility: "private" })]);
    const result = await listRecentActivity("neighborhood-1", repo);
    expect(result[0].actor_name).toBe("A user");
  });

  it("maps badge unlocks with badge fields instead of venue fields", async () => {
    const repo = new FakeActivityRepository([
      record({ type: "badge", venueId: null, venueName: null, badgeName: "Founder", badgeIcon: "🍄" }),
    ]);
    const result = await listRecentActivity("neighborhood-1", repo);
    expect(result[0]).toMatchObject({ type: "badge", badge_name: "Founder", badge_icon: "🍄" });
  });

  it("maps event follows with event fields", async () => {
    const repo = new FakeActivityRepository([
      record({
        type: "event_follow",
        venueId: null,
        venueName: null,
        eventId: "event-1",
        eventTitle: "Farmers Market",
      }),
    ]);
    const result = await listRecentActivity("neighborhood-1", repo);
    expect(result[0]).toMatchObject({ type: "event_follow", event_id: "event-1", event_title: "Farmers Market" });
  });
});

describe("listActivityForUsers", () => {
  it("returns an empty list without querying when there are no user ids", async () => {
    const repo = new FakeActivityRepository([record({})]);
    const result = await listActivityForUsers([], repo);
    expect(result).toEqual([]);
  });

  it("masks a private user's name the same as the neighborhood feed", async () => {
    const repo = new FakeActivityRepository([record({ actorUsername: "casey", actorVisibility: "private" })]);
    const result = await listActivityForUsers(["casey"], repo);
    expect(result[0].actor_name).toBe("A user");
  });

  it("maps neighbor connections with the other party's masked name", async () => {
    const repo = new FakeActivityRepository([
      record({
        type: "neighbor_connection",
        actorUsername: "casey",
        venueId: null,
        venueName: null,
        otherUserId: "user-2",
        otherUserDisplayName: "Jordan",
        otherUserUsername: "jordan",
        otherUserVisibility: "public",
      }),
    ]);
    const result = await listActivityForUsers(["casey"], repo);
    expect(result[0]).toMatchObject({
      type: "neighbor_connection",
      other_user_name: "Jordan",
      other_user_username: "jordan",
    });
  });

  it("masks a private other party as 'a neighbor' and hides their username", async () => {
    const repo = new FakeActivityRepository([
      record({
        type: "neighbor_connection",
        actorUsername: "casey",
        otherUserId: "user-2",
        otherUserDisplayName: "Jordan",
        otherUserUsername: "jordan",
        otherUserVisibility: "private",
      }),
    ]);
    const result = await listActivityForUsers(["casey"], repo);
    expect(result[0]).toMatchObject({ other_user_name: "a neighbor", other_user_username: null });
  });
});

describe("listMyActivity", () => {
  it("shows the caller's own display name even when their profile is private", async () => {
    const repo = new FakeActivityRepository([record({ actorUsername: "casey", actorVisibility: "private" })]);
    const result = await listMyActivity("casey", "Casey", "casey", repo);
    expect(result[0]).toMatchObject({ actor_name: "Casey", actor_username: null });
  });

  it("falls back to username, then 'You', when display_name is unset", async () => {
    const repo = new FakeActivityRepository([record({ actorUsername: "casey" })]);
    const byUsername = await listMyActivity("casey", null, "casey", repo);
    expect(byUsername[0].actor_name).toBe("casey");

    const fallback = await listMyActivity("casey", null, null, repo);
    expect(fallback[0].actor_name).toBe("You");
  });

  it("leaves the other party's identity on a neighbor_connection row untouched", async () => {
    const repo = new FakeActivityRepository([
      record({
        type: "neighbor_connection",
        actorUsername: "casey",
        otherUserId: "user-2",
        otherUserDisplayName: "Jordan",
        otherUserUsername: "jordan",
        otherUserVisibility: "public",
      }),
    ]);
    const result = await listMyActivity("casey", "Casey", "casey", repo);
    expect(result[0]).toMatchObject({ other_user_name: "Jordan", other_user_username: "jordan" });
  });
});
