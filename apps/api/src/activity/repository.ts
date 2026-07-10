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
  occurredAt: string;
}

// Abstracts persistence so listRecentActivity (activity.ts) can be tested
// against an in-memory fake, mirroring gamification/repository.ts.
export interface ActivityRepository {
  // Most recent `limit` activity events (check-ins, favorites, challenge
  // completions, badge unlocks) across every user in the neighborhood,
  // newest first.
  listRecentActivity(neighborhoodId: string, limit: number): Promise<ActivityRecord[]>;
}
