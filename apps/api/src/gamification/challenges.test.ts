import { describe, expect, it } from "vitest";
import { evaluateChallengesAfterCheckin, listChallengesWithProgress } from "./challenges";
import { FakeGamificationRepository, makeBadge, makeChallenge } from "./testSupport";

const NOW = "2026-07-15T12:00:00.000Z";

function seedCoffeeVenues(repo: FakeGamificationRepository, count: number) {
  for (let i = 1; i <= count; i++) {
    repo.venues.set(`venue-${i}`, { neighborhoodId: "neighborhood-1", categoryId: "category-coffee" });
  }
}

describe("evaluateChallengesAfterCheckin", () => {
  it("completes a category challenge once the distinct-venue target is reached", async () => {
    const repo = new FakeGamificationRepository();
    seedCoffeeVenues(repo, 5);
    const badge = makeBadge({ id: "badge-coffee", code: "coffee_crawler" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-coffee",
        categoryId: "category-coffee",
        categoryName: "Coffee Shop",
        targetCount: 5,
        pointsReward: 50,
        badge,
      })
    );

    for (let i = 1; i <= 4; i++) {
      repo.checkins.push({ userId: "user-1", venueId: `venue-${i}`, checkedInAt: NOW });
      await evaluateChallengesAfterCheckin(
        { userId: "user-1", neighborhoodId: "neighborhood-1", categoryId: "category-coffee" },
        repo
      );
    }
    expect(await repo.hasCompletedChallenge("user-1", "challenge-coffee")).toBe(false);

    repo.checkins.push({ userId: "user-1", venueId: "venue-5", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", categoryId: "category-coffee" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-coffee")).toBe(true);
    expect(repo.pointEvents).toContainEqual(
      expect.objectContaining({ userId: "user-1", eventType: "challenge_completion", points: 50 })
    );
    expect(repo.badges).toContainEqual({ userId: "user-1", badgeId: "badge-coffee", challengeId: "challenge-coffee" });
  });

  it("does not award completion twice for the same user", async () => {
    const repo = new FakeGamificationRepository();
    repo.pois.set("poi-1", { neighborhoodId: "neighborhood-1" });
    repo.challenges.push(
      makeChallenge({ id: "challenge-poi", poiId: "poi-1", targetCount: 1, pointsReward: 20 })
    );

    repo.checkins.push({ userId: "user-1", poiId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", poiId: "poi-1" },
      repo
    );
    // A second check-in to the same POI (e.g. after the per-target cooldown
    // elapses) shouldn't re-award the challenge's bonus points.
    repo.checkins.push({ userId: "user-1", poiId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", poiId: "poi-1" },
      repo
    );

    const completionEvents = repo.pointEvents.filter((e) => e.eventType === "challenge_completion");
    expect(completionEvents).toHaveLength(1);
  });

  it("ignores challenges outside their active window", async () => {
    const repo = new FakeGamificationRepository();
    repo.pois.set("poi-1", { neighborhoodId: "neighborhood-1" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-past",
        poiId: "poi-1",
        targetCount: 1,
        pointsReward: 20,
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-02-01T00:00:00.000Z",
      })
    );

    repo.checkins.push({ userId: "user-1", poiId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", poiId: "poi-1" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-past")).toBe(false);
  });
});

describe("listChallengesWithProgress", () => {
  it("reports zeroed progress for an anonymous (no user id) request", async () => {
    const repo = new FakeGamificationRepository();
    repo.challenges.push(makeChallenge({ id: "challenge-1" }));

    const [progress] = await listChallengesWithProgress("neighborhood-1", null, repo);
    expect(progress.progress_count).toBe(0);
    expect(progress.completed).toBe(false);
  });

  it("reports live progress for a signed-in user", async () => {
    const repo = new FakeGamificationRepository();
    seedCoffeeVenues(repo, 5);
    repo.challenges.push(
      makeChallenge({
        id: "challenge-coffee",
        categoryId: "category-coffee",
        categoryName: "Coffee Shop",
        targetCount: 5,
      })
    );
    repo.checkins.push(
      { userId: "user-1", venueId: "venue-1", checkedInAt: NOW },
      { userId: "user-1", venueId: "venue-2", checkedInAt: NOW }
    );

    const [progress] = await listChallengesWithProgress("neighborhood-1", "user-1", repo);
    expect(progress.progress_count).toBe(2);
    expect(progress.target_count).toBe(5);
    expect(progress.completed).toBe(false);
  });

  it("excludes challenges that have already ended", async () => {
    const repo = new FakeGamificationRepository();
    repo.challenges.push(
      makeChallenge({
        id: "challenge-ended",
        endsAt: "2020-01-01T00:00:00.000Z",
      })
    );

    const results = await listChallengesWithProgress("neighborhood-1", null, repo);
    expect(results).toHaveLength(0);
  });
});
