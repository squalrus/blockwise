import { describe, expect, it } from "vitest";
import {
  notifyConnectionsOfCheckin,
  notifyFavoritersOfNewCoupon,
  notifySuperAdminsOfFeedback,
  notifySuperAdminsOfSignup,
  notifyUserOfConnectionAccepted,
  notifyUserOfConnectionRequest,
  sendPushToUsers,
  subscribeToPush,
  unsubscribeFromPush,
} from "./pushSubscriptions";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "./repository";
import type { PushPayload, PushSender, SendResult } from "./webPushSender";
import type { NotificationPreferences, PushSubscriptionKeys } from "@blockwise/types";
import type { ConnectionListItem, ConnectionRepository, ConnectionStatus, UserConnectionRecord } from "../connections/repository";
import type { SuperAdminRepository } from "../admin/repository";
import type { AppUserRecord, AuthRepository, CompleteSignupInput, UpdateProfileInput } from "../auth/repository";
import type { FavoriteRecord, FavoriteRepository, FavoriteVenue } from "../favorites/repository";

// In-memory fake, mirroring FakeConnectionRepository below.
class FakeSuperAdminRepository implements SuperAdminRepository {
  constructor(private readonly userIds: string[] = []) {}

  async isSuperAdmin(userId: string): Promise<boolean> {
    return this.userIds.includes(userId);
  }

  async listSuperAdminUserIds(): Promise<string[]> {
    return this.userIds;
  }
}

// In-memory fake, mirroring FakePushSubscriptionRepository above -- only the
// methods notifyConnectionsOfCheckin actually calls are implemented for real.
class FakeConnectionRepository implements ConnectionRepository {
  constructor(private readonly accepted: Record<string, ConnectionListItem[]> = {}) {}

  async listConnectionsForUser(userId: string, status?: ConnectionStatus): Promise<ConnectionListItem[]> {
    if (status !== "accepted") return [];
    return this.accepted[userId] ?? [];
  }

  async getUserIdByUsername(): Promise<string | null> {
    throw new Error("not implemented");
  }
  async findConnectionBetween(): Promise<UserConnectionRecord | null> {
    throw new Error("not implemented");
  }
  async getConnectionById(): Promise<UserConnectionRecord | null> {
    throw new Error("not implemented");
  }
  async createConnectionRequest(): Promise<UserConnectionRecord> {
    throw new Error("not implemented");
  }
  async acceptConnectionRequest(): Promise<UserConnectionRecord> {
    throw new Error("not implemented");
  }
  async deleteConnection(): Promise<void> {
    throw new Error("not implemented");
  }
  async countAcceptedConnectionsForUser(): Promise<number> {
    throw new Error("not implemented");
  }
}

function connectionTo(userId: string): ConnectionListItem {
  return {
    id: `conn-${userId}`,
    status: "accepted",
    direction: "outgoing",
    createdAt: new Date().toISOString(),
    user: {
      id: userId,
      username: null,
      displayName: null,
      avatarUrl: null,
      avatarStyle: "mushroom",
      mushroomCustomization: null,
    },
  };
}

// In-memory fake, mirroring FakeFeedbackRepository in feedback/feedback.test.ts.
class FakePushSubscriptionRepository implements PushSubscriptionRepository {
  subscriptions: PushSubscriptionRecord[] = [];
  private nextId = 1;

