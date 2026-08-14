import type { CreatePushSubscriptionRequest, PushSubscriptionKeys, PushSubscriptionRecord as PushSubscriptionDto } from "@blockwise/types";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "./repository";
import type { PushPayload, PushSender } from "./webPushSender";

function toDto(record: PushSubscriptionRecord): PushSubscriptionDto {
  return {
    id: record.id,
    user_id: record.userId,
    endpoint: record.endpoint,
    keys: record.keys,
    created_at: record.createdAt,
  };
}

function isValidKeys(keys: unknown): keys is PushSubscriptionKeys {
  if (!keys || typeof keys !== "object") return false;
  const { p256dh, auth } = keys as Record<string, unknown>;
  return typeof p256dh === "string" && p256dh.length > 0 && typeof auth === "string" && auth.length > 0;
}

export type SubscribeResult =
  | { status: "subscribed"; subscription: PushSubscriptionDto }
  | { status: "invalid"; message: string };

export async function subscribeToPush(
  userId: string,
  input: CreatePushSubscriptionRequest,
  repository: PushSubscriptionRepository
): Promise<SubscribeResult> {
  if (typeof input?.endpoint !== "string" || !input.endpoint.trim()) {
    return { status: "invalid", message: "endpoint is required" };
  }
  if (!isValidKeys(input.keys)) {
    return { status: "invalid", message: "keys.p256dh and keys.auth are required" };
  }

  const created = await repository.upsertSubscription({
    userId,
    endpoint: input.endpoint,
    keys: input.keys,
  });
  return { status: "subscribed", subscription: toDto(created) };
}

export type UnsubscribeResult = { status: "unsubscribed" } | { status: "not_found" } | { status: "forbidden" };

export async function unsubscribeFromPush(
  userId: string,
  subscriptionId: string,
  repository: PushSubscriptionRepository
): Promise<UnsubscribeResult> {
  const existing = await repository.getSubscription(subscriptionId);
  if (!existing) return { status: "not_found" };
  if (existing.userId !== userId) return { status: "forbidden" };

  await repository.deleteSubscription(subscriptionId);
  return { status: "unsubscribed" };
}

export interface SendPushSummary {
  sent: number;
  pruned: number;
  failed: number;
}

// Fans a payload out to every subscription owned by the given users, pruning
// any endpoint the push service reports as gone. This is the one shared
// send path -- the admin test-send route below is its first caller, but any
// future trigger (neighborhood notifications, coupon alerts, etc.) is meant
// to call this same function rather than talk to PushSender directly.
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  repository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const subscriptions = await repository.listForUsers(userIds);
  const summary: SendPushSummary = { sent: 0, pruned: 0, failed: 0 };

  for (const subscription of subscriptions) {
    const result = await sender.send({ endpoint: subscription.endpoint, keys: subscription.keys }, payload);
    if (result.status === "sent") {
      summary.sent += 1;
    } else if (result.status === "gone") {
      summary.pruned += 1;
      await repository.deleteSubscription(subscription.id);
    } else {
      summary.failed += 1;
      console.error(`push send to subscription ${subscription.id} failed:`, result.message);
    }
  }

  return summary;
}
