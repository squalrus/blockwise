import { describe, expect, it } from "vitest";
import { evaluateBadgesAfterCheckin } from "./badges";
import { FakeGamificationRepository, makeBadge, makeBadgeRule } from "./testSupport";

const NOON_JULY_15 = "2026-07-15T12:00:00.000Z";

describe("evaluateBadgesAfterCheckin", () => {
  it("awards a category_milestone badge once the distinct-venue threshold is reached", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-coffee-5", code: "coffee_explorer_5" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-1", badgeId: badge.id, badge, ruleType: "category_milestone", categoryId: "cat-coffee", threshold: 5 })
    );
    for (let i = 1; i <= 4; i++) {
      repo.locations.set(`venue-${i}`, { neighborhoodId: "n1", categoryId: "cat-coffee", kind: "business" });
    }

    for (let i = 1; i <= 4; i++) {
      repo.checkins.push({ userId: "user-1", venueId: `venue-${i}`, checkedInAt: NOON_JULY_15 });
      const awarded = await evaluateBadgesAfterCheckin(
        { userId: "user-1", venueId: `venue-${i}`, categoryId: "cat-coffee", kind: "business", checkedInAt: NOON_JULY_15 },
        repo
      );
      expect(awarded).toHaveLength(0);
    }

    repo.locations.set("venue-5", { neighborhoodId: "n1", categoryId: "cat-coffee", kind: "business" });
    repo.checkins.push({ userId: "user-1", venueId: "venue-5", checkedInAt: NOON_JULY_15 });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-5", categoryId: "cat-coffee", kind: "business", checkedInAt: NOON_JULY_15 },
      repo
    );

    expect(awarded.map((b) => b.id)).toEqual(["badge-coffee-5"]);
    expect(await repo.hasEarnedBadge("user-1", "badge-coffee-5")).toBe(true);
  });

  it("does not evaluate a category_milestone rule for an unrelated category", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-bar-1", code: "bar_explorer_1" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-bar", badgeId: badge.id, badge, ruleType: "category_milestone", categoryId: "cat-bar", threshold: 1 })
    );
    repo.locations.set("venue-coffee", { neighborhoodId: "n1", categoryId: "cat-coffee", kind: "business" });

    repo.checkins.push({ userId: "user-1", venueId: "venue-coffee", checkedInAt: NOON_JULY_15 });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-coffee", categoryId: "cat-coffee", kind: "business", checkedInAt: NOON_JULY_15 },
      repo
    );

    expect(awarded).toHaveLength(0);
    expect(await repo.hasEarnedBadge("user-1", "badge-bar-1")).toBe(false);
  });

  it("awards a poi_milestone badge from distinct POIs regardless of free-text type", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-landmark-1", code: "landmark_hunter_1" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-poi", badgeId: badge.id, badge, ruleType: "poi_milestone", threshold: 1 })
    );
    repo.locations.set("poi-1", { neighborhoodId: "n1", categoryId: null, kind: "poi" });

    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOON_JULY_15 });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "poi-1", kind: "poi", checkedInAt: NOON_JULY_15 },
      repo
    );

    expect(awarded.map((b) => b.id)).toEqual(["badge-landmark-1"]);
  });

  it("does not evaluate a poi_milestone rule from a business check-in", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-landmark-1", code: "landmark_hunter_1" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-poi", badgeId: badge.id, badge, ruleType: "poi_milestone", threshold: 1 })
    );
    repo.locations.set("venue-1", { neighborhoodId: "n1", categoryId: "cat-coffee", kind: "business" });

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: NOON_JULY_15 });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-1", categoryId: "cat-coffee", kind: "business", checkedInAt: NOON_JULY_15 },
      repo
    );

    expect(awarded).toHaveLength(0);
  });

  it("awards a daily_distinct_venues badge once enough different places are checked into on the same day", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-day-3", code: "day_tripper_3" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-day", badgeId: badge.id, badge, ruleType: "daily_distinct_venues", threshold: 3 })
    );
    for (let i = 1; i <= 3; i++) {
      repo.locations.set(`venue-${i}`, { neighborhoodId: "n1", categoryId: null, kind: "business" });
    }

    repo.checkins.push(
      { userId: "user-1", venueId: "venue-1", checkedInAt: "2026-07-15T08:00:00.000Z" },
      { userId: "user-1", venueId: "venue-2", checkedInAt: "2026-07-15T10:00:00.000Z" }
    );
    const notYet = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-2", kind: "business", checkedInAt: "2026-07-15T10:00:00.000Z" },
      repo
    );
    expect(notYet).toHaveLength(0);

    repo.checkins.push({ userId: "user-1", venueId: "venue-3", checkedInAt: "2026-07-15T22:00:00.000Z" });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-3", kind: "business", checkedInAt: "2026-07-15T22:00:00.000Z" },
      repo
    );

    expect(awarded.map((b) => b.id)).toEqual(["badge-day-3"]);
  });

  it("does not count a check-in from a different day toward daily_distinct_venues", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-day-2", code: "day_tripper_2" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-day", badgeId: badge.id, badge, ruleType: "daily_distinct_venues", threshold: 2 })
    );
    repo.locations.set("venue-1", { neighborhoodId: "n1", categoryId: null, kind: "business" });
    repo.locations.set("venue-2", { neighborhoodId: "n1", categoryId: null, kind: "business" });

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: "2026-07-14T23:00:00.000Z" });
    repo.checkins.push({ userId: "user-1", venueId: "venue-2", checkedInAt: "2026-07-15T01:00:00.000Z" });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-2", kind: "business", checkedInAt: "2026-07-15T01:00:00.000Z" },
      repo
    );

    expect(awarded).toHaveLength(0);
  });

  it("awards same_venue_repeat_in_day on the second check-in to the same place in one day", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-seconds", code: "back_for_seconds" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-seconds", badgeId: badge.id, badge, ruleType: "same_venue_repeat_in_day", threshold: 2 })
    );
    repo.locations.set("venue-1", { neighborhoodId: "n1", categoryId: null, kind: "business" });

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: "2026-07-15T08:00:00.000Z" });
    const first = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-1", kind: "business", checkedInAt: "2026-07-15T08:00:00.000Z" },
      repo
    );
    expect(first).toHaveLength(0);

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: "2026-07-15T18:00:00.000Z" });
    const second = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-1", kind: "business", checkedInAt: "2026-07-15T18:00:00.000Z" },
      repo
    );

    expect(second.map((b) => b.id)).toEqual(["badge-seconds"]);
  });

  it("awards a level_reached badge once the user's all-time points cross the level threshold", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-level-2", code: "level_2" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-level-2", badgeId: badge.id, badge, ruleType: "level_reached", threshold: 2 })
    );
    repo.locations.set("venue-1", { neighborhoodId: "n1", categoryId: null, kind: "business" });
    // POINTS_PER_LEVEL is 50 -- 60 points puts the user at level 2.
    repo.pointEvents.push({
      id: "p1",
      userId: "user-1",
      neighborhoodId: "n1",
      eventType: "checkin",
      points: 60,
    });

    repo.checkins.push({ userId: "user-1", venueId: "venue-1", checkedInAt: NOON_JULY_15 });
    const awarded = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "venue-1", kind: "business", checkedInAt: NOON_JULY_15 },
      repo
    );

    expect(awarded.map((b) => b.id)).toEqual(["badge-level-2"]);
  });

  it("never re-awards an already-earned badge", async () => {
    const repo = new FakeGamificationRepository();
    const badge = makeBadge({ id: "badge-poi-1", code: "landmark_hunter_1" });
    repo.badgeRules.push(
      makeBadgeRule({ id: "rule-poi", badgeId: badge.id, badge, ruleType: "poi_milestone", threshold: 1 })
    );
    repo.locations.set("poi-1", { neighborhoodId: "n1", categoryId: null, kind: "poi" });
    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOON_JULY_15 });

    const first = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "poi-1", kind: "poi", checkedInAt: NOON_JULY_15 },
      repo
    );
    expect(first).toHaveLength(1);

    repo.checkins.push({ userId: "user-1", venueId: "poi-1", checkedInAt: NOON_JULY_15 });
    const second = await evaluateBadgesAfterCheckin(
      { userId: "user-1", venueId: "poi-1", kind: "poi", checkedInAt: NOON_JULY_15 },
      repo
    );
    expect(second).toHaveLength(0);
  });
});
