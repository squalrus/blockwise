import type { SocialLinks } from "@blockwise/types";
import type { NeighborhoodRecord, NeighborhoodRepository } from "./repository";

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
