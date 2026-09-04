import type {
  CategoryOption,
  LocationKind,
  LocationListItem,
  TopVisitor,
  Venue,
  VenueDetail,
  VenueStatus,
} from "@blockwise/types";
import { VENUE_LEADERBOARD_LIMIT } from "../checkins/checkin";
import type { EnrichmentRepository } from "../enrichment/repository";
import { getFreshEnrichment } from "../enrichment/refresh";
import { buildGeoapifyCategoryIndex, matchCategory, type CategoryRecord as GeoapifyCategoryRecord } from "../places/categorize";
import type { GeoapifyPlaceDetailsClient } from "../places/geoapifyClient";
import { resolveOpenStatus } from "./hours";
import { LocationIdentityConflictError } from "./repository";
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
    geoapify_place_id: record.geoapifyPlaceId,
    osm_type: record.osmType ?? null,
    osm_id: record.osmId ?? null,
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
  geoapifyPlaceId?: string;
  // Present when created from an Import candidate (Places-API-sourced, see
  // Venue.osm_type's comment); absent for a manual add or a Geocoding-API-
  // sourced one (Troubleshoot) -- both expected, supported blank states.
  osmType?: string;
  osmId?: number;
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
    geoapifyPlaceId: input.geoapifyPlaceId ?? null,
    osmType: input.osmType ?? null,
    osmId: input.osmId ?? null,
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
// Geoapify Places enrichment when the location has a geoapify_place_id
// (either kind). Hidden locations 404 here (LocationRepository.getLocationDetail
// already filters to status = 'active').
export async function getLocationDetailWithFreshEnrichment(
  locationId: string,
  repository: LocationRepository,
  enrichmentRepository: EnrichmentRepository,
  placesClient: GeoapifyPlaceDetailsClient,
  now: Date = new Date()
): Promise<VenueDetail | null> {
  const record = await repository.getLocationDetail(locationId);
  if (!record) return null;

  const enrichment = await getFreshEnrichment(
    locationId,
    record.geoapifyPlaceId,
    record.enrichment,
    enrichmentRepository,
    placesClient
  );

  return {
    id: record.id,
    name: record.name,
    kind: record.kind,
    geoapify_place_id: record.geoapifyPlaceId,
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
    top_visitors: record.topVisitors,
    // "Open now · until X" pill (BACKLOG.md Ref 101 redesign) -- derived
    // from the enrichment's own hours rather than a separate query, same
    // rolling data getHappeningNow already reads for the neighborhood
    // Today tab's "Open now" list.
    open_status: resolveOpenStatus(enrichment?.hours ?? [], now),
  };
}

