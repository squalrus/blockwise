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
function isRelevant(rule: BadgeRuleRecord, categoryId: string | undefined, kind: LocationKind): boolean {
  switch (rule.ruleType) {
    case "category_milestone":
      return rule.categoryId === categoryId;
    case "poi_milestone":
      return kind === "poi";
    case "daily_distinct_venues":
    case "same_venue_repeat_in_day":
    case "level_reached":
      return true;
  }
}

async function progressForRule(
  rule: BadgeRuleRecord,
  input: { userId: string; venueId: string; dayStart: string; dayEnd: string; totalPoints: number },
  repository: GamificationRepository
): Promise<number> {
  switch (rule.ruleType) {
    case "category_milestone":
      return repository.countDistinctVenuesForBadge({ userId: input.userId, categoryId: rule.categoryId! });
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
    categoryId?: string;
    kind: LocationKind;
    checkedInAt: string;
  },
  repository: GamificationRepository
): Promise<Badge[]> {
  const rules = await repository.getAllBadgeRules();
  const relevant = rules.filter((rule) => isRelevant(rule, input.categoryId, input.kind));
  if (relevant.length === 0) return [];

  const dayStart = startOfUtcDay(input.checkedInAt);
  const dayEnd = endOfUtcDay(input.checkedInAt);
  const totalPoints = await repository.getUserPointsTotal(input.userId);

  const awarded: Badge[] = [];
  for (const rule of relevant) {
    if (await repository.hasEarnedBadge(input.userId, rule.badgeId)) continue;

    const progress = await progressForRule(
      rule,
      { userId: input.userId, venueId: input.venueId, dayStart, dayEnd, totalPoints },
      repository
    );
    if (progress < rule.threshold) continue;

    const wasAwarded = await repository.awardRuleBadge(input.userId, rule.badgeId);
    if (wasAwarded) awarded.push(toBadge(rule.badge));
  }
  return awarded;
}
