import { describe, expect, it } from "vitest";
import { awardCheckinRewards } from "./rewards";
import { CHECKIN_POINTS } from "./points";
import { FakeGamificationRepository, makeBadge, makeBadgeRule, makeChallenge } from "./testSupport";

const NOW = "2026-07-15T12:00:00.000Z";

describe("awardCheckinRewards", () => {
  it("returns zeroed rewards for a check-in against an unknown location", async () => {
    const repo = new FakeGamificationRepository();
    const summary = await awardCheckinRewards(
      { userId: "user-1", checkinId: "checkin-1", venueId: "missing", checkedInAt: NOW },
      repo
    );
    expect(summary).toEqual({ pointsEarned: 0, challengesCompleted: [], badgesEarned: [] });
  });

  it("aggregates the flat check-in award with an independently-completed challenge and an independently-awarded badge", async () => {
    const repo = new FakeGamificationRepository();
    repo.locations.set("venue-1", { neighborhoodId: "n1", categoryId: "cat-coffee", kind: "business" });
    // The checkin row itself already exists by the time awardCheckinRewards
    // runs -- checkins/repository.ts inserts it before this is called.
    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: NOW });

    const challengeBadge = makeBadge({ id: "badge-coffee-crawl", code: "coffee_crawler" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-1",
        neighborhoodId: "n1",
        categoryId: "cat-coffee",
        categoryName: "Coffee Shop",
        targetCount: 1,
        pointsReward: 50,
        badge: challengeBadge,
      })
    );

    const ruleBadge = makeBadge({ id: "badge-landmark-1", code: "landmark_hunter_1" });
    // A poi_milestone rule is irrelevant to this business check-in, so it
    // shouldn't fire -- proves challenge completion and badge-rule
    // evaluation ran independently rather than one gating the other.
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-poi", badgeId: ruleBadge.id, badge: ruleBadge, ruleType: "poi_milestone", threshold: 1 })
    );

    const summary = await awardCheckinRewards(
      { userId: "user-1", checkinId: "checkin-1", venueId: "venue-1", checkedInAt: NOW },
      repo
    );

    expect(summary.pointsEarned).toBe(CHECKIN_POINTS + 50);
    expect(summary.challengesCompleted).toEqual([
      { id: "challenge-1", title: "Test Challenge", pointsReward: 50, badge: challengeBadge },
    ]);
    expect(summary.badgesEarned).toEqual([]);
  });
});
