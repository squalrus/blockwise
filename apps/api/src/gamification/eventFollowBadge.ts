import type { GamificationRepository } from "./repository";

// One-off badge (mirroring founderBadge.ts's pattern) for a user's
// first-ever event follow (BACKLOG.md Ref 81). awardBadgeByCode is
// idempotent (unique violation on user_badge swallowed), so this is safe to
// call on every successful follow rather than needing to separately track
// whether it's the user's first one -- it only ever actually lands once.
export const EVENT_SCOUT_BADGE_CODE = "event_scout";

export async function awardEventFollowBadge(userId: string, repository: GamificationRepository): Promise<void> {
  await repository.awardBadgeByCode(userId, EVENT_SCOUT_BADGE_CODE);
}
