import type { ActivityItem } from "@blockwise/types";
import type { ActivityRecord, ActivityRepository } from "./repository";

const DEFAULT_LIMIT = 50;

function actorName(record: ActivityRecord): string {
  if (record.actorVisibility !== "public") return "A user";
  return record.actorDisplayName ?? record.actorUsername ?? "A user";
}

// Mirrors actorName above -- the other party in a neighbor_connection row is
// masked by their *own* visibility, same rule, same fallback shape (just "a
// neighbor" in place of "A user" since the sentence reads "X connected with
// <other>" rather than starting a sentence).
function otherUserName(record: ActivityRecord): string | null {
  if (record.otherUserId === null) return null;
  if (record.otherUserVisibility !== "public") return "a neighbor";
  return record.otherUserDisplayName ?? record.otherUserUsername ?? "a neighbor";
}

function toActivityItem(record: ActivityRecord): ActivityItem {
  return {
    id: record.id,
    type: record.type,
    actor_name: actorName(record),
    actor_username: record.actorVisibility === "public" ? record.actorUsername : null,
    venue_id: record.venueId,
    venue_name: record.venueName,
    badge_name: record.badgeName,
    badge_icon: record.badgeIcon,
    challenge_title: record.challengeTitle,
    event_id: record.eventId,
    event_title: record.eventTitle,
    other_user_name: otherUserName(record),
    other_user_username: record.otherUserVisibility === "public" ? record.otherUserUsername : null,
    occurred_at: record.occurredAt,
  };
}

// Neighborhood-wide Recent activity tab (BACKLOG.md Ref 27's expanded
// scope): the actor's real name is only ever exposed for a public profile --
// a private profile shows as "A user" rather than being excluded, since the
// point is to show that *something* happened in the neighborhood.
export async function listRecentActivity(
  neighborhoodId: string,
  repository: ActivityRepository,
  limit: number = DEFAULT_LIMIT
): Promise<ActivityItem[]> {
  const records = await repository.listRecentActivity(neighborhoodId, limit);
  return records.map(toActivityItem);
}

// Shared by /account's Spore Feed (GET /me/feed, called with the caller's
// accepted neighbor connections) and My Activity (GET /me/activity, called
// with just the caller's own id) tabs: the same activity types as
// listRecentActivity above, but scoped to a set of user ids instead of a
// neighborhood -- a neighbor connection has no neighborhood dimension, so
// this deliberately doesn't take one. Also includes "neighbor_connection"
// rows (one of these users connecting with someone else), which
// listRecentActivity deliberately excludes since a connection isn't a
// neighborhood event. Still masks a private actor's (and, for
// neighbor_connection, the other party's) name the same way, even for a
// user in the queried set -- visibility is the one real-name gate
// everywhere else in the app (see ActivityItem's doc comment). GET
// /me/activity unmasks the results afterward since that's the caller's own
// data (see listMyActivity below); GET /me/feed doesn't.
export async function listActivityForUsers(
  userIds: string[],
  repository: ActivityRepository,
  limit: number = DEFAULT_LIMIT
): Promise<ActivityItem[]> {
  if (userIds.length === 0) return [];
  const records = await repository.listActivityForUsers(userIds, limit);
  return records.map(toActivityItem);
}

// /account's My Activity tab (BACKLOG.md Ref 81 follow-up): every activity
// type for the signed-in user's own actions (checkins/favorites/badges/
// challenge completions/event follows/neighbor connections), reusing
// listActivityForUsers with a single-element id list. Unlike every other
// caller of that function, the actor's own name is never masked behind
// their visibility setting here -- this is the account viewing its own
// data, already shown unmasked everywhere else on /account -- and never
// linked to their public profile (actor_username cleared), since a private
// profile's own /profile/:username page isn't even reachable. The
// other-party name on a neighbor_connection row is left untouched -- that's
// someone else's identity, still subject to their own visibility.
export async function listMyActivity(
  userId: string,
  displayName: string | null,
  username: string | null,
  repository: ActivityRepository,
  limit: number = DEFAULT_LIMIT
): Promise<ActivityItem[]> {
  const items = await listActivityForUsers([userId], repository, limit);
  const selfName = displayName ?? username ?? "You";
  return items.map((item) => ({ ...item, actor_name: selfName, actor_username: null }));
}
