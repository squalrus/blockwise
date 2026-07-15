import type { GamificationRepository } from "./repository";

// BACKLOG.md Ref 50: every account gets the "founder" badge automatically
// while Spored is still pre-launch, so early signups see recognition
// right away instead of waiting on a manually-run backfill. Existing
// accounts were backfilled directly in 20260707070000_founder_badge_backfill.sql.
// Turn this off once v1.0.0 ships (BACKLOG.md Ref 52) -- signups after that
// point aren't "founders".
export const FOUNDER_BADGE_CODE = "founder";

export async function awardFounderBadge(
  userId: string,
  repository: GamificationRepository
): Promise<void> {
  await repository.awardBadgeByCode(userId, FOUNDER_BADGE_CODE);
}
