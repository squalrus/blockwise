import type {
  CreatePushSubscriptionRequest,
  NotificationPreferences,
  PushSubscriptionKeys,
  PushSubscriptionRecord as PushSubscriptionDto,
} from "@blockwise/types";
import type { NeighborhoodAdminRepository, SuperAdminRepository } from "../admin/repository";
import type { AuthRepository } from "../auth/repository";
import type { ConnectionRepository } from "../connections/repository";
import type { FavoriteRepository } from "../favorites/repository";
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

  // BACKLOG.md Ref 116 item 4: each subscription's send is independent of
  // every other's (no shared state besides this summary, which each branch
  // below only ever increments its own counter of) -- sent in parallel
  // instead of one push-service round trip at a time, so this no longer
  // scales linearly with the checking-in user's connection count.
  await Promise.all(
    subscriptions.map(async (subscription) => {
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
    })
  );

  return summary;
}

// BACKLOG.md Ref 102 follow-up: narrows a candidate recipient list down to
// users who haven't opted out of the given category on /account/settings.
// Shared by every notify* trigger below that has a per-user recipient
// (rather than a role-scoped one like the super/neighborhood-admin alerts,
// which stay ungated -- those are operational, not personal preferences).
export async function filterByNotificationPreference(
  userIds: string[],
  category: keyof NotificationPreferences,
  authRepository: AuthRepository
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const preferences = await authRepository.getNotificationPreferences(userIds);
  return userIds.filter((id) => preferences.get(id)?.[category] !== false);
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
  checkin: { displayName: string | null; venueName: string; venueId: string },
  connectionRepository: ConnectionRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender,
  authRepository: AuthRepository
): Promise<SendPushSummary> {
  const connections = await connectionRepository.listConnectionsForUser(checkinUserId, "accepted");
  const neighborUserIds = await filterByNotificationPreference(
    connections.map((c) => c.user.id),
    "checkins",
    authRepository
  );
  if (neighborUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = checkin.displayName ?? "A neighbor";
  return sendPushToUsers(
    neighborUserIds,
    { title: "Neighbor check-in", body: `${name} checked in at ${checkin.venueName}`, url: `/location/${checkin.venueId}` },
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
    { title: "New signup", body: `${name} just joined Spored`, url: "/admin/super/users" },
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
    { title: "New feedback", body: `${name} submitted a ${kind}`, url: "/admin/super/feedback" },
    subscriptionRepository,
    sender
  );
}

// notifySuperAdminsOfFeedback's sibling for the "missing_venue" feedback
// type (BACKLOG.md Ref 80/96) -- routed to the *reported neighborhood's own*
// admins rather than every super admin, since a missing-venue report is
// only actionable by someone who can already manage that neighborhood's
// Locations tab (and now its Investigate tool).
export async function notifyNeighborhoodAdminsOfMissingVenue(
  report: { displayName: string | null; venueName: string },
  neighborhoodId: string,
  // The reported neighborhood's own slug (the admin shell's routes are
  // slug-keyed, not id-keyed) -- fetched by the caller rather than looked up
  // in here, since this function otherwise has no reason to depend on
  // NeighborhoodRepository.
  neighborhoodSlug: string,
  neighborhoodAdminRepository: NeighborhoodAdminRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender
): Promise<SendPushSummary> {
  const adminUserIds = await neighborhoodAdminRepository.listAdminUserIdsForNeighborhood(neighborhoodId);
  if (adminUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = report.displayName ?? "A neighbor";
  return sendPushToUsers(
    adminUserIds,
    {
      title: "Missing venue reported",
      body: `${name} reported "${report.venueName}" as missing`,
      url: `/admin/neighborhood/${neighborhoodSlug}/locations/reports`,
    },
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
  sender: PushSender,
  authRepository: AuthRepository
): Promise<SendPushSummary> {
  const enabled = await filterByNotificationPreference([recipientUserId], "connection_requests", authRepository);
  if (enabled.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = requesterDisplayName ?? "A neighbor";
  return sendPushToUsers(
    [recipientUserId],
    { title: "New neighbor request", body: `${name} wants to connect`, url: "/account/neighbors" },
    subscriptionRepository,
    sender
  );
}

// Fired at both moments a connection can become accepted -- POST
// /me/connections/:id/accept's explicit accept, and POST /me/connections's
// mutual-interest auto-accept branch (BACKLOG.md Ref 14/33's connections.ts
// sendConnectionRequest) -- so the wording stays neutral about which side
// took the accepting action rather than claiming a specific one did.
// BACKLOG.md Ref 102 follow-up: fired after POST /business/venues/:id/coupons
// creates a coupon, alerting every user who favorites that venue (favoriting
// is the follow relationship, per coupons.ts's listActiveCouponsForVenues
// comment) that something new is available there.
export async function notifyFavoritersOfNewCoupon(
  venueId: string,
  venueName: string,
  couponTitle: string,
  favoriteRepository: FavoriteRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender,
  authRepository: AuthRepository
): Promise<SendPushSummary> {
  const favoriterUserIds = await favoriteRepository.listUserIdsFavoritingVenue(venueId);
  const enabledUserIds = await filterByNotificationPreference(favoriterUserIds, "new_coupons", authRepository);
  if (enabledUserIds.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  return sendPushToUsers(
    enabledUserIds,
    { title: "New coupon", body: `${venueName} just launched "${couponTitle}"`, url: `/location/${venueId}` },
    subscriptionRepository,
    sender
  );
}

export async function notifyUserOfConnectionAccepted(
  targetUserId: string,
  otherDisplayName: string | null,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender,
  authRepository: AuthRepository
): Promise<SendPushSummary> {
  const enabled = await filterByNotificationPreference([targetUserId], "connection_accepted", authRepository);
  if (enabled.length === 0) {
    return { sent: 0, pruned: 0, failed: 0 };
  }

  const name = otherDisplayName ?? "A neighbor";
  return sendPushToUsers(
    [targetUserId],
    { title: "New neighbor connection", body: `You and ${name} are now connected`, url: "/account/neighbors" },
    subscriptionRepository,
    sender
  );
}
