import type { GamificationRepository } from "./repository";

// One-off badges (mirroring eventFollowBadge.ts's pattern) for the feedback
// feature (BETA-prep): "Feedback Giver" on a user's first-ever feedback
// submission, "Contributor" when one of their submissions is later marked
// "done". awardBadgeByCode is idempotent (unique violation on user_badge
// swallowed), so both are safe to call every time their triggering action
// happens rather than needing to separately track "is this the first one".
export const FEEDBACK_GIVER_BADGE_CODE = "feedback_giver";
export const CONTRIBUTOR_BADGE_CODE = "contributor";

export async function awardFeedbackGiverBadge(userId: string, repository: GamificationRepository): Promise<void> {
  await repository.awardBadgeByCode(userId, FEEDBACK_GIVER_BADGE_CODE);
}

export async function awardContributorBadge(userId: string, repository: GamificationRepository): Promise<void> {
  await repository.awardBadgeByCode(userId, CONTRIBUTOR_BADGE_CODE);
}