// Location detail page's Leaderboard tab (BACKLOG.md Ref 101 redesign) --
// the same visitCount ranking as VenueDetail.top_visitors, at a higher limit
// since the tab has room for more than just the mosaic's 3-badge podium.
export async function getVenueLeaderboard(
  locationId: string,
  repository: LocationRepository,
  limit: number = VENUE_LEADERBOARD_LIMIT
): Promise<TopVisitor[]> {
  return repository.getVenueLeaderboard(locationId, limit);
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

export interface FreshBasicInfo {
  name: string;
  lat: number;
  lng: number;
  address: string;
  categoryId: string | null;
}

// Shared guard for both Import's per-match refresh (review.ts's
// reviewNeighborhoodLocations) and Reassign (below) -- business-submitted
// data overrides source data once claimed (mirrors places/sync.ts's
// skippedClaimed precedent), and an existing manual category assignment (the
// admin category dropdown, BACKLOG.md Ref 56/57) is only ever filled in when
// unset, never silently overwritten by an automated refresh. Returns
// whether anything actually changed, so callers can report it without a
// needless write (and updated_at bump) on every routine run.
export async function refreshLocationBasicInfo(
  record: LocationRecord,
  fresh: FreshBasicInfo,
  repository: LocationRepository
): Promise<boolean> {
  if (record.claimedByBusiness) return false;

  let changed = false;

  if (
    record.name !== fresh.name ||
    record.lat !== fresh.lat ||
    record.lng !== fresh.lng ||
    record.address !== fresh.address
  ) {
    await repository.updateLocation(record.id, {
      name: fresh.name,
      lat: fresh.lat,
      lng: fresh.lng,
      address: fresh.address,
    });
    changed = true;
  }

  if (!record.categoryId && fresh.categoryId) {
    await repository.updateLocationCategory(record.id, fresh.categoryId);
    changed = true;
  }

  return changed;
}

export type ReassignLocationIdentityResult =
  | { status: "updated"; location: Venue }
  | { status: "not_found" }
  // The venue table's (osm_type, osm_id, neighborhood_id) unique constraint
  // rejected it -- some other location in this neighborhood already holds
  // this exact OSM identity, which almost always means the two rows are
  // themselves an existing duplicate (e.g. a rename that already got
  // imported as a brand-new location before this reassign flow existed to
  // catch it instead). Named when the conflicting row's name is known (it
  // always should be, short of a race with a delete), so the caller can
  // point the admin at exactly which two locations to reconcile.
  | { status: "conflict"; conflictingLocationName: string | null };

export interface ReassignLocationIdentityInput {
  geoapifyPlaceId: string;
  // Known already when the caller is Import's "Possible matches" (sourced
  // from the Places API, which carries OSM data -- see Venue.osm_type's
  // comment). Omitted when the caller only has a place_id, e.g. the
  // standalone Reassign Place ID panel (sourced from Geoapify's Geocoding
  // API, which never exposes OSM data) -- resolved via a Place Details
  // lookup below instead of persisting a place_id with no identity fix.
  osmType?: string | null;
  osmId?: number | null;
}

// Geoapify migration backfill (BACKLOG.md Ref 114 Phase 5) -- manually
// attaches a real identity to an existing location, for the "investigate a
// missing venue" tool's attach action once an admin has confirmed a search
// result is the same physical place. Same cross-neighborhood ownership
// check as every other admin mutation; no validation that geoapifyPlaceId
// is well-formed since the caller always sources it from a real Geoapify
// search result, never free text.
//
// Always resolves a fresh Place Details lookup (not just when osmType/osmId
// are unknown), so a Reassign also refreshes name/lat/lng/address/category
// (user-requested follow-up: "when reassigning to a known place, should the
// name update?") from the one authoritative source, rather than trusting
// whatever stale fields the caller happened to already have. Unlike Import's
// per-match refresh (review.ts's reviewNeighborhoodLocations), this applies
// regardless of location kind -- a Reassign is always a deliberate, one-off
// admin action on a single row, not an unattended scheduled sweep, so
// refreshing a POI's basic info here is a supervised choice, not a risk of
// silently clobbering manual curation.
export async function reassignLocationIdentityForNeighborhood(
  neighborhoodId: string,
  locationId: string,
  input: ReassignLocationIdentityInput,
  repository: LocationRepository,
  placesClient: GeoapifyPlaceDetailsClient,
  categories: GeoapifyCategoryRecord[]
): Promise<ReassignLocationIdentityResult> {
  const record = await repository.getLocationById(locationId);
  if (!record || record.neighborhoodId !== neighborhoodId) return { status: "not_found" };

  let geoapifyPlaceId = input.geoapifyPlaceId;
  let osmType = input.osmType ?? null;
  let osmId = input.osmId ?? null;
  let freshBasicInfo: FreshBasicInfo | null = null;

  // A failed lookup or a non-OSM result here isn't fatal -- the
  // enrichment-fetch cache (geoapify_place_id) still gets refreshed either
  // way below (using whatever the caller already supplied), just without a
  // basic-info/identity refresh this time.
  try {
    const details = await placesClient.getPlaceDetails(geoapifyPlaceId);
    osmType = details.osmType ?? osmType;
    osmId = details.osmId ?? osmId;
    // Place Details hands back yet another placeId of its own (see
    // GeoapifyPlace.osmType's comment) -- cache the freshest one seen.
    geoapifyPlaceId = details.placeId;
    if (details.name && details.location) {
      const categoryIndex = buildGeoapifyCategoryIndex(categories);
      freshBasicInfo = {
        name: details.name,
        lat: details.location.lat,
        lng: details.location.lng,
        address: details.formattedAddress,
        categoryId: matchCategory({ categories: details.categories }, categoryIndex)?.id ?? null,
      };
    }
  } catch (err) {
    console.error(`reassignLocationIdentityForNeighborhood: place-details lookup failed for ${geoapifyPlaceId}:`, err);
  }

  try {
    await repository.updateLocationIdentity(locationId, { geoapifyPlaceId, osmType, osmId });
  } catch (err) {
    if (!(err instanceof LocationIdentityConflictError)) throw err;
    const existing = await repository.listLocationsForNeighborhood(neighborhoodId);
    const conflicting = existing.find(
      (l) => (l.osmType ?? null) === err.osmType && (l.osmId ?? null) === err.osmId && l.id !== locationId
    );
    return { status: "conflict", conflictingLocationName: conflicting?.name ?? null };
  }

  if (freshBasicInfo) {
    await refreshLocationBasicInfo(record, freshBasicInfo, repository);
  }

  const finalRecord = await repository.getLocationById(locationId);
  return { status: "updated", location: toVenue(finalRecord ?? record) };
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

// Hard delete. Blocks outright (rather than letting the DB's "on delete
// cascade" silently wipe history) whenever hasDependentActivity finds any
// dependent row -- checkin/point_event/challenge/favorite/business_claim/
// coupon/event, so a business with a real claim on it is already covered by
// that check alone, same as a POI with check-in history.
//
// business-kind locations are additionally blocked outright (mirroring the
// original venue/POI split's own delete restriction) -- a business is
// always sync-sourced-of-record and normally should only ever be hidden.
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
    geoapify_place_id: r.geoapifyPlaceId,
    osm_type: r.osmType ?? null,
    osm_id: r.osmId ?? null,
  }));
}
