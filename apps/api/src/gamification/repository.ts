// Shared by both business and POI check-ins/challenges since the venue/poi
// merge (BACKLOG.md "POIs and venues managed almost the same") -- categoryId
// is simply null for a poi-kind location.
export interface LocationContext {
  neighborhoodId: string;
  categoryId: string | null;
}

export type PointEventType = "checkin" | "favorite" | "challenge_completion";

export interface AwardPointsInput {
  userId: string;
  neighborhoodId: string;
  eventType: PointEventType;
  points: number;
  venueId?: string;
  checkinId?: string;
  challengeId?: string;
}

export interface BadgeRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export interface ChallengeRecord {
  id: string;
  neighborhoodId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  // Named venueId/venueName internally (challenge.venue_id post-merge) --
  // the public Challenge/ChallengeProgress DTOs keep poi_id/poi_name for API
  // stability, mapped in challenges.ts's toChallengeProgress.
  venueId: string | null;
  venueName: string | null;
  targetCount: number;
  pointsReward: number;
  badge: BadgeRecord | null;
  startsAt: string;
  endsAt: string;
}

export interface CompleteChallengeInput {
  userId: string;
  challengeId: string;
  neighborhoodId: string;
  pointsReward: number;
  badgeId: string | null;
}

export interface UserBadgeRecord {
  badge: BadgeRecord;
  challengeId: string | null;
  awardedAt: string;
}

export interface LeaderboardRow {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  points: number;
}

// Abstracts persistence for points/badges/challenges (BACKLOG.md Ref 6) so
// the award/completion logic (points.ts, challenges.ts) can be tested
// against an in-memory fake, mirroring checkins/repository.ts.
export interface GamificationRepository {
  getLocationContext(locationId: string): Promise<LocationContext | null>;

  // Read-only lookup (no lazy creation, unlike checkins/favorites'
  // getOrCreateAnonymousUser) -- a device that's never checked in or
  // favorited anything has no app_user row yet, so there's simply no
  // progress to report for it.
  getUserIdForDevice(anonymousDeviceId: string): Promise<string | null>;

  // Returns true if a new point_event row was inserted, false if a
  // uniqueness guard (one per checkin; first-time-only per favorited venue)
  // means the points were already awarded.
  awardPoints(input: AwardPointsInput): Promise<boolean>;

  // Every challenge in this neighborhood whose window contains `now` and
  // that targets this category or this specific location (whichever is
  // provided -- either or both may be, since a check-in against a
  // categorized business can satisfy a category challenge, a
  // location-specific challenge, or both).
  getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    venueId?: string;
    now: string;
  }): Promise<ChallengeRecord[]>;

  listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]>;

  hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean>;

  // Distinct venues (matching categoryId, within the neighborhood) this user
  // has checked into within [startsAt, endsAt] -- the progress metric for a
  // category challenge like "5 different coffee shops".
  countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number>;

  hasAnyCheckinForLocation(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<boolean>;

  // Marks the challenge complete (idempotent -- returns false if already
  // completed), awards the bonus points, and awards the badge if any.
  completeChallenge(input: CompleteChallengeInput): Promise<boolean>;

  // Awards a badge outside of challenge completion (BACKLOG.md Ref 50's
  // founder badge) -- idempotent (a repeat call for a badge the user already
  // holds is a no-op) and a no-op if no badge with this code exists.
  awardBadgeByCode(userId: string, code: string): Promise<void>;

  getLeaderboard(neighborhoodId: string, limit: number): Promise<LeaderboardRow[]>;

  // All-time total across every neighborhood (BACKLOG.md Ref 47's account
  // page profile summary), unlike getLeaderboard which is neighborhood-scoped.
  getUserPointsTotal(userId: string): Promise<number>;

  // Every badge this user has ever earned, across every neighborhood
  // (BACKLOG.md Ref 55's profile/account badge display) -- unlike
  // listChallengesForNeighborhood, this isn't scoped to one neighborhood's
  // challenge templates, and includes non-challenge awards (e.g. founder).
  getUserBadges(userId: string): Promise<UserBadgeRecord[]>;
}
