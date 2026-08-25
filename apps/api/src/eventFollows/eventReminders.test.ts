import { describe, expect, it } from "vitest";
import { sendEventStartReminders } from "./eventReminders";
import type { EventFollowRecord, EventFollowRepository, FollowedEvent, PendingEventReminder } from "./repository";
import type { NotificationPreferences, PushSubscriptionKeys } from "@blockwise/types";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "../auth/repository";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "../pushSubscriptions/repository";
import type { PushPayload, PushSender, SendResult } from "../pushSubscriptions/webPushSender";

// In-memory fake, mirroring FakeEventFollowRepository in eventFollow.test.ts
// -- only the reminder-sweep methods are exercised here.
class FakeEventFollowRepository implements EventFollowRepository {
  markedSent: string[][] = [];

  constructor(private readonly pending: PendingEventReminder[] = []) {}

  async eventExists(): Promise<boolean> {
    throw new Error("not implemented");
  }
  async getFollow(): Promise<EventFollowRecord | null> {
    throw new Error("not implemented");
  }
  async createFollow(): Promise<EventFollowRecord> {
    throw new Error("not implemented");
  }
  async deleteFollow(): Promise<void> {
    throw new Error("not implemented");
  }
  async listFollowedEventsForUser(): Promise<FollowedEvent[]> {
    throw new Error("not implemented");
  }

  async listPendingEventReminders(_windowStart: string, _windowEnd: string): Promise<PendingEventReminder[]> {
    return this.pending;
  }

  async markEventRemindersSent(followIds: string[]): Promise<void> {
    this.markedSent.push(followIds);
  }
}

// In-memory fake, mirroring FakePushSubscriptionRepository in
// pushSubscriptions.test.ts.
class FakePushSubscriptionRepository implements PushSubscriptionRepository {
  subscriptions: PushSubscriptionRecord[] = [];

  async upsertSubscription(input: { userId: string; endpoint: string; keys: PushSubscriptionKeys }): Promise<PushSubscriptionRecord> {
    const record: PushSubscriptionRecord = {
      id: `sub-${this.subscriptions.length + 1}`,
      userId: input.userId,
      endpoint: input.endpoint,
      keys: input.keys,
      createdAt: new Date().toISOString(),
    };
    this.subscriptions.push(record);
    return record;
  }
  async getSubscription(id: string): Promise<PushSubscriptionRecord | null> {
    return this.subscriptions.find((s) => s.id === id) ?? null;
  }
  async deleteSubscription(id: string): Promise<void> {
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
  }
  async listForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.subscriptions.filter((s) => s.userId === userId);
  }
  async listForUsers(userIds: string[]): Promise<PushSubscriptionRecord[]> {
    return this.subscriptions.filter((s) => userIds.includes(s.userId));
  }
}

class FakePushSender implements PushSender {
  sent: PushPayload[] = [];
  constructor(private readonly result: SendResult = { status: "sent" }) {}
  async send(_subscription: { endpoint: string; keys: PushSubscriptionKeys }, payload: PushPayload) {
    this.sent.push(payload);
    return this.result;
  }
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  checkins: true,
  connection_requests: true,
  connection_accepted: true,
  event_reminders: true,
  new_coupons: true,
};

// Minimal fake, mirroring FakeAuthRepository in auth/auth.test.ts -- only
// getNotificationPreferences is exercised here.
class FakeAuthRepository implements AuthRepository {
  constructor(private readonly overrides: Record<string, NotificationPreferences> = {}) {}

  async getByAuthUserId(): Promise<AppUserRecord | null> {
    throw new Error("not implemented");
  }
  async getByUsername(): Promise<AppUserRecord | null> {
    throw new Error("not implemented");
  }
  async completeSignup(_input: CompleteSignupInput): Promise<AppUserRecord> {
    throw new Error("not implemented");
  }
  async updateAccountType(): Promise<AppUserRecord> {
    throw new Error("not implemented");
  }
  async updateProfile(_userId: string, _input: UpdateProfileInput): Promise<AppUserRecord> {
    throw new Error("not implemented");
  }

