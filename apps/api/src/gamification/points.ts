import type { LeaderboardEntry, UserBadge, UserPointsSummary } from "@blockwise/types";
import type { GamificationRepository } from "./repository";

// BACKLOG.md Ref 6: check-in = 10pts, first-time favorite/follow = 5pts.
export const CHECKIN_POINTS = 10;
export const FAVORITE_POINTS = 5;

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
  return { points };
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
