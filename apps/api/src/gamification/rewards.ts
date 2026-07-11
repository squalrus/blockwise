import type { Badge } from "@blockwise/types";
import type { GamificationRepository } from "./repository";
import { type CompletedChallengeSummary, evaluateChallengesAfterCheckin } from "./challenges";
import { evaluateBadgesAfterCheckin } from "./badges";
import { CHECKIN_POINTS } from "./points";

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

  const [challengesCompleted, badgesEarned] = await Promise.all([
    evaluateChallengesAfterCheckin(
      {
        userId: checkin.userId,
        neighborhoodId: context.neighborhoodId,
        categoryId: context.categoryId ?? undefined,
        venueId: checkin.venueId,
        locationKind: context.kind,
      },
      repository
    ),
    evaluateBadgesAfterCheckin(
      {
        userId: checkin.userId,
        venueId: checkin.venueId,
        categoryId: context.categoryId ?? undefined,
        kind: context.kind,
        checkedInAt: checkin.checkedInAt,
      },
      repository
    ),
  ]);

  const pointsEarned =
    CHECKIN_POINTS + challengesCompleted.reduce((sum, c) => sum + c.pointsReward, 0);

  return { pointsEarned, challengesCompleted, badgesEarned };
}
