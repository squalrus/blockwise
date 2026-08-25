import type { Badge, LocationKind } from "@blockwise/types";
import type { BadgeRuleRecord, GamificationRepository } from "./repository";
import { computeLevel } from "./points";

function toBadge(record: BadgeRuleRecord["badge"]): Badge {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    icon: record.icon,
    neighborhood_id: record.neighborhoodId,
  };
}

function startOfUtcDay(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

function endOfUtcDay(iso: string): string {
  const d = new Date(iso);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)
  ).toISOString();
}

// A rule only needs (re-)checking if this specific check-in could plausibly
// move its progress -- daily/same-venue/level rules are always re-checked
// (any check-in affects them), but a category_milestone/poi_milestone rule
// for a category or kind this check-in doesn't match can't have changed.
function isRelevant(
  rule: BadgeRuleRecord,
  categoryId: string | undefined,
  kind: LocationKind,
  neighborhoodId: string
): boolean {
  switch (rule.ruleType) {
    case "category_milestone":
      // A neighborhood-scoped Explorer badge (BACKLOG.md Ref 108 follow-up)
      // only cares about check-ins within its own neighborhood -- a
      // check-in elsewhere can't move its progress even if the category
      // matches, unlike an app-wide (neighborhoodId null) rule.
      return (
        rule.categoryId === categoryId &&
        (rule.badge.neighborhoodId === null || rule.badge.neighborhoodId === neighborhoodId)
      );
    case "poi_milestone":
    case "poi_rank_reached":
      return kind === "poi";
    case "business_rank_reached":
      return kind === "business";
    case "daily_distinct_venues":
    case "same_venue_repeat_in_day":
    case "level_reached":
    // Any check-in in the neighborhood could change who's ranked #1 there,
    // not just one at this specific venue -- always re-checked, mirroring
    // level_reached.
    case "neighborhood_rank_reached":
      return true;
    // Never affected by a check-in -- evaluated separately, after a
    // connection is accepted (see evaluateBadgesForNeighborCount below).
    case "neighbor_count_reached":
      return false;
    // Never affected by a check-in *directly* -- a checked-in venue only
    // grows the forager collection (and so this rule's progress) the first
    // time it's visited, which recordVenueCollection's own return value
    // already tells the caller without re-running the badge rule set here.
    // Evaluated separately (see evaluateBadgesForCollectionCount below).
    case "collection_milestone":
      return false;
  }
}

async function progressForRule(
  rule: BadgeRuleRecord,
  input: {
    userId: string;
    venueId: string;
    neighborhoodId: string;
    dayStart: string;
    dayEnd: string;
    totalPoints: number;
  },
  repository: GamificationRepository
): Promise<number> {
  switch (rule.ruleType) {
    case "category_milestone":
      return repository.countDistinctVenuesForBadge({
        userId: input.userId,
        categoryId: rule.categoryId!,
        neighborhoodId: rule.badge.neighborhoodId,
      });
    case "poi_milestone":
      return repository.countDistinctVenuesForBadge({ userId: input.userId, kind: "poi" });
    case "daily_distinct_venues":
      return repository.countDistinctVenuesCheckedInBetween({
        userId: input.userId,
        startsAt: input.dayStart,
        endsAt: input.dayEnd,
      });
    case "same_venue_repeat_in_day":
      return repository.countCheckinsForVenueBetween({
        userId: input.userId,
        venueId: input.venueId,
        startsAt: input.dayStart,
        endsAt: input.dayEnd,
      });
    case "level_reached":
      return computeLevel(input.totalPoints).level;
    // Boolean progress against a threshold that's always 1 (see
    // BadgeRuleType's doc comment) -- 1 if currently ranked #1, else 0.
    case "business_rank_reached":
    case "poi_rank_reached":
      return (await repository.isTopVisitorForVenue(input.venueId, input.userId)) ? 1 : 0;
    case "neighborhood_rank_reached":
      return (await repository.isTopVisitorForNeighborhood(input.neighborhoodId, input.userId)) ? 1 : 0;
    // Unreachable -- isRelevant above filters these rule types out of every
    // checkin-triggered call before progressForRule is ever invoked with them.
    case "neighbor_count_reached":
    case "collection_milestone":
      return 0;
  }
}

