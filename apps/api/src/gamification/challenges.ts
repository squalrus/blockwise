import type {
  Badge,
  ChallengeProgress,
  LocationKind,
  UserChallenge,
  UserChallengeProgress,
  UserChallengesSummary,
} from "@blockwise/types";
import type { ChallengeRecord, GamificationRepository } from "./repository";

// Returned by evaluateChallengesAfterCheckin so the check-in response
// (rewards.ts, app.ts) can surface "challenges completed" alongside badges.
export interface CompletedChallengeSummary {
  id: string;
  title: string;
  pointsReward: number;
  badge: Badge | null;
}

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
    target_type: challenge.categoryId
      ? "category"
      : challenge.targetKind === "poi"
        ? "any_poi"
        : challenge.targetKind === "any"
          ? "any_activity"
          : "poi",
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
  if (challenge.targetKind) {
    return repository.countDistinctVenuesCheckedInForKind({
      userId,
      // "any" omits the kind filter entirely -- any location kind counts.
      kind: challenge.targetKind === "poi" ? "poi" : undefined,
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
//
// Self-heals a gap in evaluateChallengesAfterCheckin: that function only
// completes a challenge as a side effect of a *new* check-in, so a check-in
// that already satisfied a challenge's target before the challenge ever got
// evaluated against it (e.g. the challenge template was added after the
// check-in happened) would otherwise show 100% progress here forever without
// ever actually completing -- no points, no badge, permanently stuck "in
// progress". Catching progressCount >= targetCount here awards it exactly
// once, the same way a qualifying check-in would have.
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

      const [alreadyCompleted, progressCount] = await Promise.all([
        repository.hasCompletedChallenge(userId, challenge.id),
        progressFor(challenge, userId, repository),
      ]);

      let completed = alreadyCompleted;
      if (!completed && progressCount >= challenge.targetCount) {
        // completeChallenge returns false only on a unique-violation (a
        // concurrent request already inserted the completion row) -- either
        // way, the challenge is now completed.
        await repository.completeChallenge({
          userId,
          challengeId: challenge.id,
          neighborhoodId: challenge.neighborhoodId,
          pointsReward: challenge.pointsReward,
          badgeId: challenge.badge?.id ?? null,
        });
        completed = true;
      }
      return toChallengeProgress(challenge, progressCount, completed);
    })
  );
}

// BACKLOG.md Ref 47: an all-time, all-neighborhood completed-challenge
// count for the account page's profile summary card, mirroring
// points.ts's getUserPoints.
export async function getUserChallengesSummary(
  userId: string,
  repository: GamificationRepository
): Promise<UserChallengesSummary> {
  const completedCount = await repository.countCompletedChallengesForUser(userId);
  return { completed_count: completedCount };
}

// GET /me/challenges (BACKLOG.md Ref 47's account page Challenges tab):
// every challenge this user has completed, across every neighborhood,
// mirroring points.ts's getUserBadges.
export async function getUserCompletedChallenges(
  userId: string,
  repository: GamificationRepository
): Promise<UserChallenge[]> {
  const records = await repository.getUserCompletedChallenges(userId);
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    description: record.description,
    neighborhood_id: record.neighborhoodId,
    neighborhood_name: record.neighborhoodName,
    points_reward: record.pointsReward,
    badge: record.badge,
    completed_at: record.completedAt,
  }));
}

// GET /me/challenges/active (account page Challenges tab): every challenge
// this user has made some progress on but not yet completed, across every
// neighborhood they belong to, mirroring getUserCompletedChallenges above
// but sourced from listChallengesWithProgress (per-neighborhood, like GET
// /neighborhoods/:slug/challenges) rather than a completion table, since
// there's no "in progress" row to query directly. Excludes progress_count
// === 0 -- otherwise every active challenge template in every neighborhood
// the user has ever joined would show up here regardless of whether they've
// engaged with it at all.
export async function getUserActiveChallenges(
  userId: string,
  neighborhoods: { neighborhoodId: string; name: string }[],
  repository: GamificationRepository
): Promise<UserChallengeProgress[]> {
  const perNeighborhood = await Promise.all(
    neighborhoods.map(async ({ neighborhoodId, name }) => {
      const progress = await listChallengesWithProgress(neighborhoodId, userId, repository);
      return progress
        .filter((challenge) => !challenge.completed && challenge.progress_count > 0)
        .map((challenge) => ({ ...challenge, neighborhood_name: name }));
    })
  );
  // Most-complete-first -- percent rather than raw progress_count, since
  // target_count varies across challenges (2 of 3 should rank above 2 of 10).
  return perNeighborhood
    .flat()
    .sort((a, b) => b.progress_count / b.target_count - a.progress_count / a.target_count);
}

// Called after a successful check-in: finds every active challenge this
// check-in could contribute to (by category, by the specific location
// checked into, or by that location's kind), and completes any the user has
// now hit the target on -- awarding the bonus points and badge (BACKLOG.md
// Ref 6) exactly once per challenge.
export async function evaluateChallengesAfterCheckin(
  input: {
    userId: string;
    neighborhoodId: string;
    categoryId?: string;
    venueId?: string;
    locationKind?: LocationKind;
  },
  repository: GamificationRepository
): Promise<CompletedChallengeSummary[]> {
  const now = new Date().toISOString();
  const challenges = await repository.getActiveChallengesForTarget({
    neighborhoodId: input.neighborhoodId,
    categoryId: input.categoryId,
    venueId: input.venueId,
    locationKind: input.locationKind,
    now,
  });

  const completed: CompletedChallengeSummary[] = [];
  for (const challenge of challenges) {
    if (await repository.hasCompletedChallenge(input.userId, challenge.id)) continue;

    const progressCount = await progressFor(challenge, input.userId, repository);
    if (progressCount < challenge.targetCount) continue;

    const wasCompleted = await repository.completeChallenge({
      userId: input.userId,
      challengeId: challenge.id,
      neighborhoodId: challenge.neighborhoodId,
      pointsReward: challenge.pointsReward,
      badgeId: challenge.badge?.id ?? null,
    });
    if (wasCompleted) {
      completed.push({
        id: challenge.id,
        title: challenge.title,
        pointsReward: challenge.pointsReward,
        badge: challenge.badge,
      });
    }
  }
  return completed;
}
