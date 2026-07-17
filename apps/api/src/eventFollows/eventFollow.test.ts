import { describe, expect, it } from "vitest";
import { followEvent, getEventFollowStatus, unfollowEvent } from "./eventFollow";
import type { EventFollowRecord, EventFollowRepository, FollowedEvent } from "./repository";

// In-memory fake, mirroring FakeFavoriteRepository in favorites/favorite.test.ts.
class FakeEventFollowRepository implements EventFollowRepository {
  follows: EventFollowRecord[] = [];
  private nextId = 1;

  constructor(private readonly eventIds: Set<string>) {}

  async eventExists(eventId: string): Promise<boolean> {
    return this.eventIds.has(eventId);
  }

  async getFollow(userId: string, eventId: string): Promise<EventFollowRecord | null> {
    return this.follows.find((f) => f.userId === userId && f.eventId === eventId) ?? null;
  }

  async createFollow(userId: string, eventId: string): Promise<EventFollowRecord> {
    const record: EventFollowRecord = {
      id: `follow-${this.nextId++}`,
      userId,
      eventId,
      createdAt: new Date().toISOString(),
    };
    this.follows.push(record);
    return record;
  }

  async deleteFollow(userId: string, eventId: string): Promise<void> {
    this.follows = this.follows.filter((f) => !(f.userId === userId && f.eventId === eventId));
  }

  async listFollowedEventsForUser(_userId: string): Promise<FollowedEvent[]> {
    return [];
  }
}

describe("followEvent", () => {
  it("returns not_found for an unknown event", async () => {
    const repo = new FakeEventFollowRepository(new Set());
    const result = await followEvent("missing-event", "user-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("is idempotent on repeat calls for the same user", async () => {
    const repo = new FakeEventFollowRepository(new Set(["event-1"]));

    const first = await followEvent("event-1", "user-1", repo);
    expect(first.status).toBe("created");

    const second = await followEvent("event-1", "user-1", repo);
    expect(second.status).toBe("already_following");
    if (first.status !== "not_found" && second.status !== "not_found") {
      expect(second.follow.user_id).toBe(first.follow.user_id);
    }
    expect(repo.follows).toHaveLength(1);
  });
});

describe("unfollowEvent", () => {
  it("returns not_found for an unknown event", async () => {
    const repo = new FakeEventFollowRepository(new Set());
    const result = await unfollowEvent("missing-event", "user-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("removes an existing follow", async () => {
    const repo = new FakeEventFollowRepository(new Set(["event-1"]));
    await followEvent("event-1", "user-1", repo);

    const result = await unfollowEvent("event-1", "user-1", repo);
    expect(result).toEqual({ status: "removed" });
    expect(repo.follows).toHaveLength(0);
  });

  it("is a no-op when the event was never followed", async () => {
    const repo = new FakeEventFollowRepository(new Set(["event-1"]));
    const result = await unfollowEvent("event-1", "user-1", repo);
    expect(result).toEqual({ status: "removed" });
  });
});

describe("getEventFollowStatus", () => {
  it("returns not_found for an unknown event", async () => {
    const repo = new FakeEventFollowRepository(new Set());
    const result = await getEventFollowStatus("missing-event", "user-1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("reports false when not followed, true after following", async () => {
    const repo = new FakeEventFollowRepository(new Set(["event-1"]));

    const before = await getEventFollowStatus("event-1", "user-1", repo);
    expect(before).toEqual({ status: "found", following: false });

    await followEvent("event-1", "user-1", repo);

    const after = await getEventFollowStatus("event-1", "user-1", repo);
    expect(after).toEqual({ status: "found", following: true });
  });
});