  async getNotificationPreferences(userIds: string[]): Promise<Map<string, NotificationPreferences>> {
    return new Map(userIds.map((id) => [id, this.overrides[id] ?? DEFAULT_PREFERENCES]));
  }
  async recordLogin(): Promise<void> {
    throw new Error("not implemented");
  }
}

const KEYS: PushSubscriptionKeys = { p256dh: "p256dh-value", auth: "auth-value" };

describe("sendEventStartReminders", () => {
  it("sends one push per pending follower and marks their follows notified", async () => {
    const eventRepo = new FakeEventFollowRepository([
      {
        eventId: "event-1",
        eventTitle: "Farmers Market",
        venueId: "venue-1",
        venueName: "Ballard Commons",
        startTime: "2026-08-22T18:00:00.000Z",
        follows: [
          { followId: "follow-1", userId: "user-1" },
          { followId: "follow-2", userId: "user-2" },
        ],
      },
    ]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "user-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender();

    const summary = await sendEventStartReminders(eventRepo, pushRepo, sender, new FakeAuthRepository());

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0, eventsNotified: 1 });
    expect(sender.sent).toEqual([
      { title: "Event starting soon", body: "Farmers Market at Ballard Commons is starting soon", url: "/location/venue-1" },
      { title: "Event starting soon", body: "Farmers Market at Ballard Commons is starting soon", url: "/location/venue-1" },
    ]);
    expect(eventRepo.markedSent).toEqual([["follow-1", "follow-2"]]);
  });

  it("falls back to /account when the event has no venue", async () => {
    const eventRepo = new FakeEventFollowRepository([
      {
        eventId: "event-1",
        eventTitle: "Block Party",
        venueId: null,
        venueName: null,
        startTime: "2026-08-22T18:00:00.000Z",
        follows: [{ followId: "follow-1", userId: "user-1" }],
      },
    ]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    await sendEventStartReminders(eventRepo, pushRepo, sender, new FakeAuthRepository());

    expect(sender.sent).toEqual([{ title: "Event starting soon", body: "Block Party is starting soon", url: "/account" }]);
  });

  it("does nothing when there are no pending reminders", async () => {
    const eventRepo = new FakeEventFollowRepository([]);
    const pushRepo = new FakePushSubscriptionRepository();
    const sender = new FakePushSender();

    const summary = await sendEventStartReminders(eventRepo, pushRepo, sender, new FakeAuthRepository());

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0, eventsNotified: 0 });
    expect(eventRepo.markedSent).toEqual([]);
  });

  it("marks a follow's reminder sent even when its push send fails", async () => {
    const eventRepo = new FakeEventFollowRepository([
      {
        eventId: "event-1",
        eventTitle: "Farmers Market",
        venueId: "venue-1",
        venueName: "Ballard Commons",
        startTime: "2026-08-22T18:00:00.000Z",
        follows: [{ followId: "follow-1", userId: "user-1" }],
      },
    ]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender({ status: "error", message: "boom" });

    const summary = await sendEventStartReminders(eventRepo, pushRepo, sender, new FakeAuthRepository());

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 1, eventsNotified: 1 });
    expect(eventRepo.markedSent).toEqual([["follow-1"]]);
  });

  it("skips sending to a follower who opted out of event reminders, but still marks their follow notified", async () => {
    const eventRepo = new FakeEventFollowRepository([
      {
        eventId: "event-1",
        eventTitle: "Farmers Market",
        venueId: "venue-1",
        venueName: "Ballard Commons",
        startTime: "2026-08-22T18:00:00.000Z",
        follows: [
          { followId: "follow-1", userId: "user-1" },
          { followId: "follow-2", userId: "user-2" },
        ],
      },
    ]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "user-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender();
    const authRepo = new FakeAuthRepository({ "user-1": { ...DEFAULT_PREFERENCES, event_reminders: false } });

    const summary = await sendEventStartReminders(eventRepo, pushRepo, sender, authRepo);

    expect(summary).toEqual({ sent: 1, pruned: 0, failed: 0, eventsNotified: 1 });
    expect(sender.sent).toHaveLength(1);
    expect(eventRepo.markedSent).toEqual([["follow-1", "follow-2"]]);
  });
});
