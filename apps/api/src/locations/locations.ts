import type {
  CategoryOption,
  LocationKind,
  LocationListItem,
  Venue,
  VenueDetail,
  VenueStatus,
} from "@blockwise/types";
import type { EnrichmentRepository } from "../enrichment/repository";
import { getFreshEnrichment } from "../enrichment/refresh";
import type { PlaceDetailsClient } from "../places/client";
import type {
  CategoryRecord,
  CreateLocationInput,
  LocationRecord,
  LocationRepository,
  UpdateLocationInput,
} from "./repository";

function toVenue(record: LocationRecord): Venue {
  return {
    id: record.id,
    google_place_id: record.googlePlaceId,
    name: record.name,
    kind: record.kind,
    category_id: record.categoryId,
    description: record.description,
    lat: record.lat,
    lng: record.lng,
    address: record.address,
    neighborhood_id: record.neighborhoodId,
    claimed_by_business: record.claimedByBusiness,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.createdAt,
  };
}

export interface CreateLocationRequestInput {
  kind: LocationKind;
  name: string;
  description?: string;
  categoryId?: string;
  lat: number;
  lng: number;
  googlePlaceId?: string;
  address?: string;
  // Defaults to "active" (the DB default) when omitted -- passed explicitly
  // as "hidden" when persisting an omitted review candidate (BACKLOG.md
  // "Reimport Locations").
  status?: VenueStatus;
}

export async function createLocation(
  neighborhoodId: string,
  input: CreateLocationRequestInput,
  repository: LocationRepository
): Promise<Venue> {
  const record = await repository.createLocation({
    neighborhoodId,
    kind: input.kind,
    name: input.name,
    description: input.description ?? null,
    categoryId: input.categoryId ?? null,
    lat: input.lat,
    lng: input.lng,
    googlePlaceId: input.googlePlaceId ?? null,
    address: input.address ?? null,
    status: input.status,
  } satisfies CreateLocationInput);
  return toVenue(record);
}

export async function listLocationsForNeighborhood(
  neighborhoodId: string,
  repository: LocationRepository,
  kind?: LocationKind,
  search?: string
): Promise<Venue[]> {
  const records = await repository.listLocationsForNeighborhood(neighborhoodId, search);
  return records.filter((r) => !kind || r.kind === kind).map(toVenue);
}

function toCategoryOption(record: CategoryRecord): CategoryOption {
  return { id: record.id, name: record.name, group_name: record.groupName };
}

// Category dropdown source for the admin Locations tab's category-reassign
// action (BACKLOG.md).
export async function listAssignableCategories(repository: LocationRepository): Promise<CategoryOption[]> {
  const categories = await repository.listCategories();
  return categories.map(toCategoryOption);
}

export type GetLocationResult = { status: "found"; location: Venue } | { status: "not_found" };

// Neighborhood-scoped ownership check, used by the admin edit/status/kind
// routes -- rejects (as not_found, same as a genuinely missing location)
// before returning it, so a cross-neighborhood location id can't be read
// from a different neighborhood's admin tab.
export async function getLocationForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  repository: LocationRepository
): Promise<GetLocationResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const record = await repository.getLocationById(locationId);
  if (!record) return { status: "not_found" };
  return { status: "found", location: toVenue(record) };
}

// Public location detail page (BACKLOG.md Ref 46/59) -- isn't scoped to a
// caller-supplied neighborhoodId or gated by admin auth; refreshes/returns
// Google Places enrichment when the location has a google_place_id (either
// kind). Hidden locations 404 here (LocationRepository.getLocationDetail
// already filters to status = 'active').
export async function getLocationDetailWithFreshEnrichment(
  locationId: string,
  repository: LocationRepository,
  enrichmentRepository: EnrichmentRepository,
  placesClient: PlaceDetailsClient
): Promise<VenueDetail | null> {
  const record = await repository.getLocationDetail(locationId);
  if (!record) return null;

  const enrichment = await getFreshEnrichment(
    locationId,
    record.googlePlaceId,
    record.enrichment,
    enrichmentRepository,
    placesClient
  );

  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    google_place_id: record.googlePlaceId,
    description: record.description,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    category_name: record.categoryName,
    claimed_by_business: record.claimedByBusiness,
    enrichment,
    checkin_count: record.checkinCount,
    favorite_count: record.favoriteCount,
    neighborhood_slug: record.neighborhoodSlug,
    neighborhood_name: record.neighborhoodName,
    social_links: record.socialLinks,
    recent_checkin_mushrooms: record.recentCheckinMushrooms,
  };
}

export type UpdateLocationResult = { status: "updated"; location: Venue } | { status: "not_found" };

export async function updateLocationForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  input: UpdateLocationInput,
  repository: LocationRepository
): Promise<UpdateLocationResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const updated = await repository.updateLocation(locationId, input);
  return { status: "updated", location: toVenue(updated) };
}

