import { describe, expect, it } from "vitest";
import { sendPushToUsers, subscribeToPush, unsubscribeFromPush } from "./pushSubscriptions";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "./repository";
import type { PushPayload, PushSender, SendResult } from "./webPushSender";
import type { PushSubscriptionKeys } from "@blockwise/types";

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
