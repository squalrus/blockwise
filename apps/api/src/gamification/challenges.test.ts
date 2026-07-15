import { describe, expect, it } from "vitest";
import { evaluateChallengesAfterCheckin, getUserActiveChallenges, listChallengesWithProgress } from "./challenges";
import { FakeGamificationRepository, makeBadge, makeChallenge } from "./testSupport";

const NOW = "2026-07-15T12:00:00.000Z";

function seedCoffeeVenues(repo: FakeGamificationRepository, count: number) {
  for (let i = 1; i <= count; i++) {
    repo.locations.set(`venue-${i}`, {
      neighborhoodId: "neighborhood-1",
      categoryId: "category-coffee",
      kind: "business",
    });
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
    repo.locations.set("poi-1", { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    repo.challenges.push(
      makeChallenge({ id: "challenge-poi", venueId: "poi-1", targetCount: 1, pointsReward: 20 })
    );

    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "poi-1" },
      repo
    );
    // A second check-in to the same POI (e.g. after the per-target cooldown
    // elapses) shouldn't re-award the challenge's bonus points.
    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "poi-1" },
      repo
    );

    const completionEvents = repo.pointEvents.filter((e) => e.eventType === "challenge_completion");
    expect(completionEvents).toHaveLength(1);
  });

  it("ignores challenges outside their active window", async () => {
    const repo = new FakeGamificationRepository();
    repo.locations.set("poi-1", { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-past",
        venueId: "poi-1",
        targetCount: 1,
        pointsReward: 20,
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-02-01T00:00:00.000Z",
      })
    );

    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "poi-1" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-past")).toBe(false);
  });

  it("completes an any-POI challenge after a single check-in to any POI-kind location", async () => {
    const repo = new FakeGamificationRepository();
    repo.locations.set("poi-1", { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    const badge = makeBadge({ id: "badge-explorer", code: "neighborhood_explorer" });
    repo.challenges.push(
      makeChallenge({ id: "challenge-any-poi", targetKind: "poi", targetCount: 1, pointsReward: 20, badge })
    );

    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "poi-1", locationKind: "poi" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-any-poi")).toBe(true);
    expect(repo.badges).toContainEqual({
      userId: "user-1",
      badgeId: "badge-explorer",
      challengeId: "challenge-any-poi",
    });
  });

  it("completes a visit-every-POI challenge only once every distinct POI is checked into", async () => {
    const repo = new FakeGamificationRepository();
    for (let i = 1; i <= 3; i++) {
      repo.locations.set(`poi-${i}`, { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    }
    repo.challenges.push(
      makeChallenge({ id: "challenge-all-pois", targetKind: "poi", targetCount: 3, pointsReward: 100 })
    );

    for (let i = 1; i <= 2; i++) {
      repo.checkins.push({ userId: "user-1", venueId: `poi-${i}`, checkedInAt: NOW });
      await evaluateChallengesAfterCheckin(
        { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: `poi-${i}`, locationKind: "poi" },
        repo
      );
    }
    expect(await repo.hasCompletedChallenge("user-1", "challenge-all-pois")).toBe(false);

    repo.checkins.push({ userId: "user-1", venueId: "poi-3", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "poi-3", locationKind: "poi" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-all-pois")).toBe(true);
  });

  it("completes an any-activity challenge from a check-in to a business, regardless of category", async () => {
    const repo = new FakeGamificationRepository();
    repo.locations.set("venue-1", { neighborhoodId: "neighborhood-1", categoryId: "category-coffee", kind: "business" });
    const badge = makeBadge({ id: "badge-welcome", code: "phinneywood_welcome" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-welcome",
        targetKind: "any",
        targetCount: 1,
        pointsReward: 10,
        badge,
        endsAt: null,
      })
    );

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      {
        userId: "user-1",
        neighborhoodId: "neighborhood-1",
        categoryId: "category-coffee",
        venueId: "venue-1",
        locationKind: "business",
      },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-welcome")).toBe(true);
    expect(repo.badges).toContainEqual({
      userId: "user-1",
      badgeId: "badge-welcome",
      challengeId: "challenge-welcome",
    });
  });

  it("an indefinite challenge (no ends_at) stays active far into the future", async () => {
    const repo = new FakeGamificationRepository();
    repo.locations.set("venue-1", { neighborhoodId: "neighborhood-1", categoryId: null, kind: "business" });
    repo.challenges.push(
      makeChallenge({ id: "challenge-welcome", targetKind: "any", targetCount: 1, endsAt: null })
    );

    const farFuture = "2030-01-01T00:00:00.000Z";
    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: farFuture });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-1", venueId: "venue-1", locationKind: "business" },
      repo
    );

    expect(await repo.hasCompletedChallenge("user-1", "challenge-welcome")).toBe(true);
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

  it("reports target_type any_poi and distinct-POI progress for an any-POI challenge", async () => {
    const repo = new FakeGamificationRepository();
    for (let i = 1; i <= 3; i++) {
      repo.locations.set(`poi-${i}`, { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    }
    repo.challenges.push(
      makeChallenge({ id: "challenge-all-pois", targetKind: "poi", targetCount: 3 })
    );
    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });

    const [progress] = await listChallengesWithProgress("neighborhood-1", "user-1", repo);
    expect(progress.target_type).toBe("any_poi");
    expect(progress.progress_count).toBe(1);
    expect(progress.poi_id).toBeNull();
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

  it("self-heals a challenge whose target was already met by a check-in that predates evaluation", async () => {
    // A check-in inserted without ever going through
    // evaluateChallengesAfterCheckin (e.g. it happened before this challenge
    // template existed) never gets a completion row -- without self-healing
    // here, progress_count would read 100% forever without ever actually
    // completing (no points, no badge).
    const repo = new FakeGamificationRepository();
    repo.locations.set("poi-1", { neighborhoodId: "neighborhood-1", categoryId: null, kind: "poi" });
    const badge = makeBadge({ id: "badge-explorer", code: "neighborhood_explorer" });
    repo.challenges.push(
      makeChallenge({ id: "challenge-any-poi", targetKind: "poi", targetCount: 1, pointsReward: 20, badge })
    );
    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });

    expect(await repo.hasCompletedChallenge("user-1", "challenge-any-poi")).toBe(false);

    const [progress] = await listChallengesWithProgress("neighborhood-1", "user-1", repo);
    expect(progress.progress_count).toBe(1);
    expect(progress.completed).toBe(true);
    expect(await repo.hasCompletedChallenge("user-1", "challenge-any-poi")).toBe(true);
    expect(repo.pointEvents).toContainEqual(
      expect.objectContaining({ userId: "user-1", eventType: "challenge_completion", points: 20 })
    );
    expect(repo.badges).toContainEqual({
      userId: "user-1",
      badgeId: "badge-explorer",
      challengeId: "challenge-any-poi",
    });
  });
});

describe("getUserActiveChallenges", () => {
  it("aggregates in-progress challenges across neighborhoods, excluding completed and untouched ones", async () => {
    const repo = new FakeGamificationRepository();
    seedCoffeeVenues(repo, 5);
    repo.locations.set("poi-1", { neighborhoodId: "neighborhood-2", categoryId: null, kind: "poi" });
    repo.challenges.push(
      makeChallenge({
        id: "challenge-coffee",
        neighborhoodId: "neighborhood-1",
        categoryId: "category-coffee",
        categoryName: "Coffee Shop",
        targetCount: 5,
      }),
      makeChallenge({
        id: "challenge-poi",
        neighborhoodId: "neighborhood-2",
        venueId: "poi-1",
        targetCount: 1,
      }),
      // Active in neighborhood-1 alongside challenge-coffee, but the user
      // hasn't checked in to any bakery -- should not appear as
      // "in progress" just because it exists.
      makeChallenge({
        id: "challenge-untouched",
        neighborhoodId: "neighborhood-1",
        categoryId: "category-bakery",
        categoryName: "Bakery",
        targetCount: 3,
      })
    );
    // Two of five coffee-shop check-ins: in progress, not completed.
    repo.checkins.push(
      { userId: "user-1", venueId: "venue-1", checkedInAt: NOW },
      { userId: "user-1", venueId: "venue-2", checkedInAt: NOW }
    );
    // Checked into the single-POI challenge's target: this one's completed.
    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOW });
    await evaluateChallengesAfterCheckin(
      { userId: "user-1", neighborhoodId: "neighborhood-2", venueId: "poi-1", locationKind: "poi" },
      repo
    );

    const active = await getUserActiveChallenges(
      "user-1",
      [
        { neighborhoodId: "neighborhood-1", name: "Neighborhood One" },
        { neighborhoodId: "neighborhood-2", name: "Neighborhood Two" },
      ],
      repo
    );

    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      id: "challenge-coffee",
      neighborhood_name: "Neighborhood One",
      progress_count: 2,
      target_count: 5,
      completed: false,
    });
  });

  it("orders active challenges by percent complete, most progress first", async () => {
    const repo = new FakeGamificationRepository();
    for (let i = 1; i <= 3; i++) {
      repo.locations.set(`poi-${i}`, { neighborhoodId: "neighborhood-2", categoryId: null, kind: "poi" });
    }
    seedCoffeeVenues(repo, 5);
    repo.challenges.push(
      // 2 of 5 = 40%.
      makeChallenge({
        id: "challenge-coffee",
        neighborhoodId: "neighborhood-1",
        categoryId: "category-coffee",
        categoryName: "Coffee Shop",
        targetCount: 5,
      }),
      // 1 of 3 = 33%.
      makeChallenge({
        id: "challenge-all-pois",
        neighborhoodId: "neighborhood-2",
        targetKind: "poi",
        targetCount: 3,
      })
    );
    repo.checkins.push(
      { userId: "user-1", venueId: "venue-1", checkedInAt: NOW },
      { userId: "user-1", venueId: "venue-2", checkedInAt: NOW },
      { userId: "user-1", venueId: "poi-1", checkedInAt: NOW }
    );

    const active = await getUserActiveChallenges(
      "user-1",
      [
        { neighborhoodId: "neighborhood-1", name: "Neighborhood One" },
        { neighborhoodId: "neighborhood-2", name: "Neighborhood Two" },
      ],
      repo
    );

    expect(active.map((c) => c.id)).toEqual(["challenge-coffee", "challenge-all-pois"]);
  });
});