  async upsertSubscription(input: {
    userId: string;
    endpoint: string;
    keys: PushSubscriptionKeys;
  }): Promise<PushSubscriptionRecord> {
    const existing = this.subscriptions.find((s) => s.endpoint === input.endpoint);
    if (existing) {
      existing.userId = input.userId;
      existing.keys = input.keys;
      return existing;
    }
    const record: PushSubscriptionRecord = {
      id: `sub-${this.nextId++}`,
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

const DEFAULT_PREFERENCES: NotificationPreferences = {
  checkins: true,
  connection_requests: true,
  connection_accepted: true,
  event_reminders: true,
  new_coupons: true,
};

// Minimal fake, mirroring FakeAuthRepository in auth/auth.test.ts -- only
// getNotificationPreferences is exercised by the notify* gating tests here.
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
}

// In-memory fake, mirroring FakeFavoriteRepository in favorites/favorite.test.ts
// -- only listUserIdsFavoritingVenue is exercised by notifyFavoritersOfNewCoupon.
class FakeFavoriteRepository implements FavoriteRepository {
  constructor(private readonly favoriterUserIds: string[] = []) {}

  async venueExists(): Promise<boolean> {
    throw new Error("not implemented");
  }
  async getFavorite(): Promise<FavoriteRecord | null> {
    throw new Error("not implemented");
  }
  async createFavorite(): Promise<FavoriteRecord> {
    throw new Error("not implemented");
  }
  async deleteFavorite(): Promise<void> {
    throw new Error("not implemented");
  }
  async listFavoriteVenuesForUser(): Promise<FavoriteVenue[]> {
    throw new Error("not implemented");
  }
  async countFavoritesForVenue(): Promise<number> {
    throw new Error("not implemented");
  }

  async listUserIdsFavoritingVenue(_venueId: string): Promise<string[]> {
    return this.favoriterUserIds;
  }
}

class FakePushSender implements PushSender {
  results: SendResult[];
  sent: PushPayload[] = [];
  private nextResult = 0;

  constructor(results: SendResult[] = [{ status: "sent" }]) {
    this.results = results;
  }

  async send(_subscription: { endpoint: string; keys: PushSubscriptionKeys }, payload: PushPayload) {
    this.sent.push(payload);
    return this.results[Math.min(this.nextResult++, this.results.length - 1)];
  }
}

const KEYS: PushSubscriptionKeys = { p256dh: "p256dh-value", auth: "auth-value" };

describe("subscribeToPush", () => {
  it("creates a subscription", async () => {
    const repo = new FakePushSubscriptionRepository();
    const result = await subscribeToPush("user-1", { endpoint: "https://push.example/a", keys: KEYS }, repo);

    expect(result.status).toBe("subscribed");
    expect(repo.subscriptions).toHaveLength(1);
  });

  it("rejects a missing endpoint", async () => {
    const repo = new FakePushSubscriptionRepository();
    const result = await subscribeToPush("user-1", { endpoint: "", keys: KEYS }, repo);
    expect(result.status).toBe("invalid");
  });

  it("rejects incomplete keys", async () => {
    const repo = new FakePushSubscriptionRepository();
    const result = await subscribeToPush(
      "user-1",
      { endpoint: "https://push.example/a", keys: { p256dh: "", auth: "auth-value" } },
      repo
    );
    expect(result.status).toBe("invalid");
  });

  it("upserts on re-subscribing the same endpoint", async () => {
    const repo = new FakePushSubscriptionRepository();
    await subscribeToPush("user-1", { endpoint: "https://push.example/a", keys: KEYS }, repo);
    await subscribeToPush("user-1", { endpoint: "https://push.example/a", keys: KEYS }, repo);
    expect(repo.subscriptions).toHaveLength(1);
  });
});

describe("unsubscribeFromPush", () => {
  it("returns not_found for an unknown subscription", async () => {
    const repo = new FakePushSubscriptionRepository();
    const result = await unsubscribeFromPush("user-1", "missing", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns forbidden when the subscription belongs to another user", async () => {
    const repo = new FakePushSubscriptionRepository();
    const created = await repo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const result = await unsubscribeFromPush("user-2", created.id, repo);
    expect(result).toEqual({ status: "forbidden" });
    expect(repo.subscriptions).toHaveLength(1);
  });

  it("deletes the subscription when owned by the caller", async () => {
    const repo = new FakePushSubscriptionRepository();
    const created = await repo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const result = await unsubscribeFromPush("user-1", created.id, repo);
    expect(result).toEqual({ status: "unsubscribed" });
    expect(repo.subscriptions).toHaveLength(0);
  });
});

describe("sendPushToUsers", () => {
  it("sends to every subscription for the given users", async () => {
    const repo = new FakePushSubscriptionRepository();
    await repo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    await repo.upsertSubscription({ userId: "user-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender([{ status: "sent" }, { status: "sent" }]);

    const summary = await sendPushToUsers(["user-1", "user-2"], { title: "t", body: "b" }, repo, sender);

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(2);
  });

  it("prunes subscriptions the push service reports as gone", async () => {
    const repo = new FakePushSubscriptionRepository();
    const created = await repo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender([{ status: "gone" }]);

    const summary = await sendPushToUsers(["user-1"], { title: "t", body: "b" }, repo, sender);

    expect(summary).toEqual({ sent: 0, pruned: 1, failed: 0 });
    expect(await repo.getSubscription(created.id)).toBeNull();
  });

  it("counts errors without deleting the subscription", async () => {
    const repo = new FakePushSubscriptionRepository();
    const created = await repo.upsertSubscription({ userId: "user-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender([{ status: "error", message: "boom" }]);

    const summary = await sendPushToUsers(["user-1"], { title: "t", body: "b" }, repo, sender);

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 1 });
    expect(await repo.getSubscription(created.id)).not.toBeNull();
  });
});

describe("notifyConnectionsOfCheckin", () => {
  it("sends a push to every accepted connection", async () => {
    const connectionRepo = new FakeConnectionRepository({
      "user-1": [connectionTo("neighbor-1"), connectionTo("neighbor-2")],
    });
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "neighbor-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "neighbor-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender([{ status: "sent" }, { status: "sent" }]);

    const summary = await notifyConnectionsOfCheckin(
      "user-1",
      { displayName: "Alex", venueName: "Diesel Fuel Coffee", venueId: "venue-1" },
      connectionRepo,
      pushRepo,
      sender,
      new FakeAuthRepository()
    );

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([
      { title: "Neighbor check-in", body: "Alex checked in at Diesel Fuel Coffee", url: "/location/venue-1" },
      { title: "Neighbor check-in", body: "Alex checked in at Diesel Fuel Coffee", url: "/location/venue-1" },
    ]);
  });

  it("falls back to a generic name when the checking-in user has no display name", async () => {
    const connectionRepo = new FakeConnectionRepository({ "user-1": [connectionTo("neighbor-1")] });
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "neighbor-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    await notifyConnectionsOfCheckin(
      "user-1",
      { displayName: null, venueName: "Herkimer Coffee", venueId: "venue-2" },
      connectionRepo,
      pushRepo,
      sender,
      new FakeAuthRepository()
    );

    expect(sender.sent).toEqual([
      { title: "Neighbor check-in", body: "A neighbor checked in at Herkimer Coffee", url: "/location/venue-2" },
    ]);
  });

  it("does nothing when the checking-in user has no accepted connections", async () => {
    const connectionRepo = new FakeConnectionRepository();
    const pushRepo = new FakePushSubscriptionRepository();
    const sender = new FakePushSender();

    const summary = await notifyConnectionsOfCheckin(
      "user-1",
      { displayName: "Alex", venueName: "Herkimer Coffee", venueId: "venue-3" },
      connectionRepo,
      pushRepo,
      sender,
      new FakeAuthRepository()
    );

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });

  it("skips a connection who opted out of check-in notifications", async () => {
    const connectionRepo = new FakeConnectionRepository({
      "user-1": [connectionTo("neighbor-1"), connectionTo("neighbor-2")],
    });
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "neighbor-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "neighbor-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender();
    const authRepo = new FakeAuthRepository({ "neighbor-1": { ...DEFAULT_PREFERENCES, checkins: false } });

    const summary = await notifyConnectionsOfCheckin(
      "user-1",
      { displayName: "Alex", venueName: "Diesel Fuel Coffee", venueId: "venue-1" },
      connectionRepo,
      pushRepo,
      sender,
      authRepo
    );

    expect(summary).toEqual({ sent: 1, pruned: 0, failed: 0 });
  });
});

describe("notifySuperAdminsOfSignup", () => {
  it("sends a push to every super admin", async () => {
    const superAdminRepo = new FakeSuperAdminRepository(["admin-1", "admin-2"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "admin-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "admin-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender([{ status: "sent" }, { status: "sent" }]);

    const summary = await notifySuperAdminsOfSignup(
      { displayName: "Jane", email: "jane@example.com" },
      superAdminRepo,
      pushRepo,
      sender
    );

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([
      { title: "New signup", body: "Jane just joined Spored", url: "/admin/super/users" },
      { title: "New signup", body: "Jane just joined Spored", url: "/admin/super/users" },
    ]);
  });

  it("falls back to email, then a generic name, when display name is missing", async () => {
    const superAdminRepo = new FakeSuperAdminRepository(["admin-1"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "admin-1", endpoint: "https://push.example/a", keys: KEYS });

    const withEmailSender = new FakePushSender();
    await notifySuperAdminsOfSignup(
      { displayName: null, email: "jane@example.com" },
      superAdminRepo,
      pushRepo,
      withEmailSender
    );
    expect(withEmailSender.sent).toEqual([
      { title: "New signup", body: "jane@example.com just joined Spored", url: "/admin/super/users" },
    ]);

    const noEmailSender = new FakePushSender();
    await notifySuperAdminsOfSignup({ displayName: null, email: null }, superAdminRepo, pushRepo, noEmailSender);
    expect(noEmailSender.sent).toEqual([
      { title: "New signup", body: "Someone just joined Spored", url: "/admin/super/users" },
    ]);
  });

  it("does nothing when there are no super admins", async () => {
    const superAdminRepo = new FakeSuperAdminRepository();
    const pushRepo = new FakePushSubscriptionRepository();
    const sender = new FakePushSender();

    const summary = await notifySuperAdminsOfSignup(
      { displayName: "Jane", email: "jane@example.com" },
      superAdminRepo,
      pushRepo,
      sender
    );

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });
});

describe("notifySuperAdminsOfFeedback", () => {
  it("sends a push to every super admin, wording bug vs. feature differently", async () => {
    const superAdminRepo = new FakeSuperAdminRepository(["admin-1", "admin-2"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "admin-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "admin-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender([{ status: "sent" }, { status: "sent" }]);

    const summary = await notifySuperAdminsOfFeedback({ displayName: "Jane", type: "bug" }, superAdminRepo, pushRepo, sender);

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([
      { title: "New feedback", body: "Jane submitted a bug report", url: "/admin/super/feedback" },
      { title: "New feedback", body: "Jane submitted a bug report", url: "/admin/super/feedback" },
    ]);
  });

  it("falls back to a generic name when display name is missing, and words feature requests differently", async () => {
    const superAdminRepo = new FakeSuperAdminRepository(["admin-1"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "admin-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    await notifySuperAdminsOfFeedback({ displayName: null, type: "feature" }, superAdminRepo, pushRepo, sender);

    expect(sender.sent).toEqual([
      { title: "New feedback", body: "Someone submitted a feature request", url: "/admin/super/feedback" },
    ]);
  });

  it("does nothing when there are no super admins", async () => {
    const superAdminRepo = new FakeSuperAdminRepository();
    const pushRepo = new FakePushSubscriptionRepository();
    const sender = new FakePushSender();

    const summary = await notifySuperAdminsOfFeedback({ displayName: "Jane", type: "bug" }, superAdminRepo, pushRepo, sender);

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });
});

describe("notifyUserOfConnectionRequest", () => {
  it("sends a push to the recipient naming the requester", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "recipient-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    const summary = await notifyUserOfConnectionRequest("recipient-1", "Alex", pushRepo, sender, new FakeAuthRepository());

    expect(summary).toEqual({ sent: 1, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([{ title: "New neighbor request", body: "Alex wants to connect", url: "/account/neighbors" }]);
  });

  it("falls back to a generic name when the requester has no display name", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "recipient-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    await notifyUserOfConnectionRequest("recipient-1", null, pushRepo, sender, new FakeAuthRepository());

    expect(sender.sent).toEqual([
      { title: "New neighbor request", body: "A neighbor wants to connect", url: "/account/neighbors" },
    ]);
  });

  it("does nothing when the recipient opted out of connection requests", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "recipient-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();
    const authRepo = new FakeAuthRepository({ "recipient-1": { ...DEFAULT_PREFERENCES, connection_requests: false } });

    const summary = await notifyUserOfConnectionRequest("recipient-1", "Alex", pushRepo, sender, authRepo);

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });
});

describe("notifyUserOfConnectionAccepted", () => {
  it("sends a push to the target user naming the other party", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "requester-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    const summary = await notifyUserOfConnectionAccepted("requester-1", "Alex", pushRepo, sender, new FakeAuthRepository());

    expect(summary).toEqual({ sent: 1, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([
      { title: "New neighbor connection", body: "You and Alex are now connected", url: "/account/neighbors" },
    ]);
  });

  it("falls back to a generic name when the other party has no display name", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "requester-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();

    await notifyUserOfConnectionAccepted("requester-1", null, pushRepo, sender, new FakeAuthRepository());

    expect(sender.sent).toEqual([
      { title: "New neighbor connection", body: "You and A neighbor are now connected", url: "/account/neighbors" },
    ]);
  });

  it("does nothing when the target opted out of connection-accepted notifications", async () => {
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "requester-1", endpoint: "https://push.example/a", keys: KEYS });
    const sender = new FakePushSender();
    const authRepo = new FakeAuthRepository({ "requester-1": { ...DEFAULT_PREFERENCES, connection_accepted: false } });

    const summary = await notifyUserOfConnectionAccepted("requester-1", "Alex", pushRepo, sender, authRepo);

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });
});

describe("notifyFavoritersOfNewCoupon", () => {
  it("sends a push to every venue favoriter", async () => {
    const favoriteRepo = new FakeFavoriteRepository(["fan-1", "fan-2"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "fan-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "fan-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender([{ status: "sent" }, { status: "sent" }]);

    const summary = await notifyFavoritersOfNewCoupon(
      "venue-1",
      "Diesel Fuel Coffee",
      "20% off",
      favoriteRepo,
      pushRepo,
      sender,
      new FakeAuthRepository()
    );

    expect(summary).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(sender.sent).toEqual([
      { title: "New coupon", body: 'Diesel Fuel Coffee just launched "20% off"', url: "/location/venue-1" },
      { title: "New coupon", body: 'Diesel Fuel Coffee just launched "20% off"', url: "/location/venue-1" },
    ]);
  });

  it("does nothing when the venue has no favoriters", async () => {
    const favoriteRepo = new FakeFavoriteRepository([]);
    const pushRepo = new FakePushSubscriptionRepository();
    const sender = new FakePushSender();

    const summary = await notifyFavoritersOfNewCoupon(
      "venue-1",
      "Diesel Fuel Coffee",
      "20% off",
      favoriteRepo,
      pushRepo,
      sender,
      new FakeAuthRepository()
    );

    expect(summary).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(sender.sent).toHaveLength(0);
  });

  it("skips a favoriter who opted out of new-coupon notifications", async () => {
    const favoriteRepo = new FakeFavoriteRepository(["fan-1", "fan-2"]);
    const pushRepo = new FakePushSubscriptionRepository();
    await pushRepo.upsertSubscription({ userId: "fan-1", endpoint: "https://push.example/a", keys: KEYS });
    await pushRepo.upsertSubscription({ userId: "fan-2", endpoint: "https://push.example/b", keys: KEYS });
    const sender = new FakePushSender();
    const authRepo = new FakeAuthRepository({ "fan-1": { ...DEFAULT_PREFERENCES, new_coupons: false } });

    const summary = await notifyFavoritersOfNewCoupon(
      "venue-1",
      "Diesel Fuel Coffee",
      "20% off",
      favoriteRepo,
      pushRepo,
      sender,
      authRepo
    );

    expect(summary).toEqual({ sent: 1, pruned: 0, failed: 0 });
  });
});
