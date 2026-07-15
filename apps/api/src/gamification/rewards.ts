import type { Badge } from "@blockwise/types";
import type { GamificationRepository } from "./repository";
import { type CompletedChallengeSummary, evaluateChallengesAfterCheckin } from "./challenges";
import { evaluateBadgesAfterCheckin, evaluateBadgesForNeighborCount } from "./badges";
import { CHECKIN_POINTS, NEIGHBOR_CONNECTION_POINTS } from "./points";

export interface CheckinRewardsSummary {
  pointsEarned: number;
  challengesCompleted: CompletedChallengeSummary[];
  badgesEarned: Badge[];
}

const NO_REWARDS: CheckinRewardsSummary = {
  pointsEarned: 0,
  challengesCompleted: [],
  badgesEarned: [],
};

// Orchestrates everything a successful check-in earns (BACKLOG.md Ref 6):
// the flat 10pt award, plus completing any active challenge and awarding any
// badge this check-in now satisfies. Challenges and badges are evaluated
// independently of each other (evaluateChallengesAfterCheckin vs
// evaluateBadgesAfterCheckin, no shared code) -- both simply react to the
// same check-in event. Best-effort -- callers should log and swallow errors
// from this rather than failing the check-in response itself, since the
// check-in already succeeded by the time this runs.
export async function awardCheckinRewards(
  checkin: { userId: string; checkinId: string; venueId: string; checkedInAt: string },
  repository: GamificationRepository
): Promise<CheckinRewardsSummary> {
  const context = await repository.getLocationContext(checkin.venueId);
  if (!context) return NO_REWARDS;

  await repository.awardPoints({
    userId: checkin.userId,
    neighborhoodId: context.neighborhoodId,
    eventType: "checkin",
    points: CHECKIN_POINTS,
    venueId: checkin.venueId,
    checkinId: checkin.checkinId,
  });

  // Sequential, not Promise.all: evaluateBadgesAfterCheckin's level_reached
  // rule takes one getUserPointsTotal snapshot and checks every rule against
  // it. If a challenge this same check-in completes awards enough bonus
  // points to cross a level threshold, that snapshot has to be taken *after*
  // evaluateChallengesAfterCheckin's point_event write commits -- otherwise
  // the level-up badge silently misses this check-in (and only catches up
  // whenever the user's next check-in happens to re-evaluate it, if ever).
  const challengesCompleted = await evaluateChallengesAfterCheckin(
    {
      userId: checkin.userId,
      neighborhoodId: context.neighborhoodId,
      categoryId: context.categoryId ?? undefined,
      venueId: checkin.venueId,
      locationKind: context.kind,
    },
    repository
  );
  const badgesEarned = await evaluateBadgesAfterCheckin(
    {
      userId: checkin.userId,
      venueId: checkin.venueId,
      categoryId: context.categoryId ?? undefined,
      kind: context.kind,
      checkedInAt: checkin.checkedInAt,
    },
    repository
  );

  const pointsEarned =
    CHECKIN_POINTS + challengesCompleted.reduce((sum, c) => sum + c.pointsReward, 0);

  return { pointsEarned, challengesCompleted, badgesEarned };
}

export interface NeighborConnectionRewardsSummary {
  pointsEarned: number;
  badgesEarned: Badge[];
}

// Awards NEIGHBOR_CONNECTION_POINTS to one side of a newly-accepted neighbor
// connection (BACKLOG.md Ref 14/33) and evaluates neighbor_count_reached
// badge rules against that side's new connection count. The caller (app.ts)
// invokes this once per party -- accepting a connection is symmetric, so
// both users earn the same reward, unlike awardCheckinRewards above which
// only ever rewards the one user who checked in. neighborCount is passed in
// rather than queried here since it comes from ConnectionRepository, a
// different repository than this one.
export async function awardNeighborConnectionRewards(
  input: { userId: string; otherUserId: string; neighborCount: number },
  repository: GamificationRepository
): Promise<NeighborConnectionRewardsSummary> {
  const wasAwarded = await repository.awardPoints({
    userId: input.userId,
    eventType: "neighbor_connection",
    points: NEIGHBOR_CONNECTION_POINTS,
    neighborUserId: input.otherUserId,
  });

  const badgesEarned = await evaluateBadgesForNeighborCount(input.userId, input.neighborCount, repository);

  return { pointsEarned: wasAwarded ? NEIGHBOR_CONNECTION_POINTS : 0, badgesEarned };
}
