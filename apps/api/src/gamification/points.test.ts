import { describe, expect, it } from "vitest";
import { FAVORITE_POINTS, awardFavoritePoints, getLeaderboard } from "./points";
import { FakeGamificationRepository } from "./testSupport";

describe("awardFavoritePoints", () => {
  it("awards points the first time a venue is favorited", async () => {
    const repo = new FakeGamificationRepository();
    repo.venues.set("venue-1", { neighborhoodId: "neighborhood-1", categoryId: null });

    await awardFavoritePoints({ userId: "user-1", venueId: "venue-1" }, repo);

    expect(repo.pointEvents).toHaveLength(1);
    expect(repo.pointEvents[0]).toMatchObject({
      userId: "user-1",
      eventType: "favorite",
      points: FAVORITE_POINTS,
    });
  });

  it("does not award points again on a second favorite of the same venue", async () => {
    const repo = new FakeGamificationRepository();
    repo.venues.set("venue-1", { neighborhoodId: "neighborhood-1", categoryId: null });

    await awardFavoritePoints({ userId: "user-1", venueId: "venue-1" }, repo);
    await awardFavoritePoints({ userId: "user-1", venueId: "venue-1" }, repo);

    expect(repo.pointEvents).toHaveLength(1);
  });

  it("does nothing for an unknown venue", async () => {
    const repo = new FakeGamificationRepository();
    await awardFavoritePoints({ userId: "user-1", venueId: "missing" }, repo);
    expect(repo.pointEvents).toHaveLength(0);
  });
});

describe("getLeaderboard", () => {
  it("ranks public users by total points within the neighborhood, descending", async () => {
    const repo = new FakeGamificationRepository();
    repo.users.set("user-1", {
      displayName: "Alex",
      username: "alex",
      avatarUrl: null,
      visibility: "public",
    });
    repo.users.set("user-2", {
      displayName: "Sam",
      username: "sam",
      avatarUrl: null,
      visibility: "public",
    });
    repo.users.set("user-3", {
      displayName: "Private Pat",
      username: "pat",
      avatarUrl: null,
      visibility: "private",
    });

    repo.pointEvents.push(
      { id: "e1", userId: "user-1", neighborhoodId: "neighborhood-1", eventType: "checkin", points: 10 },
      { id: "e2", userId: "user-2", neighborhoodId: "neighborhood-1", eventType: "checkin", points: 30 },
      { id: "e3", userId: "user-1", neighborhoodId: "neighborhood-1", eventType: "favorite", points: 5 },
      { id: "e4", userId: "user-3", neighborhoodId: "neighborhood-1", eventType: "checkin", points: 100 }
    );

    const leaderboard = await getLeaderboard("neighborhood-1", repo);

    expect(leaderboard).toEqual([
      { user_id: "user-2", display_name: "Sam", username: "sam", avatar_url: null, points: 30, rank: 1 },
      { user_id: "user-1", display_name: "Alex", username: "alex", avatar_url: null, points: 15, rank: 2 },
    ]);
  });
});
