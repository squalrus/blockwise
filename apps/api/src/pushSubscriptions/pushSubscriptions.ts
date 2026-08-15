import type { CreatePushSubscriptionRequest, PushSubscriptionKeys, PushSubscriptionRecord as PushSubscriptionDto } from "@blockwise/types";
import type { SuperAdminRepository } from "../admin/repository";
import type { ConnectionRepository } from "../connections/repository";
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

// BACKLOG.md Ref 91: the first real trigger into sendPushToUsers above,
// fired after a successful check-in. Notifies every one of the
// checking-in user's *accepted* connections -- not filtered by the
// checking-in user's profile visibility, since a direct connection is
// already a stronger relationship than the general public the visibility
// flag gates elsewhere in the app. No de-dupe/cooldown for repeat same-day
// check-ins in this first cut.
export async function notifyConnectionsOfCheckin(
  checkinUserId: string,
  checkin: { displayName: string | null; venueName: string },
  connectionRepository: ConnectionRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const connections = await connectionRepository.listConnectionsForUser(checkinUserId, "accepted");
  const neighborUserIds = connections.map((c) => c.user.id);
  if (neighborUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = checkin.displayName ?? "A neighbor";
  return sendPushToUsers(
    neighborUserIds,
    { title: "Neighbor check-in", body: `${name} checked in at ${checkin.venueName}` },
    subscriptionRepository,
    sender
  );
}

// BACKLOG.md Ref 91's sibling: alerts every super admin (in practice just
// the app's operator today, but scoped to the role rather than a hardcoded
// user id so it still works if a second super admin is ever granted) when a
// brand-new account completes signup -- the one other-user-initiated event
// besides a check-in that's worth a real-time nudge for the person running
// the app.
export async function notifySuperAdminsOfSignup(
  newUser: { displayName: string | null; email: string | null },
  superAdminRepository: SuperAdminRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const superAdminUserIds = await superAdminRepository.listSuperAdminUserIds();
  if (superAdminUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = newUser.displayName ?? newUser.email ?? "Someone";
  return sendPushToUsers(
    superAdminUserIds,
    { title: "New signup", body: `${name} just joined Spored` },
    subscriptionRepository,
    sender
  );
}

// notifySuperAdminsOfSignup's sibling -- alerts every super admin when a new
// bug report or feature request comes in (POST /me/feedback), so triage
// (the super admin shell's Feedback tab) doesn't rely on an admin manually
// checking back.
export async function notifySuperAdminsOfFeedback(
  submission: { displayName: string | null; type: "bug" | "feature" },
  superAdminRepository: SuperAdminRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const superAdminUserIds = await superAdminRepository.listSuperAdminUserIds();
  if (superAdminUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = submission.displayName ?? "Someone";
  const kind = submission.type === "bug" ? "bug report" : "feature request";
  return sendPushToUsers(
    superAdminUserIds,
    { title: "New feedback", body: `${name} submitted a ${kind}` },
    subscriptionRepository,
    sender
  );
}

// Fired when POST /me/connections creates a fresh pending request (not the
// mutual-interest auto-accept branch, which is already an acceptance --
// see notifyUserOfConnectionAccepted below).
export async function notifyUserOfConnectionRequest(
  recipientUserId: string,
  requesterDisplayName: string | null,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const name = requesterDisplayName ?? "A neighbor";
  return sendPushToUsers(
    [recipientUserId],
    { title: "New neighbor request", body: `${name} wants to connect` },
    subscriptionRepository,
    sender
  );
}

// Fired at both moments a connection can become accepted -- POST
// /me/connections/:id/accept's explicit accept, and POST /me/connections's
// mutual-interest auto-accept branch (BACKLOG.md Ref 14/33's connections.ts
// sendConnectionRequest) -- so the wording stays neutral about which side
// took the accepting action rather than claiming a specific one did.
export async function notifyUserOfConnectionAccepted(
  targetUserId: string,
  otherDisplayName: string | null,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const name = otherDisplayName ?? "A neighbor";
  return sendPushToUsers(
    [targetUserId],
    { title: "New neighbor connection", body: `You and ${name} are now connected` },
    subscriptionRepository,
    sender
  );
}
