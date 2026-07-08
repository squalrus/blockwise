import type { GeoJsonPolygon, SocialLinks } from "@blockwise/types";
import type {
  CreatedNeighborhood,
  CreateNeighborhoodInput,
  NeighborhoodBoundaryRecord,
  NeighborhoodRecord,
  NeighborhoodRepository,
} from "./repository";

export async function getNeighborhoodBySlug(
  slug: string,
  repository: NeighborhoodRepository
): Promise<NeighborhoodRecord | null> {
  return repository.getNeighborhoodBySlug(slug);
}

export async function getNeighborhoodById(
  id: string,
  repository: NeighborhoodRepository
): Promise<NeighborhoodRecord | null> {
  return repository.getNeighborhoodById(id);
}

export type UpdateNeighborhoodDescriptionResult =
  | { status: "not_found" }
  | { status: "updated"; neighborhood: NeighborhoodRecord };

// requireNeighborhoodAdmin (apps/api/src/admin/requireNeighborhoodAdmin.ts)
// already proves the caller administers req.params.id, but not that the id
// itself refers to a real row -- checked here rather than trusting the
// route to 404 on a stale/mistyped id.
export async function updateNeighborhoodDescription(
  id: string,
  description: string,
  repository: NeighborhoodRepository
): Promise<UpdateNeighborhoodDescriptionResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const neighborhood = await repository.updateDescription(id, description);
  return { status: "updated", neighborhood };
}

export type UpdateNeighborhoodSocialLinksResult =
  | { status: "not_found" }
  | { status: "updated"; neighborhood: NeighborhoodRecord };

export async function updateNeighborhoodSocialLinks(
  id: string,
  socialLinks: SocialLinks,
  repository: NeighborhoodRepository
): Promise<UpdateNeighborhoodSocialLinksResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const neighborhood = await repository.updateSocialLinks(id, socialLinks);
  return { status: "updated", neighborhood };
}

export type GetNeighborhoodBoundaryResult =
  | { status: "not_found" }
  | { status: "found"; boundary: NeighborhoodBoundaryRecord };

export async function getNeighborhoodBoundary(
  id: string,
  repository: NeighborhoodRepository
): Promise<GetNeighborhoodBoundaryResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const boundary = await repository.getBoundary(id);
  if (!boundary) return { status: "not_found" };
  return { status: "found", boundary };
}

export type UpdateNeighborhoodBoundaryResult =
  | { status: "not_found" }
  | { status: "updated"; boundary: NeighborhoodBoundaryRecord };

export async function updateNeighborhoodBoundary(
  id: string,
  boundaryGeojson: GeoJsonPolygon,
  repository: NeighborhoodRepository
): Promise<UpdateNeighborhoodBoundaryResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const boundary = await repository.updateBoundary(id, boundaryGeojson);
  return { status: "updated", boundary };
}

// Onboarding runbook (project plan §12.3 step 1): validation here is
// intentionally minimal (non-empty strings, a well-formed polygon) --
// SlugTakenError (thrown by the repository on a uniqueness violation) is the
// one business-rule check that can't be done without hitting the DB.
export async function createNeighborhood(
  input: CreateNeighborhoodInput,
  repository: NeighborhoodRepository
): Promise<CreatedNeighborhood> {
  return repository.createNeighborhood(input);
}
