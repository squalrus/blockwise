import type { GeoJsonPolygon, SocialLinks } from "@blockwise/types";
import { isValidFeedUrl } from "../events/icalFeed";
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

export type UpdateNeighborhoodIcalFeedUrlResult =
  | { status: "not_found" }
  | { status: "invalid_url" }
  | { status: "updated"; neighborhood: NeighborhoodRecord };

// BACKLOG.md Ref 30 (iCal/webcal event feed import). Empty string clears the
// feed (stored as null), mirroring the description form's "empty is valid"
// pattern -- everything else must be a well-formed http(s)/webcal URL.
export async function updateNeighborhoodIcalFeedUrl(
  id: string,
  icalFeedUrl: string,
  repository: NeighborhoodRepository
): Promise<UpdateNeighborhoodIcalFeedUrlResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const trimmed = icalFeedUrl.trim();
  if (trimmed && !isValidFeedUrl(trimmed)) return { status: "invalid_url" };

  const neighborhood = await repository.updateIcalFeedUrl(id, trimmed || null);
  return { status: "updated", neighborhood };
}

export type UpdateNeighborhoodIcalSyncSettingsResult =
  | { status: "not_found" }
  | { status: "updated"; neighborhood: NeighborhoodRecord };

// Nightly auto-sync toggle + auto-approve ("trust this feed") toggle -- each
// PATCHed independently from its own switch in IcalFeedForm.tsx, so settings
// is a partial update.
export async function updateNeighborhoodIcalSyncSettings(
  id: string,
  settings: { autoSyncEnabled?: boolean; autoApproveEvents?: boolean },
  repository: NeighborhoodRepository
): Promise<UpdateNeighborhoodIcalSyncSettingsResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const neighborhood = await repository.updateIcalSyncSettings(id, settings);
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

export type ActivateNeighborhoodResult =
  | { status: "not_found" }
  | { status: "activated"; neighborhood: NeighborhoodRecord };

// BACKLOG.md Ref 107 / project plan §12.3 step 5: one-way onboarding ->
// active flip. No "already active" error case -- the repository's activate
// is idempotent, so calling this twice is harmless, not a conflict.
export async function activateNeighborhood(
  id: string,
  repository: NeighborhoodRepository
): Promise<ActivateNeighborhoodResult> {
  const existing = await repository.getNeighborhoodById(id);
  if (!existing) return { status: "not_found" };

  const neighborhood = await repository.activateNeighborhood(id);
  return { status: "activated", neighborhood };
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Onboarding runbook (project plan §12.3 step 1): validation here is
// intentionally minimal (non-empty strings, a well-formed polygon) --
// SlugTakenError (thrown by the repository on a uniqueness violation) is the
// one business-rule check that can't be done without hitting the DB.
//
// Slug is always derived server-side from name + city (BACKLOG.md Ref 106:
// "{name}-{city}", matching the seeded "phinneywood-seattle") rather than
// accepted from the caller -- keeps the format enforced even against a
// direct API call, not just the admin form's UI.
export async function createNeighborhood(
  input: Omit<CreateNeighborhoodInput, "slug">,
  repository: NeighborhoodRepository
): Promise<CreatedNeighborhood> {
  const slug = `${slugify(input.name)}-${slugify(input.city)}`;
  return repository.createNeighborhood({ ...input, slug });
}
