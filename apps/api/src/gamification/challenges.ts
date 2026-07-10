import type { ChallengeProgress } from "@blockwise/types";
import type { ChallengeRecord, GamificationRepository } from "./repository";

function toChallengeProgress(
  challenge: ChallengeRecord,
  progressCount: number,
  completed: boolean
): ChallengeProgress {
  return {
    id: challenge.id,
    neighborhood_id: challenge.neighborhoodId,
    title: challenge.title,
    description: challenge.description,
    target_type: challenge.categoryId ? "category" : "poi",
    category_name: challenge.categoryName,
    // The public DTO keeps poi_id/poi_name for API stability -- sourced from
    // ChallengeRecord.venueId/venueName (challenge.venue_id post-merge).
    poi_id: challenge.venueId,
    poi_name: challenge.venueName,
    target_count: challenge.targetCount,
    points_reward: challenge.pointsReward,
    badge: challenge.badge,
    starts_at: challenge.startsAt,
    ends_at: challenge.endsAt,
    progress_count: progressCount,
    completed,
  };
}

async function progressFor(
  challenge: ChallengeRecord,
  userId: string,
  repository: GamificationRepository
): Promise<number> {
  if (challenge.categoryId) {
    return repository.countDistinctVenuesCheckedInForCategory({
      userId,
      categoryId: challenge.categoryId,
      neighborhoodId: challenge.neighborhoodId,
      startsAt: challenge.startsAt,
      endsAt: challenge.endsAt,
    });
  }
  const checkedIn = await repository.hasAnyCheckinForLocation({
    userId,
    venueId: challenge.venueId!,
    startsAt: challenge.startsAt,
    endsAt: challenge.endsAt,
  });
  return checkedIn ? 1 : 0;
}

// GET /neighborhoods/:id/challenges -- template rows plus this user's live
// progress (or zeroed-out progress for an anonymous/unauthenticated request).
export async function listChallengesWithProgress(
  neighborhoodId: string,
  userId: string | null,
  repository: GamificationRepository
): Promise<ChallengeProgress[]> {
  const now = new Date().toISOString();
  const challenges = await repository.listChallengesForNeighborhood(neighborhoodId, now);

  return Promise.all(
    challenges.map(async (challenge) => {
      if (!userId) return toChallengeProgress(challenge, 0, false);

      const [completed, progressCount] = await Promise.all([
        repository.hasCompletedChallenge(userId, challenge.id),
        progressFor(challenge, userId, repository),
      ]);
      return toChallengeProgress(challenge, progressCount, completed);
    })
  );
}

// Called after a successful check-in: finds every active challenge this
// check-in could contribute to (by category, or by the specific location
// checked into), and completes any the user has now hit the target on --
// awarding the bonus points and badge (BACKLOG.md Ref 6) exactly once per
// challenge.
export async function evaluateChallengesAfterCheckin(
  input: { userId: string; neighborhoodId: string; categoryId?: string; venueId?: string },
  repository: GamificationRepository
): Promise<void> {
  const now = new Date().toISOString();
  const challenges = await repository.getActiveChallengesForTarget({
    neighborhoodId: input.neighborhoodId,
    categoryId: input.categoryId,
    venueId: input.venueId,
    now,
  });

  for (const challenge of challenges) {
    if (await repository.hasCompletedChallenge(input.userId, challenge.id)) continue;

    const progressCount = await progressFor(challenge, input.userId, repository);
    if (progressCount < challenge.targetCount) continue;

    await repository.completeChallenge({
      userId: input.userId,
      challengeId: challenge.id,
      neighborhoodId: challenge.neighborhoodId,
      pointsReward: challenge.pointsReward,
      badgeId: challenge.badge?.id ?? null,
    });
  }
}
