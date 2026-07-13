import type { LeaderboardEntry, UserBadge, UserPointsSummary } from "@blockwise/types";
import type { GamificationRepository } from "./repository";

// BACKLOG.md Ref 6: check-in = 10pts, first-time favorite/follow = 5pts.
export const CHECKIN_POINTS = 10;
export const FAVORITE_POINTS = 5;
// BACKLOG.md Ref 14/33: 5pts to each side of a newly-accepted neighbor
// connection, first-time-only per (user, other user) pair -- mirrors
// FAVORITE_POINTS.
export const NEIGHBOR_CONNECTION_POINTS = 5;

// Levelling was originally client-only (apps/web's ProfileSummaryCard) --
// moved here so the badge rule engine's "level_reached" rule (badges.ts) and
// the account page compute the same level from the same total, rather than
// duplicating the formula on both sides of the API boundary.
export const POINTS_PER_LEVEL = 50;

export function computeLevel(points: number): {
  level: number;
  pointsIntoLevel: number;
  pointsToNextLevel: number;
} {
  const pointsIntoLevel = points % POINTS_PER_LEVEL;
  return {
    level: Math.floor(points / POINTS_PER_LEVEL) + 1,
    pointsIntoLevel,
    pointsToNextLevel: POINTS_PER_LEVEL - pointsIntoLevel,
  };
}

export async function awardFavoritePoints(
  input: { userId: string; venueId: string },
  repository: GamificationRepository
): Promise<void> {
  const context = await repository.getLocationContext(input.venueId);
  if (!context) return;

  await repository.awardPoints({
    userId: input.userId,
    neighborhoodId: context.neighborhoodId,
    eventType: "favorite",
    points: FAVORITE_POINTS,
    venueId: input.venueId,
  });
}

export async function getLeaderboard(
  neighborhoodId: string,
  repository: GamificationRepository,
  limit = 20
): Promise<LeaderboardEntry[]> {
  const rows = await repository.getLeaderboard(neighborhoodId, limit);
  return rows.map((row, index) => ({
    user_id: row.userId,
    display_name: row.displayName,
    username: row.username,
    avatar_url: row.avatarUrl,
    points: row.points,
    rank: index + 1,
  }));
}

export async function getUserPoints(
  userId: string,
  repository: GamificationRepository
): Promise<UserPointsSummary> {
  const points = await repository.getUserPointsTotal(userId);
  const { level, pointsIntoLevel, pointsToNextLevel } = computeLevel(points);
  return {
    points,
    level,
    points_into_level: pointsIntoLevel,
    points_to_next_level: pointsToNextLevel,
  };
}

// BACKLOG.md Ref 55: every badge a user has earned, across every
// neighborhood, for the public profile and account pages.
export async function getUserBadges(
  userId: string,
  repository: GamificationRepository
): Promise<UserBadge[]> {
  const records = await repository.getUserBadges(userId);
  return records.map((record) => ({
    badge: {
      id: record.badge.id,
      code: record.badge.code,
      name: record.badge.name,
      description: record.badge.description,
      icon: record.badge.icon,
    },
    awarded_at: record.awardedAt,
  }));
}
