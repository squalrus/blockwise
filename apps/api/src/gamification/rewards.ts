import type { GamificationRepository } from "./repository";
import { evaluateChallengesAfterCheckin } from "./challenges";
import { CHECKIN_POINTS } from "./points";

// Orchestrates everything a successful check-in earns (BACKLOG.md Ref 6):
// the flat 10pt award, plus completing any active challenge this check-in
// now satisfies. Best-effort -- callers should log and swallow errors from
// this rather than failing the check-in response itself, since the check-in
// already succeeded by the time this runs.
export async function awardCheckinRewards(
  checkin: { userId: string; checkinId: string; venueId: string },
  repository: GamificationRepository
): Promise<void> {
  const context = await repository.getLocationContext(checkin.venueId);
  if (!context) return;

  await repository.awardPoints({
    userId: checkin.userId,
    neighborhoodId: context.neighborhoodId,
    eventType: "checkin",
    points: CHECKIN_POINTS,
    venueId: checkin.venueId,
    checkinId: checkin.checkinId,
  });

  await evaluateChallengesAfterCheckin(
    {
      userId: checkin.userId,
      neighborhoodId: context.neighborhoodId,
      categoryId: context.categoryId ?? undefined,
      venueId: checkin.venueId,
    },
    repository
  );
}
