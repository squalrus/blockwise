import type { LocationKind } from "@blockwise/types";

// "poi" matches any POI-kind location; "any" matches a check-in anywhere in
// the neighborhood regardless of category or location kind.
export type ChallengeTargetKind = "poi" | "any";

// Shared by both business and POI check-ins/challenges since the venue/poi
// merge (BACKLOG.md "POIs and venues managed almost the same") -- categoryId
// is simply null for a poi-kind location. kind feeds evaluateChallengesAfterCheckin's
// match against "any POI" challenges (challenge.target_kind), alongside the
// existing category/venue-id matching.
export interface LocationContext {
  neighborhoodId: string;
  categoryId: string | null;
  kind: LocationKind;
}

export type PointEventType = "checkin" | "favorite" | "challenge_completion" | "neighbor_connection";

export interface AwardPointsInput {
  userId: string;
  // Absent for "neighbor_connection" -- a neighbor connection isn't scoped
  // to any neighborhood, unlike the other three event types (all derived
  // from a venue's neighborhood_id).
  neighborhoodId?: string;
  eventType: PointEventType;
  points: number;
  venueId?: string;
  checkinId?: string;
  challengeId?: string;
  // Set only for "neighbor_connection" -- the other party in the
  // connection, so the uniqueness guard (point_event_neighbor_connection_idx)
  // can key on (user, other user) rather than a specific user_connection row.
  neighborUserId?: string;
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
  // Set instead of categoryId/venueId for an any-POI or any-activity
  // challenge.
  targetKind: ChallengeTargetKind | null;
  targetCount: number;
  // When true, targetCount is a stale snapshot -- callers should resolve the
  // effective target via countActiveLocationsForKind instead of trusting it
  // directly (challenges.ts's effectiveTargetCount).
  targetCountLive: boolean;
  pointsReward: number;
  badge: BadgeRecord | null;
  startsAt: string;
  // Null means the challenge runs indefinitely (no scheduled end).
  endsAt: string | null;
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

// A challenge this user has completed, joined with the neighborhood it
// belongs to (BACKLOG.md Ref 47's account page Challenges tab), mirroring
// UserBadgeRecord above.
export interface CompletedChallengeRecord {
  id: string;
  title: string;
  description: string | null;
  neighborhoodId: string;
  neighborhoodName: string;
  pointsReward: number;
  badge: BadgeRecord | null;
  completedAt: string;
}

// Badge rule engine: badges earned by their own standalone rules, fully
// decoupled from challenges (no FK either direction, no shared evaluation
// code -- see badges.ts vs challenges.ts). Unlike challenges, rules are
// global (not neighborhood-scoped) and have no time window -- permanent
// profile-level achievements, matching how GET /me/badges already
// aggregates across every neighborhood.
export type BadgeRuleType =
  | "category_milestone"
  | "poi_milestone"
  | "daily_distinct_venues"
  | "same_venue_repeat_in_day"
  | "level_reached"
  // N accepted neighbor connections (BACKLOG.md Ref 14/33) -- unlike the
  // other rule types, evaluated after a connection is accepted, not after a
  // check-in (see evaluateBadgesForNeighborCount in badges.ts).
  | "neighbor_count_reached";

export interface BadgeRuleRecord {
  id: string;
  badgeId: string;
  badge: BadgeRecord;
  ruleType: BadgeRuleType;
  // Set only for "category_milestone".
  categoryId: string | null;
  // Unique-venue count / day-count / level number / revisit count, depending
  // on ruleType.
  threshold: number;
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
  // that targets this category, this specific location, or this location's
  // kind (any combination may be provided at once, since a single check-in
  // can satisfy a category challenge, a location-specific challenge, and an
  // any-POI challenge simultaneously).
  getActiveChallengesForTarget(input: {
    neighborhoodId: string;
    categoryId?: string;
    venueId?: string;
    locationKind?: LocationKind;
    now: string;
  }): Promise<ChallengeRecord[]>;

  listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]>;

  hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean>;

  // All-time count across every neighborhood (BACKLOG.md Ref 47's account
  // page profile summary), mirroring getUserPointsTotal above.
  countCompletedChallengesForUser(userId: string): Promise<number>;

  // Distinct venues (matching categoryId, within the neighborhood) this user
  // has checked into within [startsAt, endsAt] -- the progress metric for a
  // category challenge like "5 different coffee shops". A null endsAt (an
  // indefinite challenge) means no upper bound.
  countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number>;

  hasAnyCheckinForLocation(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<boolean>;

  // Distinct locations (within the neighborhood) this user has checked into
  // within [startsAt, endsAt] -- the progress metric for an any-POI or
  // any-activity challenge, mirroring countDistinctVenuesCheckedInForCategory.
  // Omitting kind (any-activity) counts check-ins to any location kind;
  // passing kind (any-POI) restricts to that kind only.
  countDistinctVenuesCheckedInForKind(input: {
    userId: string;
    kind?: LocationKind;
    neighborhoodId: string;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number>;

  // Currently-active (status='active') locations of this kind in the
  // neighborhood -- the live target for a targetCountLive completionist
  // challenge like "Visit every POI" (challenges.ts's effectiveTargetCount),
  // as opposed to countDistinctVenuesCheckedInForKind above, which counts
  // this *user's* progress, not the denominator.
  countActiveLocationsForKind(input: { neighborhoodId: string; kind: LocationKind }): Promise<number>;

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

  // Every challenge this user has completed, across every neighborhood
  // (BACKLOG.md Ref 47's account page Challenges tab), mirroring
  // getUserBadges above.
  getUserCompletedChallenges(userId: string): Promise<CompletedChallengeRecord[]>;

  // BACKLOG.md Ref 61: every badge that exists, so the account page can show
  // "locked" badges the user hasn't earned yet alongside earned ones.
  getAllBadges(): Promise<BadgeRecord[]>;

  // Every badge rule (badges.ts filters/evaluates these in application code
  // rather than pushing per-rule-type filtering into SQL -- the full rule
  // set is small enough, today's ~45 rows, to just load it every check-in).
  getAllBadgeRules(): Promise<BadgeRuleRecord[]>;

  hasEarnedBadge(userId: string, badgeId: string): Promise<boolean>;

  // Awards a badge from a rule match -- idempotent like completeChallenge,
  // returns false if already held. No challenge_id, no points: badge rules
  // carry no points_reward, unlike challenge completion.
  awardRuleBadge(userId: string, badgeId: string): Promise<boolean>;

  // Distinct locations (global, all-time -- not neighborhood- or
  // window-scoped like challenge progress) this user has checked into
  // matching the given filters. Pass categoryId for category_milestone;
  // pass kind for poi_milestone.
  countDistinctVenuesForBadge(input: {
    userId: string;
    categoryId?: string;
    kind?: LocationKind;
  }): Promise<number>;

  // Distinct locations this user checked into within [startsAt, endsAt] --
  // the progress metric for daily_distinct_venues (called with one
  // calendar day's bounds).
  countDistinctVenuesCheckedInBetween(input: {
    userId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number>;

  // Check-ins (not distinct venues) to this specific location within
  // [startsAt, endsAt] -- the progress metric for same_venue_repeat_in_day.
  countCheckinsForVenueBetween(input: {
    userId: string;
    venueId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<number>;
}
