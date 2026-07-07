import type { NeighborhoodMembership } from "@blockwise/types";
import type {
  NeighborhoodMemberRecord,
  NeighborhoodMemberRepository,
  NeighborhoodMembershipSummary,
} from "./repository";

function toMembership(summary: NeighborhoodMembershipSummary): NeighborhoodMembership {
  return {
    neighborhood_id: summary.neighborhoodId,
    name: summary.name,
    slug: summary.slug,
    city: summary.city,
    state: summary.state,
    is_primary: summary.isPrimary,
  };
}

export type JoinNeighborhoodResult =
  | { status: "created" | "already_joined"; membership: NeighborhoodMemberRecord }
  | { status: "not_found" };

export async function joinNeighborhood(
  neighborhoodId: string,
  userId: string,
  repository: NeighborhoodMemberRepository
): Promise<JoinNeighborhoodResult> {
  if (!(await repository.neighborhoodExists(neighborhoodId))) return { status: "not_found" };

  const existing = await repository.getMembership(userId, neighborhoodId);
  if (existing) return { status: "already_joined", membership: existing };

  const created = await repository.createMembership(userId, neighborhoodId);
  return { status: "created", membership: created };
}

export type LeaveNeighborhoodResult = { status: "removed" | "not_found" };

export async function leaveNeighborhood(
  neighborhoodId: string,
  userId: string,
  repository: NeighborhoodMemberRepository
): Promise<LeaveNeighborhoodResult> {
  if (!(await repository.neighborhoodExists(neighborhoodId))) return { status: "not_found" };

  await repository.deleteMembership(userId, neighborhoodId);
  return { status: "removed" };
}

export type SetHomeNeighborhoodResult =
  | { status: "updated"; membership: NeighborhoodMemberRecord }
  | { status: "not_a_member" };

// Requires having already joined (BACKLOG.md's join action is a separate
// step from marking a neighborhood as "home") rather than joining implicitly,
// so a user can't end up with a home neighborhood they never explicitly
// opted into.
export async function setHomeNeighborhood(
  neighborhoodId: string,
  userId: string,
  repository: NeighborhoodMemberRepository
): Promise<SetHomeNeighborhoodResult> {
  const existing = await repository.getMembership(userId, neighborhoodId);
  if (!existing) return { status: "not_a_member" };

  const membership = await repository.setPrimary(userId, neighborhoodId);
  return { status: "updated", membership };
}

export async function listMembershipsForUser(
  userId: string,
  repository: NeighborhoodMemberRepository
): Promise<NeighborhoodMembership[]> {
  const summaries = await repository.listMembershipsForUser(userId);
  return summaries.map(toMembership);
}
