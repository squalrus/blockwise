import type { BadgeAdminChallengeRef, BadgeAdminItem, BadgeEarnMethod } from "@blockwise/types";
import type { NeighborhoodRepository } from "../neighborhoods/repository";
import { BadgeCodeTakenError, type BadgeRecord, type ChallengeRecord, type GamificationRepository } from "./repository";

// Exported for challengeAdmin.ts's createChallengeWithBadgeForNeighborhoodAdmin
// -- the neighborhood-admin Challenges tab creates a badge inline alongside
// every challenge (BACKLOG.md Ref 108 follow-up: "force every challenge to
// come with a badge"), reusing the exact same code-derivation rule as a
// standalone badge creation.
export function slugifyCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Classifies a badge by how it's actually earned. Some badges carry their
// own direct neighborhood_id (BACKLOG.md Ref 108 follow-up -- e.g. a
// category_milestone "Explorer" badge re-homed off the original global
// default, since "N distinct coffee shops" is meant to be about *this
// neighborhood's* coffee shops); when set, that's authoritative. Otherwise
// scope is derived from what earns the badge: neighborhood_specific only
// when every challenge awarding it is itself neighborhood-scoped, never via
// a global rule or an app-wide challenge. A badge with no rule, no direct
// scope, and no linking challenge (e.g. the founder badge, awarded via
// awardBadgeByCode with none of the three) is "manual" and counts as
// app-wide.
function resolveBadgeAdminItem(
  badge: BadgeRecord,
  hasRule: boolean,
  linkedChallenges: ChallengeRecord[],
  neighborhoodNameById: Map<string, string>
): BadgeAdminItem {
  const challenges: BadgeAdminChallengeRef[] = linkedChallenges.map((c) => ({
    id: c.id,
    title: c.title,
    neighborhood_id: c.neighborhoodId,
    neighborhood_name: c.neighborhoodId ? (neighborhoodNameById.get(c.neighborhoodId) ?? null) : null,
  }));

  const earnedVia: BadgeEarnMethod[] = [];
  if (hasRule) earnedVia.push("rule");
  if (linkedChallenges.length > 0) earnedVia.push("challenge");
  if (earnedVia.length === 0) earnedVia.push("manual");

  const scope: BadgeAdminItem["scope"] =
    badge.neighborhoodId !== null
      ? "neighborhood_specific"
      : hasRule || linkedChallenges.length === 0 || linkedChallenges.some((c) => c.neighborhoodId === null)
        ? "app_wide"
        : "neighborhood_specific";

  return {
    id: badge.id,
    code: badge.code,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    neighborhood_id: badge.neighborhoodId,
    neighborhood_name: badge.neighborhoodId ? (neighborhoodNameById.get(badge.neighborhoodId) ?? null) : null,
    scope,
    earned_via: earnedVia,
    challenges,
  };
}

async function loadClassificationInputs(repository: GamificationRepository, neighborhoodRepository: NeighborhoodRepository) {
  const [rules, challenges, neighborhoods] = await Promise.all([
    repository.getAllBadgeRules(),
    repository.listAllChallengesForAdmin(),
    neighborhoodRepository.listAll(),
  ]);
  const ruledBadgeIds = new Set(rules.map((r) => r.badgeId));
  const challengesByBadgeId = new Map<string, ChallengeRecord[]>();
  for (const challenge of challenges) {
    if (!challenge.badge) continue;
    const list = challengesByBadgeId.get(challenge.badge.id) ?? [];
    list.push(challenge);
    challengesByBadgeId.set(challenge.badge.id, list);
  }
  const neighborhoodNameById = new Map(neighborhoods.map((n) => [n.id, n.name]));
  return { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById };
}

