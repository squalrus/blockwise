import type { ChallengeAdminItem } from "@blockwise/types";
import type { CategoryAdminRepository } from "../categoryAdmin/repository";
import type { NeighborhoodRepository } from "../neighborhoods/repository";
import { slugifyCode } from "./badgeAdmin";
import { effectiveTargetCount } from "./challenges";
import { BadgeCodeTakenError, type ChallengeRecord, type ChallengeTargetKind, type GamificationRepository } from "./repository";

// Shared by createChallengeForAdmin and createChallengeWithBadgeForNeighborhoodAdmin
// below -- title/target/date validation is identical for both; only what
// happens with badgeId (accept one vs. mint one) differs.
type ValidateChallengeCoreResult =
  | { status: "ok"; title: string }
  | { status: "invalid_title" }
  | { status: "invalid_target" }
  | { status: "invalid_dates" }
  | { status: "invalid_category" }
  | { status: "invalid_live_target" };

async function validateChallengeCore(
  input: {
    title: string;
    categoryId: string | null;
    targetKind: ChallengeTargetKind | null;
    targetCountLive: boolean;
    startsAt: string;
    endsAt: string | null;
  },
  categoryAdminRepository: CategoryAdminRepository
): Promise<ValidateChallengeCoreResult> {
  const title = input.title.trim();
  if (!title) return { status: "invalid_title" };

  // Exactly one of category_id/target_kind, matching challenge_target_check
  // -- venue_id is never accepted here (see the module comment above).
  const hasCategory = input.categoryId !== null;
  const hasKind = input.targetKind !== null;
  if (hasCategory === hasKind) return { status: "invalid_target" };

  // A "live" target only makes sense for a completionist "any POI in the
  // neighborhood" challenge (target_kind 'poi') -- effectiveTargetCount
  // (challenges.ts) only resolves it live in that one case; a category
  // challenge or an 'any' (check in anywhere) challenge has no matching
  // "how many are there" denominator to track.
  if (input.targetCountLive && input.targetKind !== "poi") return { status: "invalid_live_target" };

  if (input.endsAt && input.endsAt <= input.startsAt) return { status: "invalid_dates" };

  if (input.categoryId) {
    const category = await categoryAdminRepository.getCategory(input.categoryId);
    if (!category) return { status: "invalid_category" };
  }

  return { status: "ok", title };
}

// Validates a re-targeting patch the same way validateChallengeCore does for
// create -- exactly one of category_id/target_kind, and a category_id must
// reference a real category. The frontend always sends both fields together
// (one null) whenever either changes, so this only fires when a re-target is
// actually being attempted; a patch touching neither is a no-op here.
type ValidateTargetPatchResult = { status: "ok" } | { status: "invalid_target" } | { status: "invalid_category" };

async function validateTargetPatch(
  patch: { categoryId?: string | null; targetKind?: ChallengeTargetKind | null },
  categoryAdminRepository: CategoryAdminRepository
): Promise<ValidateTargetPatchResult> {
  if (patch.categoryId === undefined && patch.targetKind === undefined) return { status: "ok" };

  const hasCategory = (patch.categoryId ?? null) !== null;
  const hasKind = (patch.targetKind ?? null) !== null;
  if (hasCategory === hasKind) return { status: "invalid_target" };

  if (patch.categoryId) {
    const category = await categoryAdminRepository.getCategory(patch.categoryId);
    if (!category) return { status: "invalid_category" };
  }

  return { status: "ok" };
}

