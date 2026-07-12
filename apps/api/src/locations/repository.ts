import type { LocationKind, SocialLinks, VenueEnrichmentCache, VenueListItem, VenueStatus } from "@blockwise/types";

export interface LocationRecord {
  id: string;
  neighborhoodId: string;
  googlePlaceId: string | null;
  name: string;
  kind: LocationKind;
  categoryId: string | null;
  categoryName: string | null;
  categoryGroup: string | null;
  // POI-only fields -- null for kind "business".
  type: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  claimedByBusiness: boolean;
  status: VenueStatus;
  createdAt: string;
}

// Public location detail page DTO (BACKLOG "POIs and venues managed almost
// the same" -- merges what were VenueDetailRecord and PoiDetail's backing
// record into one shape for GET /locations/:id).
export interface LocationDetailRecord {
  id: string;
  googlePlaceId: string | null;
  name: string;
  kind: LocationKind;
  type: string | null;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categoryName: string | null;
  claimedByBusiness: boolean;
  enrichment: VenueEnrichmentCache | null;
  neighborhoodSlug: string;
  neighborhoodName: string;
  // From the venue's approved business_claim, if any -- empty for venues
  // with no approved claim, and always empty for kind "poi".
  socialLinks: SocialLinks;
  checkinCount: number;
  favoriteCount: number;
}

export interface CreateLocationInput {
  neighborhoodId: string;
  kind: LocationKind;
  name: string;
  description: string | null;
  type: string | null;
  categoryId: string | null;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  address: string | null;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface SetLocationKindInput {
  kind: LocationKind;
  categoryId?: string;
  type?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  groupName: string | null;
}

// Abstracts persistence so location business logic (locations.ts) can be
// tested against an in-memory fake instead of a real Supabase project,
// mirroring the pattern in places/repository.ts. A location is either kind
// "business" (Google-Place-backed, claimable) or "poi" (neighborhood-owned,
// never claimable) -- both rows in the same underlying table since the
// venue/poi merge (BACKLOG.md "POIs and venues managed almost the same").
export interface LocationRepository {
  // Public business list for a neighborhood's Venues tab/map (BACKLOG.md) --
  // kind "business", active only, matching the map's category-group
  // color-coding needs.
  listVenues(neighborhoodId: string): Promise<VenueListItem[]>;
  // Neighborhood-scoped listing for the admin Locations tab and the public
  // POI list (NeighborhoodProfile.pois/NeighborhoodDashboardSummary.pois) --
  // every kind, every status (callers filter by kind/status as needed).
  listLocationsForNeighborhood(neighborhoodId: string, search?: string): Promise<LocationRecord[]>;
  // Active-only count for one kind, for neighborhood profile stats
  // (BACKLOG.md Ref 58).
  countActiveLocationsForNeighborhood(neighborhoodId: string, kind: LocationKind): Promise<number>;
  getLocationById(locationId: string): Promise<LocationRecord | null>;
  // Public detail page (BACKLOG.md Ref 46/"Venue detail pages") -- only
  // returns active locations, mirroring the old getVenueDetail/getPoiById
  // status filtering.
  getLocationDetail(locationId: string): Promise<LocationDetailRecord | null>;
  // Backs every neighborhood-scoped mutation's ownership check -- null if
  // the location doesn't exist.
  getLocationNeighborhoodId(locationId: string): Promise<string | null>;
  createLocation(input: CreateLocationInput): Promise<LocationRecord>;
  updateLocation(locationId: string, input: UpdateLocationInput): Promise<LocationRecord>;
  // Hide/restore (BACKLOG.md Ref 11/29) -- flips active/hidden without
  // touching any other column, so existing checkin/favorite/claim FKs are
  // untouched.
  setLocationStatus(locationId: string, status: VenueStatus): Promise<LocationRecord>;
  // Switch between business and poi kind in place (BACKLOG.md "POIs and
  // venues managed almost the same") -- validation (claimed-block,
  // required-type-for-poi) lives in locations.ts's switchLocationKindForNeighborhood.
  setLocationKind(locationId: string, input: SetLocationKindInput): Promise<LocationRecord>;
  updateLocationCategory(locationId: string, categoryId: string): Promise<LocationRecord>;
  // Only leaf categories (those with a parent_category_id) -- the 6
  // top-level group rows are organizational only.
  listCategories(): Promise<CategoryRecord[]>;
  getLeafCategory(categoryId: string): Promise<{ id: string } | null>;
  // True if this location has any check-in, point, claim, favorite,
  // announcement, event, or challenge history -- all cascade-delete on the
  // location row, so a hard delete would silently wipe that history rather
  // than fail. Callers must check this before deleteLocation and hide
  // instead when true.
  hasDependentActivity(locationId: string): Promise<boolean>;
  deleteLocation(locationId: string): Promise<void>;
}
