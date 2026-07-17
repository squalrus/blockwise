import type { ActivityType, ProfileVisibility } from "@blockwise/types";

// One row per activity event, pre-join but not yet masked -- actor visibility
// is exposed raw here so the business logic layer (activity.ts) decides how
// to render actor_name, rather than baking that decision into the query.
export interface ActivityRecord {
  id: string;
  type: ActivityType;
  actorDisplayName: string | null;
  actorUsername: string | null;
  actorVisibility: ProfileVisibility;
  venueId: string | null;
  venueName: string | null;
  badgeName: string | null;
  badgeIcon: string | null;
  challengeTitle: string | null;
  // Set only for type "event_follow" (BACKLOG.md Ref 81).
  eventId: string | null;
  eventTitle: string | null;
  // Set only for type "neighbor_connection" -- the other party's raw
  // profile fields, masked into other_user_name/other_user_username by
  // activity.ts the same way actorDisplayName/actorUsername are.
  otherUserId: string | null;
  otherUserDisplayName: string | null;
  otherUserUsername: string | null;
  otherUserVisibility: ProfileVisibility | null;
  occurredAt: string;
}

// Abstracts persistence so listRecentActivity/listActivityForUsers
// (activity.ts) can be tested against an in-memory fake, mirroring
// gamification/repository.ts.
export interface ActivityRepository {
  // Most recent `limit` activity events (check-ins, favorites, challenge
  // completions, badge unlocks, event follows) across every user in the
  // neighborhood, newest first.
  listRecentActivity(neighborhoodId: string, limit: number): Promise<ActivityRecord[]>;
  // Same activity types as listRecentActivity, but scoped to a specific set
  // of user ids (BACKLOG.md Ref 81 -- /me/feed's neighbor-scoped Spore Feed)
  // rather than a neighborhood -- no neighborhood dimension at all, since a
  // neighbor connection isn't itself neighborhood-scoped.
  listActivityForUsers(userIds: string[], limit: number): Promise<ActivityRecord[]>;
}