export async function listBadgesForAdmin(
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<BadgeAdminItem[]> {
  const [badges, { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById }] = await Promise.all([
    repository.getAllBadges(),
    loadClassificationInputs(repository, neighborhoodRepository),
  ]);

  return badges
    .map((badge) =>
      resolveBadgeAdminItem(badge, ruledBadgeIds.has(badge.id), challengesByBadgeId.get(badge.id) ?? [], neighborhoodNameById)
    )
    .sort((a, b) => (a.scope === b.scope ? a.name.localeCompare(b.name) : a.scope === "neighborhood_specific" ? -1 : 1));
}

export type CreateBadgeAdminResult =
  | { status: "created"; badge: BadgeAdminItem }
  | { status: "invalid_name" }
  | { status: "invalid_neighborhood" }
  | { status: "code_taken" };

// No rule authoring here -- the badge_rule engine's ~9 rule types (category
// milestones, rank-reached, etc.) each need different parameters and aren't
// exposed through this minimal admin UI. A badge created here has no rule
// and no linking challenge yet -- it exists to be picked as a challenge's
// badge_id afterward (the Challenges tab's badge picker), or wired to a
// badge_rule directly in the DB later (at which point neighborhoodId, if
// set, scopes that future rule's evaluation too -- see badges.ts's
// isRelevant/progressForRule).
export async function createBadgeForAdmin(
  name: string,
  description: string | null,
  icon: string | null,
  neighborhoodId: string | null,
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<CreateBadgeAdminResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { status: "invalid_name" };

  if (neighborhoodId && !(await neighborhoodRepository.getNeighborhoodById(neighborhoodId))) {
    return { status: "invalid_neighborhood" };
  }

  try {
    const created = await repository.createBadge({
      code: slugifyCode(trimmedName),
      name: trimmedName,
      description,
      icon,
      neighborhoodId,
    });
    const { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById } = await loadClassificationInputs(
      repository,
      neighborhoodRepository
    );
    return {
      status: "created",
      badge: resolveBadgeAdminItem(created, ruledBadgeIds.has(created.id), challengesByBadgeId.get(created.id) ?? [], neighborhoodNameById),
    };
  } catch (err) {
    if (err instanceof BadgeCodeTakenError) return { status: "code_taken" };
    throw err;
  }
}

export type UpdateBadgeAdminResult =
  | { status: "updated"; badge: BadgeAdminItem }
  | { status: "not_found" }
  | { status: "invalid_name" };

export async function updateBadgeForAdmin(
  id: string,
  patch: { name?: string; description?: string | null; icon?: string | null },
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<UpdateBadgeAdminResult> {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) return { status: "invalid_name" };

  const updated = await repository.updateBadge(id, { ...patch, name });
  if (!updated) return { status: "not_found" };

  const { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById } = await loadClassificationInputs(
    repository,
    neighborhoodRepository
  );
  return {
    status: "updated",
    badge: resolveBadgeAdminItem(updated, ruledBadgeIds.has(updated.id), challengesByBadgeId.get(updated.id) ?? [], neighborhoodNameById),
  };
}

// Neighborhood-admin Badges tab (BACKLOG.md Ref 108 follow-up) -- every
// badge relevant to this neighborhood, however earned: directly scoped to
// it (badge.neighborhood_id), or earned only via one of this neighborhood's
// own challenges (a badge with no direct scope but every awarding challenge
// pointing here). App-wide badges (and other neighborhoods' badges) don't
// show up here -- they aren't this neighborhood admin's to manage, mirroring
// listChallengesForNeighborhoodAdmin's own-rows-only scoping.
export async function listBadgesForNeighborhoodAdmin(
  neighborhoodId: string,
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<BadgeAdminItem[]> {
  const [badges, { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById }] = await Promise.all([
    repository.getAllBadges(),
    loadClassificationInputs(repository, neighborhoodRepository),
  ]);

  return badges
    .filter((badge) => {
      if (badge.neighborhoodId === neighborhoodId) return true;
      if (badge.neighborhoodId !== null) return false;
      const linked = challengesByBadgeId.get(badge.id) ?? [];
      return linked.length > 0 && linked.every((c) => c.neighborhoodId === neighborhoodId);
    })
    .map((badge) =>
      resolveBadgeAdminItem(badge, ruledBadgeIds.has(badge.id), challengesByBadgeId.get(badge.id) ?? [], neighborhoodNameById)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type UpdateBadgeForNeighborhoodAdminResult =
  | { status: "updated"; badge: BadgeAdminItem }
  | { status: "not_found" }
  | { status: "invalid_name" };

// Ownership-scoped like updateChallengeForNeighborhoodAdmin -- only a badge
// directly owned by this neighborhood (badge.neighborhood_id) is editable
// here, not one that's merely earned via one of this neighborhood's
// challenges (that badge could in principle be reused by another
// neighborhood's challenge too, so it isn't this neighborhood's alone to
// rename).
export async function updateBadgeForNeighborhoodAdmin(
  neighborhoodId: string,
  id: string,
  patch: { name?: string; description?: string | null; icon?: string | null },
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<UpdateBadgeForNeighborhoodAdminResult> {
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) return { status: "invalid_name" };

  const updated = await repository.updateBadge(id, { ...patch, name }, { neighborhoodId });
  if (!updated) return { status: "not_found" };

  const { ruledBadgeIds, challengesByBadgeId, neighborhoodNameById } = await loadClassificationInputs(
    repository,
    neighborhoodRepository
  );
  return {
    status: "updated",
    badge: resolveBadgeAdminItem(updated, ruledBadgeIds.has(updated.id), challengesByBadgeId.get(updated.id) ?? [], neighborhoodNameById),
  };
}
