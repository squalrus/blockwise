import { describe, expect, it } from "vitest";
import { listRecentActivity } from "./activity";
import type { ActivityRecord, ActivityRepository } from "./repository";

class FakeActivityRepository implements ActivityRepository {
  constructor(private readonly records: ActivityRecord[]) {}

  async listRecentActivity(_neighborhoodId: string, limit: number): Promise<ActivityRecord[]> {
    return this.records.slice(0, limit);
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
});