// BACKLOG.md Ref 108's minimal super-admin authoring flow, mirroring
// categoryAdmin.ts's shape (list/create, no delete). Deliberately narrower
// than a full challenge-authoring UI (Ref 77, still unbuilt): creation only
// supports a category- or kind-targeted challenge (never a specific venue),
// and scope/target composition are fixed at creation -- only the reward/
// copy fields (updateChallengeForAdmin below) are editable afterward.
// Resolves target_count live (via effectiveTargetCount) rather than
// exposing the raw, possibly-stale stored column -- the admin list should
// show the same number a member sees on the public Challenges tab.
async function toChallengeAdminItem(
  challenge: ChallengeRecord,
  neighborhoodName: string | null,
  repository: GamificationRepository,
  hasCompletions: boolean
): Promise<ChallengeAdminItem> {
  const targetCount = await effectiveTargetCount(challenge, repository);
  return {
    id: challenge.id,
    neighborhood_id: challenge.neighborhoodId,
    neighborhood_name: neighborhoodName,
    title: challenge.title,
    description: challenge.description,
    // Mirrors challenges.ts's toChallengeProgress mapping so the admin list
    // and the public DTO agree on what a given row "is".
    target_type: challenge.categoryId
      ? "category"
      : challenge.targetKind === "poi"
        ? "any_poi"
        : challenge.targetKind === "any"
          ? "any_activity"
          : "poi",
    category_id: challenge.categoryId,
    category_name: challenge.categoryName,
    poi_id: challenge.venueId,
    poi_name: challenge.venueName,
    target_count: targetCount,
    target_count_live: challenge.targetCountLive,
    points_reward: challenge.pointsReward,
    badge: challenge.badge
      ? {
          id: challenge.badge.id,
          code: challenge.badge.code,
          name: challenge.badge.name,
          description: challenge.badge.description,
          icon: challenge.badge.icon,
          neighborhood_id: challenge.badge.neighborhoodId,
        }
      : null,
    starts_at: challenge.startsAt,
    ends_at: challenge.endsAt,
    has_completions: hasCompletions,
  };
}

export async function listChallengesForAdmin(
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository
): Promise<ChallengeAdminItem[]> {
  const [challenges, neighborhoods] = await Promise.all([
    repository.listAllChallengesForAdmin(),
    neighborhoodRepository.listAll(),
  ]);
  const nameById = new Map(neighborhoods.map((n) => [n.id, n.name]));
  const completed = await repository.completedChallengeIds(challenges.map((c) => c.id));
  const items = await Promise.all(
    challenges.map((c) =>
      toChallengeAdminItem(c, c.neighborhoodId ? (nameById.get(c.neighborhoodId) ?? null) : null, repository, completed.has(c.id))
    )
  );
  return items.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}

export type CreateChallengeAdminResult =
  | { status: "created"; challenge: ChallengeAdminItem }
  | { status: "invalid_title" }
  | { status: "invalid_target" }
  | { status: "invalid_neighborhood" }
  | { status: "invalid_category" }
  | { status: "invalid_dates" }
  | { status: "invalid_live_target" };