export type UpdateLocationStatusResult = { status: "updated"; location: Venue } | { status: "not_found" };

// Hide/restore (BACKLOG.md Ref 11/29), applying uniformly to either kind --
// same cross-neighborhood ownership check as every other admin mutation.
export async function updateLocationStatusForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  newStatus: VenueStatus,
  repository: LocationRepository
): Promise<UpdateLocationStatusResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const updated = await repository.setLocationStatus(locationId, newStatus);
  return { status: "updated", location: toVenue(updated) };
}

export type ReassignLocationCategoryResult =
  | { status: "updated"; location: Venue }
  | { status: "not_found" }
  | { status: "invalid_category" };

// README §2's "manual override capability in the admin tool for anything
// auto-mapped incorrectly" -- lets an admin correct a business the sync's
// category-normalization step (README §1.4 step 3) mapped wrong, without a
// direct DB edit. Business-kind only in practice (POIs are never sent
// through the category dropdown by the UI), but not kind-gated here since
// category_id is a harmless no-op field for a poi-kind row.
export async function reassignLocationCategoryForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  categoryId: string,
  repository: LocationRepository
): Promise<ReassignLocationCategoryResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const category = await repository.getLeafCategory(categoryId);
  if (!category) return { status: "invalid_category" };

  const updated = await repository.updateLocationCategory(locationId, categoryId);
  return { status: "updated", location: toVenue(updated) };
}

export type SwitchLocationKindResult =
  | { status: "updated"; location: Venue }
  | { status: "not_found" }
  | { status: "already_this_kind"; location: Venue }
  | { status: "claimed" }
  | { status: "invalid_category" };

// Switch an existing location between business and poi kind in place
// (BACKLOG.md "POIs and venues managed almost the same") -- replaces the old
// hide-then-recreate-as-a-new-row "Convert to POI" flow. A single UPDATE, no
// id change, so every existing checkin/point_event/challenge/enrichment row
// stays attached across the switch.
export async function switchLocationKindForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  kind: LocationKind,
  extra: { categoryId?: string },
  repository: LocationRepository
): Promise<SwitchLocationKindResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const record = await repository.getLocationById(locationId);
  if (!record) return { status: "not_found" };
  if (record.kind === kind) return { status: "already_this_kind", location: toVenue(record) };

  if (kind === "poi") {
    // A POI can never be claimed -- the admin must reject/revoke the claim
    // first (claims.ts's revokeApprovedClaim), then switch.
    if (record.claimedByBusiness) return { status: "claimed" };
  } else if (extra.categoryId) {
    // Optional even when switching to "business" -- matches today's
    // nullable venue.category_id ("Unmapped" is a valid state, reassignable
    // later via the existing category dropdown).
    const category = await repository.getLeafCategory(extra.categoryId);
    if (!category) return { status: "invalid_category" };
  }

  const updated = await repository.setLocationKind(locationId, { kind, ...extra });
  return { status: "updated", location: toVenue(updated) };
}

export type DeleteLocationResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "business_kind" }
  | { status: "has_dependent_activity" };

// Hard delete, POI-kind only -- a business-kind location is always
// sync-sourced-of-record and should only ever be hidden, never deleted
// (mirroring the original venue/POI split's own delete restriction). Safe
// for a POI with no dependent activity, since (unlike a business) it has no
// other FK pointing at it in normal use. Blocks the delete outright (rather
// than letting the DB's "on delete cascade" silently wipe that history)
// whenever any dependent row exists; the caller should hide instead.
export async function deleteLocationForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  repository: LocationRepository
): Promise<DeleteLocationResult> {
  const locationNeighborhoodId = await repository.getLocationNeighborhoodId(locationId);
  if (locationNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const record = await repository.getLocationById(locationId);
  if (!record) return { status: "not_found" };
  if (record.kind === "business") return { status: "business_kind" };

  if (await repository.hasDependentActivity(locationId)) {
    return { status: "has_dependent_activity" };
  }

  await repository.deleteLocation(locationId);
  return { status: "deleted" };
}

// Admin Locations tab (BACKLOG.md Ref 29) -- a single merged view over every
// location in a neighborhood regardless of kind, so an admin doesn't have to
// cross-reference two separate lists to see everything geographically in the
// neighborhood.
export async function listLocationListItemsForNeighborhood(
  neighborhoodId: string,
  repository: LocationRepository,
  search?: string
): Promise<LocationListItem[]> {
  const records = await repository.listLocationsForNeighborhood(neighborhoodId, search);
  return records.map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.name,
    address: r.address,
    category_or_type: r.kind === "business" ? (r.categoryName ?? "Unmapped") : "Point of interest",
    category_id: r.categoryId,
    status: r.status,
    claimed_by_business: r.claimedByBusiness,
    lat: r.lat,
    lng: r.lng,
    google_place_id: r.googlePlaceId,
  }));
}
