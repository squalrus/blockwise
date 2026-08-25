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
  // null = app-wide; set = this badge belongs to (and is only earnable
  // within) that one neighborhood, e.g. a category_milestone "Explorer"
  // badge re-homed off the global default (BACKLOG.md Ref 108 follow-up --
  // "N distinct coffee shops" is meant to be about *this neighborhood's*
  // coffee shops, not a lifetime cross-neighborhood tally). Distinct from a
  // challenge's own neighborhood_id: a badge earned via a neighborhood-
  // scoped *challenge* (challenge.badge_id) can still have neighborhoodId
  // null here -- this field is only set when the badge itself, independent
  // of any challenge, is neighborhood-owned (today: badge_rule-driven
  // badges only).
  neighborhoodId: string | null;
}

// badge.code hitting the table's unique constraint (BACKLOG.md Ref 108's
// super-admin Badges view) -- mirrors SlugTakenError (neighborhoods/
// repository.ts) for the same "translate a DB uniqueness violation into a
// typed error the route can catch" pattern.
export class BadgeCodeTakenError extends Error {
  constructor(code: string) {
    super(`Badge code "${code}" is already taken`);
    this.name = "BadgeCodeTakenError";
  }
}

export interface ChallengeRecord {
  id: string;
  // null means app-wide (BACKLOG.md Ref 108) -- see the challenge_scope_check
  // migration for the corresponding schema change.
  neighborhoodId: string | null;
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
  // null for an app-wide challenge -- point_event.neighborhood_id is already
  // nullable (dropped not null for neighbor_connection events), so this
  // just writes a null neighborhood_id, same mechanism.
  neighborhoodId: string | null;
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
  // Both null for a completed app-wide challenge (BACKLOG.md Ref 108).
  neighborhoodId: string | null;
  neighborhoodName: string | null;
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
  | "neighbor_count_reached"
  // N total mushroom_collection rows, venue + connection + neighborhood
  // combined (BACKLOG.md Ref 98/101) -- evaluated after any kind of
  // collection event, not after a check-in specifically (see
  // evaluateBadgesForCollectionCount in badges.ts).
  | "collection_milestone"
  // Ranked #1 by 60-day check-in count ("Top Caps", checkins/checkin.ts's
  // rankRecentVisitors/RECENT_VISITOR_WINDOW_MS) at a business, at a POI, or
  // across an entire neighborhood -- three separate rule types (rather than
  // one generic "rank_reached" plus a kind/scope column) mirroring how
  // category_milestone/poi_milestone are already split rather than unified.
  // threshold is always 1 for these (isTopVisitorForVenue/
  // isTopVisitorForNeighborhood are boolean, not a count to compare against a
  // configurable N), kept only for schema consistency with every other rule.
  | "business_rank_reached"
  | "poi_rank_reached"
  | "neighborhood_rank_reached";

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

  // Every neighborhood-scoped challenge for this neighborhood, plus every
  // app-wide challenge (BACKLOG.md Ref 108) -- merged into one list since
  // both apply here.
  listChallengesForNeighborhood(neighborhoodId: string, now: string): Promise<ChallengeRecord[]>;

  // Every challenge that exists (any scope, any time window), for the super
  // admin Challenges tab's list view (BACKLOG.md Ref 108).
  listAllChallengesForAdmin(): Promise<ChallengeRecord[]>;

  // This neighborhood's own challenges only (no app-wide merge, no time
  // window filter) -- the neighborhood-admin Challenges tab's list view
  // (BACKLOG.md Ref 108), which manages just this neighborhood's rows, not
  // the app-wide ones that also happen to apply here.
  listChallengesForNeighborhoodAdmin(neighborhoodId: string): Promise<ChallengeRecord[]>;

  createChallenge(input: {
    neighborhoodId: string | null;
    title: string;
    description: string | null;
    categoryId: string | null;
    targetKind: ChallengeTargetKind | null;
    targetCount: number;
    // True for a "completionist" challenge (e.g. "Visit every POI") whose
    // real target tracks the neighborhood's current active-POI count rather
    // than a fixed number -- only meaningful when targetKind is "poi" (see
    // challenges.ts's effectiveTargetCount, which is what actually resolves
    // it; targetCount here is stored anyway as a fallback/last-known value
    // but never trusted directly once this is true).
    targetCountLive: boolean;
    pointsReward: number;
    badgeId: string | null;
    startsAt: string;
    endsAt: string | null;
  }): Promise<ChallengeRecord>;

