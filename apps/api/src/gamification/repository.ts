export interface VenueContext {
  neighborhoodId: string;
  categoryId: string | null;
}

export interface PoiContext {
  neighborhoodId: string;
}

export type PointEventType = "checkin" | "favorite" | "challenge_completion";

export interface AwardPointsInput {
  userId: string;
  neighborhoodId: string;
  eventType: PointEventType;
  points: number;
  venueId?: string;
  poiId?: string;
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
  poiId: string | null;
  poiName: string | null;
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
  getVenueContext(venueId: string): Promise<VenueContext | null>;
  getPoiContext(poiId: string): Promise<PoiContext | null>;

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
  // that targets this category or this POI (whichever is provided).
  getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    poiId?: string;
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

  hasAnyCheckinForPoi(input: {
    userId: string;
    poiId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<boolean>;

  // Marks the challenge complete (idempotent -- returns false if already
  // completed), awards the bonus points, and awards the badge if any.
  completeChallenge(input: CompleteChallengeInput): Promise<boolean>;

  getLeaderboard(neighborhoodId: string, limit: number): Promise<LeaderboardRow[]>;
}