// Called after a successful check-in, entirely independent of
// evaluateChallengesAfterCheckin -- badge_rule has no FK to challenge and
// this never calls into challenge-oriented repository methods. Awards every
// badge whose rule this check-in newly satisfies and returns them, so the
// caller (rewards.ts) can surface "badges unlocked" in the check-in response.
export async function evaluateBadgesAfterCheckin(
  input: {
    userId: string;
    venueId: string;
    neighborhoodId: string;
    categoryId?: string;
    kind: LocationKind;
    checkedInAt: string;
  },
  repository: GamificationRepository
): Promise<Badge[]> {
  const rules = await repository.getAllBadgeRules();
  const relevant = rules.filter((rule) => isRelevant(rule, input.categoryId, input.kind, input.neighborhoodId));
  if (relevant.length === 0) return [];

  const dayStart = startOfUtcDay(input.checkedInAt);
  const dayEnd = endOfUtcDay(input.checkedInAt);
  const totalPoints = await repository.getUserPointsTotal(input.userId);

  const awarded: Badge[] = [];
  for (const rule of relevant) {
    if (await repository.hasEarnedBadge(input.userId, rule.badgeId)) continue;

    const progress = await progressForRule(
      rule,
      { userId: input.userId, venueId: input.venueId, neighborhoodId: input.neighborhoodId, dayStart, dayEnd, totalPoints },
      repository
    );
    if (progress < rule.threshold) continue;

    const wasAwarded = await repository.awardRuleBadge(input.userId, rule.badgeId);
    if (wasAwarded) awarded.push(toBadge(rule.badge));
  }
  return awarded;
}

// Called after a neighbor connection is accepted (BACKLOG.md Ref 14/33),
// entirely independent of evaluateBadgesAfterCheckin -- a connection isn't a
// check-in, so isRelevant/progressForRule above never run for it. The
// caller already knows the user's new accepted-connection count (from
// ConnectionRepository, a different repository than this one), so it's
// passed in rather than queried here.
export async function evaluateBadgesForNeighborCount(
  userId: string,
  neighborCount: number,
  repository: GamificationRepository
): Promise<Badge[]> {
  const rules = (await repository.getAllBadgeRules()).filter((rule) => rule.ruleType === "neighbor_count_reached");

  const awarded: Badge[] = [];
  for (const rule of rules) {
    if (neighborCount < rule.threshold) continue;
    if (await repository.hasEarnedBadge(userId, rule.badgeId)) continue;

    const wasAwarded = await repository.awardRuleBadge(userId, rule.badgeId);
    if (wasAwarded) awarded.push(toBadge(rule.badge));
  }
  return awarded;
}

// Called after a new forager-collection entry is recorded -- either a
// venue's first check-in or a neighbor's first connection (BACKLOG.md Ref
// 98), entirely independent of the other two evaluate* functions above.
// Mirrors evaluateBadgesForNeighborCount's shape: the caller already knows
// the user's new total collection count (from MushroomCollectionRepository,
// a different repository than this one), so it's passed in rather than
// queried here.
export async function evaluateBadgesForCollectionCount(
  userId: string,
  collectionCount: number,
  repository: GamificationRepository
): Promise<Badge[]> {
  const rules = (await repository.getAllBadgeRules()).filter((rule) => rule.ruleType === "collection_milestone");

  const awarded: Badge[] = [];
  for (const rule of rules) {
    if (collectionCount < rule.threshold) continue;
    if (await repository.hasEarnedBadge(userId, rule.badgeId)) continue;

    const wasAwarded = await repository.awardRuleBadge(userId, rule.badgeId);
    if (wasAwarded) awarded.push(toBadge(rule.badge));
  }
  return awarded;
}