export async function createChallengeForAdmin(
  input: {
    neighborhoodId: string | null;
    title: string;
    description: string | null;
    categoryId: string | null;
    targetKind: ChallengeTargetKind | null;
    targetCount: number;
    targetCountLive: boolean;
    pointsReward: number;
    badgeId: string | null;
    startsAt: string;
    endsAt: string | null;
  },
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository,
  categoryAdminRepository: CategoryAdminRepository
): Promise<CreateChallengeAdminResult> {
  const core = await validateChallengeCore(input, categoryAdminRepository);
  if (core.status !== "ok") return core;

  let neighborhoodName: string | null = null;
  if (input.neighborhoodId) {
    const neighborhood = await neighborhoodRepository.getNeighborhoodById(input.neighborhoodId);
    if (!neighborhood) return { status: "invalid_neighborhood" };
    neighborhoodName = neighborhood.name;
  }

  const created = await repository.createChallenge({
    neighborhoodId: input.neighborhoodId,
    title: core.title,
    description: input.description,
    categoryId: input.categoryId,
    targetKind: input.targetKind,
    targetCount: input.targetCount,
    targetCountLive: input.targetCountLive,
    pointsReward: input.pointsReward,
    badgeId: input.badgeId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  return { status: "created", challenge: await toChallengeAdminItem(created, neighborhoodName, repository, false) };
}

export type CreateChallengeWithBadgeResult =
  | { status: "created"; challenge: ChallengeAdminItem }
  | { status: "invalid_title" }
  | { status: "invalid_target" }
  | { status: "invalid_category" }
  | { status: "invalid_dates" }
  | { status: "invalid_live_target" }
  | { status: "invalid_badge_name" }
  | { status: "badge_code_taken" };

// Neighborhood-admin Challenges tab merges badge authoring in: every
// neighborhood challenge is required to come with its own badge (user
// request), unlike the super-admin Challenges tab where badge_id stays an
// optional pick from any existing badge (kept deliberately separate --
// super admin still manages badges and challenges as two independent
// tools). Mints a brand-new badge scoped to this neighborhood first, then
// the challenge referencing it -- not wrapped in a DB transaction (this
// repository layer doesn't expose one), so a failure between the two steps
// can in principle leave an orphaned badge; challenge validation runs
// first specifically to make that a rare edge case rather than the common
// path.
export async function createChallengeWithBadgeForNeighborhoodAdmin(
  neighborhoodId: string,
  neighborhoodName: string,
  challenge: {
    title: string;
    description: string | null;
    categoryId: string | null;
    targetKind: ChallengeTargetKind | null;
    targetCount: number;
    targetCountLive: boolean;
    pointsReward: number;
    startsAt: string;
    endsAt: string | null;
  },
  badge: { name: string; description: string | null; icon: string | null },
  repository: GamificationRepository,
  categoryAdminRepository: CategoryAdminRepository
): Promise<CreateChallengeWithBadgeResult> {
  const core = await validateChallengeCore(challenge, categoryAdminRepository);
  if (core.status !== "ok") return core;

  const badgeName = badge.name.trim();
  if (!badgeName) return { status: "invalid_badge_name" };

  let createdBadge;
  try {
    createdBadge = await repository.createBadge({
      code: slugifyCode(badgeName),
      name: badgeName,
      description: badge.description,
      icon: badge.icon,
      neighborhoodId,
    });
  } catch (err) {
    if (err instanceof BadgeCodeTakenError) return { status: "badge_code_taken" };
    throw err;
  }

  const createdChallenge = await repository.createChallenge({
    neighborhoodId,
    title: core.title,
    description: challenge.description,
    categoryId: challenge.categoryId,
    targetKind: challenge.targetKind,
    targetCount: challenge.targetCount,
    targetCountLive: challenge.targetCountLive,
    pointsReward: challenge.pointsReward,
    badgeId: createdBadge.id,
    startsAt: challenge.startsAt,
    endsAt: challenge.endsAt,
  });

  return { status: "created", challenge: await toChallengeAdminItem(createdChallenge, neighborhoodName, repository, false) };
}

// Neighborhood-admin Challenges tab (BACKLOG.md Ref 108) -- this
// neighborhood's own challenges only, not merged with app-wide ones (the
// admin manages what belongs to their neighborhood; app-wide challenges
// aren't theirs to edit). neighborhoodName is passed in rather than looked
// up per row since the caller (the route) already resolved it via
// neighborhoodAdminGate.
export async function listChallengesForNeighborhoodAdmin(
  neighborhoodId: string,
  neighborhoodName: string,
  repository: GamificationRepository
): Promise<ChallengeAdminItem[]> {
  const challenges = await repository.listChallengesForNeighborhoodAdmin(neighborhoodId);
  const completed = await repository.completedChallengeIds(challenges.map((c) => c.id));
  const items = await Promise.all(
    challenges.map((c) => toChallengeAdminItem(c, neighborhoodName, repository, completed.has(c.id)))
  );
  return items.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
}

export type UpdateChallengeForNeighborhoodAdminResult =
  | { status: "updated"; challenge: ChallengeAdminItem }
  | { status: "not_found" }
  | { status: "locked" }
  | { status: "invalid_title" }
  | { status: "invalid_badge_name" }
  | { status: "invalid_target" }
  | { status: "invalid_category" }
  | { status: "invalid_live_target" };

// Same reward/copy fields as updateChallengeForAdmin, but ownership-scoped
// (a challengeId belonging to a different neighborhood, or an app-wide one,
// reports not_found rather than leaking whether it exists) and with no
// badgeId field -- the challenge-badge link is 1:1 and permanent (every
// neighborhood challenge is minted with its own badge, see
// createChallengeWithBadgeForNeighborhoodAdmin above), so "editing the
// badge" here means updating that same badge's own name/description/icon,
// not repointing to a different one.
//
// Locked once anyone has completed the challenge -- a neighborhood admin
// editing the title/target/badge after the fact would retroactively change
// what a completer actually earned, so the whole update (challenge fields
// and badge fields alike) is refused rather than allowing partial edits.
// Super admins have no such restriction (updateChallengeForAdmin below).
export async function updateChallengeForNeighborhoodAdmin(
  neighborhoodId: string,
  neighborhoodName: string,
  challengeId: string,
  patch: {
    title?: string;
    description?: string | null;
    categoryId?: string | null;
    targetKind?: ChallengeTargetKind | null;
    targetCount?: number;
    targetCountLive?: boolean;
    pointsReward?: number;
    endsAt?: string | null;
    badgeName?: string;
    badgeDescription?: string | null;
    badgeIcon?: string | null;
  },
  repository: GamificationRepository,
  categoryAdminRepository: CategoryAdminRepository
): Promise<UpdateChallengeForNeighborhoodAdminResult> {
  const title = patch.title?.trim();
  if (patch.title !== undefined && !title) return { status: "invalid_title" };
  const badgeName = patch.badgeName?.trim();
  if (patch.badgeName !== undefined && !badgeName) return { status: "invalid_badge_name" };
  if (patch.targetCountLive && patch.targetKind !== "poi") return { status: "invalid_live_target" };
  const targetValidation = await validateTargetPatch(patch, categoryAdminRepository);
  if (targetValidation.status !== "ok") return targetValidation;

  const completed = await repository.completedChallengeIds([challengeId]);
  if (completed.has(challengeId)) return { status: "locked" };

  const updated = await repository.updateChallenge(
    challengeId,
    {
      title,
      description: patch.description,
      categoryId: patch.categoryId,
      targetKind: patch.targetKind,
      targetCount: patch.targetCount,
      targetCountLive: patch.targetCountLive,
      pointsReward: patch.pointsReward,
      endsAt: patch.endsAt,
    },
    { neighborhoodId }
  );
  if (!updated) return { status: "not_found" };

  let badge = updated.badge;
  if (badge && (patch.badgeName !== undefined || patch.badgeDescription !== undefined || patch.badgeIcon !== undefined)) {
    const updatedBadge = await repository.updateBadge(
      badge.id,
      { name: badgeName, description: patch.badgeDescription, icon: patch.badgeIcon },
      { neighborhoodId }
    );
    if (updatedBadge) badge = updatedBadge;
  }

  return { status: "updated", challenge: await toChallengeAdminItem({ ...updated, badge }, neighborhoodName, repository, false) };
}

export type UpdateChallengeAdminResult =
  | { status: "updated"; challenge: ChallengeAdminItem }
  | { status: "not_found" }
  | { status: "invalid_title" }
  | { status: "invalid_target" }
  | { status: "invalid_category" }
  | { status: "invalid_live_target" };

// Scope is create-only (see the module comment above) -- changing a
// challenge's neighborhood would mean re-deriving progress against a
// different membership entirely. Target (category vs. kind, and which one)
// can be changed, same as create -- validateTargetPatch enforces the same
// exactly-one-of-category/kind rule either way.
export async function updateChallengeForAdmin(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    categoryId?: string | null;
    targetKind?: ChallengeTargetKind | null;
    targetCount?: number;
    targetCountLive?: boolean;
    pointsReward?: number;
    badgeId?: string | null;
    endsAt?: string | null;
  },
  repository: GamificationRepository,
  neighborhoodRepository: NeighborhoodRepository,
  categoryAdminRepository: CategoryAdminRepository
): Promise<UpdateChallengeAdminResult> {
  const title = patch.title?.trim();
  if (patch.title !== undefined && !title) return { status: "invalid_title" };
  if (patch.targetCountLive && patch.targetKind !== "poi") return { status: "invalid_live_target" };
  const targetValidation = await validateTargetPatch(patch, categoryAdminRepository);
  if (targetValidation.status !== "ok") return targetValidation;

  const updated = await repository.updateChallenge(id, { ...patch, title });
  if (!updated) return { status: "not_found" };

  const neighborhoodName = updated.neighborhoodId
    ? ((await neighborhoodRepository.getNeighborhoodById(updated.neighborhoodId))?.name ?? null)
    : null;
  const completed = await repository.completedChallengeIds([id]);
  return { status: "updated", challenge: await toChallengeAdminItem(updated, neighborhoodName, repository, completed.has(id)) };
}
