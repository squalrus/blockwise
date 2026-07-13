import type { ActivityItem } from "@blockwise/types";
import type { ActivityRecord, ActivityRepository } from "./repository";

const DEFAULT_LIMIT = 50;

function actorName(record: ActivityRecord): string {
  if (record.actorVisibility !== "public") return "A user";
  return record.actorDisplayName ?? record.actorUsername ?? "A user";
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