  // Deliberately narrow -- only the fields safe to change after creation
  // without re-deriving progress (BACKLOG.md Ref 108's minimal admin UI).
  // Scope (neighborhood_id) and target composition (category_id/venue_id/
  // target_kind) are create-only. Returns null if no challenge with this id
  // exists.
  // options.neighborhoodId, when passed, scopes the update to a challenge
  // owned by that neighborhood (neighborhood-admin Challenges tab, BACKLOG.md
  // Ref 108) -- a challengeId that exists but belongs to a different
  // neighborhood (or is app-wide) is treated the same as not found, so one
  // neighborhood's admin can't edit another's rows or an app-wide one.
  // Omitted entirely for the super-admin route, which can edit anything.
  updateChallenge(
    id: string,
    patch: {
      title?: string;
      description?: string | null;
      // categoryId/targetKind are re-targeting fields -- callers (the
      // challengeAdmin.ts domain layer) always send both together (one null,
      // one set) when either changes, so exactly-one-of-category/kind
      // (challenge_target_check) holds by construction rather than needing
      // to be re-derived here against the row's current value.
      categoryId?: string | null;
      targetKind?: ChallengeTargetKind | null;
      targetCount?: number;
      targetCountLive?: boolean;
      pointsReward?: number;
      badgeId?: string | null;
      endsAt?: string | null;
    },
    options?: { neighborhoodId?: string }
  ): Promise<ChallengeRecord | null>;

  hasCompletedChallenge(userId: string, challengeId: string): Promise<boolean>;

  // All-time count across every neighborhood (BACKLOG.md Ref 47's account
  // page profile summary), mirroring getUserPointsTotal above.
  countCompletedChallengesForUser(userId: string): Promise<number>;

  // Which of these challenge ids have at least one completion, by anyone
  // (BACKLOG.md Ref 108 follow-up: a neighborhood admin can't edit a
  // challenge or its badge once someone has already completed it -- that
  // would retroactively change what they earned -- while a super admin can
  // always edit). Batched rather than per-challenge so listing challenges
  // doesn't do N+1 queries just to compute this flag.
  completedChallengeIds(challengeIds: string[]): Promise<Set<string>>;

  // Distinct venues (matching categoryId, within the neighborhood) this user
  // has checked into within [startsAt, endsAt] -- the progress metric for a
  // category challenge like "5 different coffee shops". A null endsAt (an
  // indefinite challenge) means no upper bound.
  // neighborhoodId is null for an app-wide category challenge (BACKLOG.md
  // Ref 108) -- progress is then counted across every neighborhood the user
  // has checked into, not just one.
  countDistinctVenuesCheckedInForCategory(input: {
    userId: string;
    categoryId: string;
    neighborhoodId: string | null;
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
  // neighborhoodId is null for an app-wide any-POI/any-activity challenge
  // (BACKLOG.md Ref 108), same "count everywhere" meaning as above.
  countDistinctVenuesCheckedInForKind(input: {
    userId: string;
    kind?: LocationKind;
    neighborhoodId: string | null;
    startsAt: string;
    endsAt: string | null;
  }): Promise<number>;

  // Currently-active (status='active') locations of this kind in the
  // neighborhood -- the live target for a targetCountLive completionist
  // challenge like "Visit every POI" (challenges.ts's effectiveTargetCount),
  // as opposed to countDistinctVenuesCheckedInForKind above, which counts
  // this *user's* progress, not the denominator.
  // neighborhoodId is null for an app-wide completionist challenge
  // (BACKLOG.md Ref 108) -- the denominator is then every active location of
  // this kind across every neighborhood.
  countActiveLocationsForKind(input: { neighborhoodId: string | null; kind: LocationKind }): Promise<number>;

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

  // Super admin Badges view (BACKLOG.md Ref 108) -- a plain badge row with no
  // rule attached, meant to be picked as a challenge's badge_id afterward
  // (or later wired to a badge_rule directly in the DB; the rule engine's ~9
  // rule types aren't authorable through this admin UI). Throws
  // BadgeCodeTakenError on a code collision.
  createBadge(input: {
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    neighborhoodId: string | null;
  }): Promise<BadgeRecord>;

  // Deliberately excludes code and neighborhoodId -- code is referenced by
  // exact string in awardBadgeByCode call sites (founderBadge.ts etc.), so
  // renaming it out from under those would silently break a one-off award;
  // scope is create-only, mirroring updateChallenge. options.neighborhoodId,
  // when passed, scopes the update to a badge directly owned by that
  // neighborhood (neighborhood-admin Badges tab, BACKLOG.md Ref 108) -- a
  // badgeId that exists but belongs to a different neighborhood (or is
  // app-wide) is treated the same as not found. Returns null if no badge
  // matches.
  updateBadge(
    id: string,
    patch: { name?: string; description?: string | null; icon?: string | null },
    options?: { neighborhoodId?: string }
  ): Promise<BadgeRecord | null>;

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
    // Set for a neighborhood-scoped badge_rule -- restricts the count to
    // that neighborhood instead of a lifetime cross-neighborhood total.
    neighborhoodId?: string | null;
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

  // Progress metric for business_rank_reached/poi_rank_reached -- is this
  // user currently the #1 ranked visitor (by 60-day check-in count) at this
  // venue, regardless of the venue's own privacy/naming (unlike the "Top
  // Caps" badge cluster's display, which only *names* a public visitor,
  // earning this badge doesn't require being publicly nameable).
  isTopVisitorForVenue(venueId: string, userId: string): Promise<boolean>;

  // Progress metric for neighborhood_rank_reached -- same idea as
  // isTopVisitorForVenue, scoped to every venue in the neighborhood combined
  // instead of one venue.
  isTopVisitorForNeighborhood(neighborhoodId: string, userId: string): Promise<boolean>;
}
