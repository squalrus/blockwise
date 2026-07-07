import type { VenueContext } from "./repository";
import type { GamificationRepository } from "./repository";
import { evaluateChallengesAfterCheckin } from "./challenges";
import { CHECKIN_POINTS } from "./points";

// Orchestrates everything a successful check-in earns (BACKLOG.md Ref 6):
// the flat 10pt award, plus completing any active challenge this check-in
// now satisfies. Best-effort -- callers should log and swallow errors from
// this rather than failing the check-in response itself, since the check-in
// already succeeded by the time this runs.
export async function awardCheckinRewards(
  checkin: { userId: string; checkinId: string; venueId?: string; poiId?: string },
  repository: GamificationRepository
): Promise<void> {
  const context = checkin.venueId
    ? await repository.getVenueContext(checkin.venueId)
    : await repository.getPoiContext(checkin.poiId!);
  if (!context) return;

  await repository.awardPoints({
    userId: checkin.userId,
    neighborhoodId: context.neighborhoodId,
    eventType: "checkin",
    points: CHECKIN_POINTS,
    venueId: checkin.venueId,
    poiId: checkin.poiId,
    checkinId: checkin.checkinId,
  });

  const categoryId = checkin.venueId ? (context as VenueContext).categoryId ?? undefined : undefined;
  await evaluateChallengesAfterCheckin(
    {
      userId: checkin.userId,
      neighborhoodId: context.neighborhoodId,
      categoryId,
      poiId: checkin.poiId,
    },
    repository
  );
}
