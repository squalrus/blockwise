import type {
  LocationKind,
  RecentVisitorMushroom,
  SocialLinks,
  TopVisitor,
  VenueAnalytics,
  VenueEnrichmentCache,
  VenueListItem,
  VenueStatus,
} from "@blockwise/types";

export interface LocationRecord {
  id: string;
  neighborhoodId: string;
  // Cache only, not identity -- see Venue.osm_type's comment in
  // @blockwise/types. Optional (not required-nullable) purely to limit
  // test-fixture churn -- production code always sets them explicitly.
  geoapifyPlaceId: string | null;
  osmType?: string | null;
  osmId?: number | null;
  name: string;
  kind: LocationKind;
  categoryId: string | null;
  categoryName: string | null;
  categoryGroup: string | null;
  // POI-only field -- null for kind "business".
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
  geoapifyPlaceId: string | null;
  name: string;
  kind: LocationKind;
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
  // BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" --
  // distinct visitors within the rolling 60-day window, each with their
  // current live mushroom and visit count, for the "who's foraged here"
  // mosaic (MushroomField's distinctMushrooms mode). Most-visits-first,
  // tie-broken by most recent.
  recentCheckinMushrooms: RecentVisitorMushroom[];
  // Up to the top 3 named visitors by visitCount, for the "Top Caps" badge
  // cluster next to the mosaic -- empty if there's no public, named visitor
  // within the window.
  topVisitors: TopVisitor[];
}

export interface CreateLocationInput {
  neighborhoodId: string;
  kind: LocationKind;
  name: string;
  description: string | null;
  categoryId: string | null;
  lat: number;
  lng: number;
  geoapifyPlaceId: string | null;
  // Present when created from an Import candidate sourced from the Places
  // API (which carries OSM data -- see Venue.osm_type's comment); absent for
  // a manually added location (PoiForm/AddLocationModal) or one sourced from
  // Geoapify's Geocoding API (Troubleshoot's free-text search/add flow),
  // neither of which have it to give. That blank state is expected and
  // supported -- a future sync/Import run may still link it later.
  osmType?: string | null;
  osmId?: number | null;
  address: string | null;
  // Defaults to the DB's "active" default when omitted -- set explicitly to
  // "hidden" when persisting an omitted review candidate (BACKLOG.md
  // "Reimport Locations"), so it's recorded without appearing as a new
  // active location.
  status?: VenueStatus;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface SetLocationKindInput {
  kind: LocationKind;
  categoryId?: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  groupName: string | null;
}

// Thrown by LocationRepository.updateLocationIdentity when the target
// osm_type+osm_id already belongs to a different location in the same
// neighborhood -- see that method's comment.
export class LocationIdentityConflictError extends Error {
  constructor(
    readonly osmType: string,
    readonly osmId: number
  ) {
    super(`osm_type/osm_id ${osmType}/${osmId} is already used by another location in this neighborhood`);
    this.name = "LocationIdentityConflictError";
  }
}

// Abstracts persistence so location business logic (locations.ts) can be
// tested against an in-memory fake instead of a real Supabase project,
// mirroring the pattern in places/repository.ts. A location is either kind
// "business" (Geoapify-Place-backed, claimable) or "poi" (neighborhood-owned,
// never claimable) -- both rows in the same underlying table since the
// venue/poi merge (BACKLOG.md "POIs and venues managed almost the same").
export interface LocationRepository {
  // Public business list for a neighborhood's Venues tab/map (BACKLOG.md) --
  // kind "business", active only, matching the map's category-group
  // color-coding needs.
  listVenues(neighborhoodId: string): Promise<VenueListItem[]>;
  // Neighborhood-scoped listing for the admin Locations tab and the public
  // POI list (NeighborhoodProfile.pois/NeighborhoodDashboardSummary.pois) --
  // every kind, active or hidden (callers filter further by kind/status as
  // needed). Never returns "removed" rows -- those are fully detached from
  // the neighborhood (BACKLOG.md "Reimport Locations"), so a redraw that
  // later re-includes their area treats them as a brand-new candidate again
  // rather than a still-known one.
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
  // venues managed almost the same") -- validation (claimed-block) lives in
  // locations.ts's switchLocationKindForNeighborhood.
  setLocationKind(locationId: string, input: SetLocationKindInput): Promise<LocationRecord>;
  updateLocationCategory(locationId: string, categoryId: string): Promise<LocationRecord>;
  // Geoapify migration backfill (BACKLOG.md Ref 114 Phase 5) -- re-points an
  // existing location at a real identity, either from an admin's explicit
  // "possible match" approval on a review run, a manual investigate-and-
  // attach for a venue neither auto-matching nor fuzzy name/location
  // matching caught, or the standalone Reassign Place ID panel. Never called
  // for a brand-new location (those get their identity at creation via
  // createLocation/upsertVenue). geoapifyPlaceId is always set (refreshing
  // the enrichment-fetch cache -- see Venue.osm_type's comment); osmType/
  // osmId are set only when known at call time -- when the caller only has
  // a place_id (e.g. the standalone panel, sourced from Geoapify's Geocoding
  // API, which never exposes OSM data), locations.ts resolves them via a
  // Place Details lookup before calling this, rather than persisting a
  // place_id with no identity fix at all.
  //
  // Must throw LocationIdentityConflictError (not just any Error) when
  // osmType/osmId already belong to a different location in the same
  // neighborhood -- venue's (osm_type, osm_id, neighborhood_id) unique
  // constraint rejects it outright, which happens whenever the two rows are
  // themselves an already-existing duplicate (e.g. a prior Import run
  // created a fresh row for a business under its renamed Geoapify listing
  // before this reassign flow existed to catch the rename instead).
  // reassignLocationIdentityForNeighborhood needs the distinct error type to
  // turn that into an actionable "these look like duplicates" message
  // instead of a generic 500.
  updateLocationIdentity(
    locationId: string,
    identity: { geoapifyPlaceId: string; osmType: string | null; osmId: number | null }
  ): Promise<LocationRecord>;
  // Only leaf categories (those with a parent_category_id) -- the 6
  // top-level group rows are organizational only.
  listCategories(): Promise<CategoryRecord[]>;
  getLeafCategory(categoryId: string): Promise<{ id: string } | null>;
  // True if this location has any check-in, point, claim, favorite,
  // coupon, event, or challenge history -- all cascade-delete on the
  // location row, so a hard delete would silently wipe that history rather
  // than fail. Callers must check this before deleteLocation and hide
  // instead when true.
  hasDependentActivity(locationId: string): Promise<boolean>;
  deleteLocation(locationId: string): Promise<void>;
  // Business-admin Analytics tab (mirrors NeighborhoodRepository.getAnalytics)
  // -- a single RPC call, since checkins-over-time/activity-by-type/
  // checkins-by-day-of-week/coupon-claims-over-time are always requested
  // together by that one tab.
  getAnalytics(locationId: string, days: number): Promise<VenueAnalytics>;
  // Location detail page's Leaderboard tab (BACKLOG.md Ref 101 redesign) --
  // the same visitCount ranking as getLocationDetail's topVisitors, at a
  // higher limit (VENUE_LEADERBOARD_LIMIT) since the tab has room for more
  // than just the mosaic's 3-badge podium.
  getVenueLeaderboard(locationId: string, limit: number): Promise<TopVisitor[]>;
}
