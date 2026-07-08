export interface HealthCheckResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

// Data layer types (README §1.3). Mirrors the Supabase schema in
// supabase/migrations — keep the two in sync when either changes.

export type NeighborhoodStatus = "onboarding" | "active";

// Instagram links and social media integration (BACKLOG.md Ref 30) -- a
// generic platform->url map rather than one field per platform, so adding a
// new platform is a type change, not a migration. Known keys get typed
// convenience; any other string key is still accepted for forward
// compatibility with platforms not listed here yet.
export type SocialPlatform =
  | "instagram"
  | "twitter"
  | "tiktok"
  | "facebook"
  | "website";
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6) draws
// and edits this directly rather than any hand-authored coordinates -- a
// single outer ring only, no interior holes (mirrors the same assumption in
// apps/api/src/places/geo.ts's isPointInPolygon).
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: GeoJsonPolygon | null;
  center_lat: number;
  center_lng: number;
  status: NeighborhoodStatus;
  created_at: string;
  social_links: SocialLinks;
}

export type CategoryStatus = "active" | "archived";

export interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
  source_mapping_json: Record<string, unknown>;
  status: CategoryStatus;
}

export interface Venue {
  id: string;
  google_place_id: string | null;
  name: string;
  category_id: string | null;
  lat: number;
  lng: number;
  address: string;
  neighborhood_id: string;
  claimed_by_business: boolean;
  created_at: string;
  updated_at: string;
}

export interface Poi {
  id: string;
  neighborhood_id: string;
  name: string;
  description: string | null;
  type: string;
  // Nullable only for rows that predate this column (BACKLOG.md Ref 6) --
  // required at the API layer for newly created POIs so a POI can be a
  // GPS-verified check-in target.
  lat: number | null;
  lng: number | null;
  // Both nullable -- every POI today is created manually with neither.
  // Populated when a POI traces back to a Google Places entity (BACKLOG.md
  // Ref 29/46), e.g. via "convert venue to POI" (Ref 11).
  google_place_id: string | null;
  address: string | null;
  // Hide/restore parity with venue.status (BACKLOG.md Ref 29/11).
  status: VenueStatus;
  created_at: string;
}

// POI landing page (BACKLOG.md Ref 46).
export interface PoiDetail extends Poi {
  // The neighborhood this POI belongs to, for the POI detail page's "back to
  // neighborhood" link -- mirrors VenueDetail's neighborhood_slug/name.
  neighborhood_slug: string;
  neighborhood_name: string;
  // Profile stats (BACKLOG.md Ref 58), mirroring the neighborhood/venue/user
  // stat-card convention.
  checkin_count: number;
}

export type EnrichmentSource = "google";

export interface VenueEnrichmentCache {
  venue_id: string;
  source: EnrichmentSource;
  rating: number | null;
  review_snippet: string | null;
  price_tier: string | null;
  // A Google Places API (New) photo *reference* (e.g. "places/.../photos/..."),
  // not a fetchable URL -- turning it into one requires the API key, which
  // must stay server-side. Serve it via apps/api's GET /venues/:id/photo
  // proxy rather than embedding this value directly in client-rendered HTML.
  photo_url: string | null;
  fetched_at: string;
}

// Venue detail page DTOs (BACKLOG "Venue detail pages with enrichment cache").

export interface VenueListItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category_name: string | null;
  // The category's top-level group (README §2's 6 groups, e.g. "Food &
  // Drink") -- distinct from category_name (the specific leaf category, e.g.
  // "Coffee Shop"). Used for map marker color-coding, where 39 leaf colors
  // would be indistinguishable but 6 group colors are.
  category_group: string | null;
}

export interface VenueDetail {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category_name: string | null;
  claimed_by_business: boolean;
  enrichment: VenueEnrichmentCache | null;
  // The neighborhood this venue belongs to (venues now browse from the
  // neighborhood page, not a standalone /venues page), for the venue detail
  // page's "back to neighborhood" link.
  neighborhood_slug: string;
  neighborhood_name: string;
  // From the venue's approved business_claim, if any (BACKLOG.md Ref 30) --
  // empty for venues with no approved claim.
  social_links: SocialLinks;
}

// Business claiming + GPS check-in (BACKLOG.md, README §4/§5/§14.2).

export interface Checkin {
  id: string;
  user_id: string;
  // Exactly one of venue_id/poi_id is set (BACKLOG.md Ref 6 -- check-ins can
  // target a neighborhood POI as well as a venue).
  venue_id: string | null;
  poi_id: string | null;
  device_lat: number;
  device_lng: number;
  checked_in_at: string;
}

export interface CreateCheckinRequest {
  // Identifies the (possibly still-anonymous) app_user row -- see README
  // §14.2 -- generated client-side on first launch and persisted locally.
  anonymous_device_id: string;
  lat: number;
  lng: number;
}

export interface Favorite {
  id: string;
  user_id: string;
  venue_id: string;
  created_at: string;
}

export interface CreateFavoriteRequest {
  // Identifies the (possibly still-anonymous) app_user row -- see README
  // §14.2 -- generated client-side on first launch and persisted locally.
  anonymous_device_id: string;
}

export interface FavoriteStatusResponse {
  favorited: boolean;
}

// GET /me/favorites -- venue-joined listing for the "My account" page
// (BACKLOG.md), since the raw Favorite row above has no venue name/address.
export interface FavoriteVenueSummary {
  venue_id: string;
  name: string;
  address: string;
  created_at: string;
}

// GET /me/checkins -- venue-joined check-in history for the "My account"
// page, mirroring FavoriteVenueSummary above.
export interface CheckinHistoryItem {
  venue_id: string;
  name: string;
  address: string;
  checked_in_at: string;
}

export type BusinessClaimContactMethod = "phone" | "email" | "domain";
export type BusinessClaimStatus = "pending" | "approved" | "rejected";

export interface BusinessClaim {
  id: string;
  venue_id: string;
  contact_name: string;
  contact_method: BusinessClaimContactMethod;
  contact_value: string;
  note: string | null;
  status: BusinessClaimStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_note: string | null;
  // Populated when the submitter was signed into a business account at
  // claim time (see CreateBusinessClaimRequest) -- null for the
  // still-supported anonymous submission path.
  claimed_by_user_id: string | null;
  social_links: SocialLinks;
}

// Neighborhood-admin claims tab (docs/url-map.md refactor) needs the venue's
// name/address alongside the claim -- the global admin/claims page never
// joined through to venue, since it only showed the raw venue_id.
export interface BusinessClaimWithVenue extends BusinessClaim {
  venue_name: string;
  venue_address: string;
}

export interface CreateBusinessClaimRequest {
  contact_name: string;
  contact_method: BusinessClaimContactMethod;
  contact_value: string;
  note?: string;
}

export interface UpdateSocialLinksRequest {
  social_links: SocialLinks;
}

// Real user authentication (BACKLOG.md, README §14.2/§14.3).

export type AccountType = "consumer" | "business";

// BACKLOG.md "User profiles with public or private visibility" -- private by
// default, since a signed-in identity doesn't by itself imply the user wants
// their presence (activity, connections) visible to anyone else.
export type ProfileVisibility = "public" | "private";

export interface AppUser {
  id: string;
  is_anonymous: boolean;
  account_type: AccountType;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  // BACKLOG.md "Public user profiles" -- the handle a public profile is
  // addressed by (/profile/:username), distinct from the internal id.
  // Unset (null) until the user chooses one; unique when set.
  username: string | null;
  visibility: ProfileVisibility;
  created_at: string;
  // Additive to account_type -- an account can be a consumer, a claimed
  // business owner, and a neighborhood admin all at once (BACKLOG.md
  // "Neighborhood admin invites").
  is_neighborhood_admin: boolean;
}

export interface UpdateProfileRequest {
  display_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  visibility?: ProfileVisibility;
}

export interface CompleteSignupRequest {
  // Present when the device had prior anonymous history to claim (README
  // §14.2) -- omitted for a signup with no local anonymous identity yet.
  anonymous_device_id?: string;
  account_type?: AccountType;
}

export interface CompleteLoginRequest {
  // README §14.2 edge case: if this device has its own anonymous history
  // under a different app_user row, it gets merged into the account being
  // logged into.
  anonymous_device_id?: string;
}

export interface ClaimedVenueSummary {
  venue_id: string;
  name: string;
  address: string;
}

// Business owner venue dashboard (BACKLOG.md) -- Announcement/Event content
// types an approved claimed-business owner can author for their venue, plus
// the read-only stats the dashboard shows alongside them (README §1.8/§5).

export interface Announcement {
  id: string;
  venue_id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
}

export interface Event {
  id: string;
  // Exactly one of venue_id/neighborhood_id is set.
  venue_id: string | null;
  neighborhood_id: string | null;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
}

// Neighborhood profile pages (BACKLOG.md) -- public profile mirroring the
// venue/business profile shape but scoped to Neighborhood: a description,
// neighborhood-owned POIs, and neighborhood-wide events. Authored by that
// neighborhood's own admins (requireNeighborhoodAdmin), mirroring the
// business owner venue dashboard's shape.

export interface NeighborhoodProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  pois: Poi[];
  social_links: SocialLinks;
  // Profile stats (BACKLOG.md Ref 58) -- venue_count/poi_count are
  // active-only, mirroring the public venue/POI list filters; checkin_count
  // sums check-ins against both this neighborhood's venues and POIs.
  venue_count: number;
  poi_count: number;
  member_count: number;
  checkin_count: number;
}

// Neighborhood membership (BACKLOG.md "Neighborhoods on landing page and user
// profile") -- a signed-in user joining a neighborhood, with at most one
// marked as their "home" neighborhood (is_primary).

export interface NeighborhoodMembership {
  neighborhood_id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  is_primary: boolean;
}

// GET /users/:username (BACKLOG.md "Public user profiles") -- only ever
// returned for a public-visibility profile with a username set; recent
// check-ins are gated by that same profile-level visibility, since checkin
// has no per-row privacy field of its own.
export interface PublicUserProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  joined_at: string;
  neighborhoods: NeighborhoodMembership[];
  recent_checkins: CheckinHistoryItem[];
}

export interface NeighborhoodSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  // Populated only when the request is authenticated -- null for anonymous
  // visitors browsing the landing page's full neighborhood list.
  joined: boolean;
}

export interface NeighborhoodAdminSummary {
  neighborhood_id: string;
  name: string;
  slug: string;
}

export interface NeighborhoodDashboardSummary {
  neighborhood_id: string;
  name: string;
  slug: string;
  description: string | null;
  pois: Poi[];
  events: Event[];
  social_links: SocialLinks;
}

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6).

export interface NeighborhoodBoundary {
  boundary_geojson: GeoJsonPolygon | null;
  center_lat: number;
  center_lng: number;
}

export interface UpdateNeighborhoodBoundaryRequest {
  boundary_geojson: GeoJsonPolygon;
}

export interface CreateNeighborhoodRequest {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: GeoJsonPolygon;
}

export interface CreateNeighborhoodResponse {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: NeighborhoodStatus;
  boundary_geojson: GeoJsonPolygon;
  center_lat: number;
  center_lng: number;
}

// Dry-run Google Places query preview (project plan §12.6) -- plotted as
// markers on the same map before the admin commits the drawn boundary.
export interface BoundaryPreviewCandidate {
  name: string;
  lat: number;
  lng: number;
  address: string;
  category_name: string | null;
}

export interface BoundaryPreviewReport {
  tiles_queried: number;
  api_calls_made: number;
  calls_at_result_cap: number;
  candidates: BoundaryPreviewCandidate[];
}

export interface UpdateNeighborhoodDescriptionRequest {
  description: string;
}

export interface CreateNeighborhoodPoiRequest {
  name: string;
  description?: string;
  type: string;
  // Required so the POI can be a GPS-verified check-in target (BACKLOG.md
  // Ref 6), matching the venue check-in geofence approach.
  lat: number;
  lng: number;
}

// POI edit (BACKLOG.md Ref 29) -- same fields as CreateNeighborhoodPoiRequest,
// all optional since an edit may only touch one field at a time.
export interface UpdatePoiRequest {
  name?: string;
  description?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

// POI hide/restore (BACKLOG.md Ref 29), mirroring SetVenueStatusRequest.
export interface SetPoiStatusRequest {
  status: VenueStatus;
}

// GET /business/venues/:id/dashboard -- follower count is a count of
// `favorite` rows (there's no separate "follow" table; favoriting a venue is
// the follow relationship, per the backlog item's own notes), check-in count
// is a count of `checkin` rows.
export interface VenueDashboardSummary {
  venue_id: string;
  name: string;
  address: string;
  follower_count: number;
  checkin_count: number;
  announcements: Announcement[];
  events: Event[];
  social_links: SocialLinks;
}

// Category mapping admin tool (BACKLOG.md) -- manual override for venues the
// sync's category-normalization step (README §1.4 step 3) mapped incorrectly.

export type VenueStatus = "active" | "hidden";

export interface VenueCategoryMapping {
  id: string;
  name: string;
  address: string;
  category_id: string | null;
  category_name: string | null;
  category_group: string | null;
  status: VenueStatus;
  lat: number;
  lng: number;
  google_place_id: string | null;
  // Surfaced as a "Claimed" pill in the Locations admin tab (BACKLOG.md
  // Ref 29) -- the underlying venue.claimed_by_business column already
  // existed for the business-claim flow, just wasn't selected here before.
  claimed_by_business: boolean;
}

export interface SetVenueStatusRequest {
  status: VenueStatus;
}

// Locations admin tab (BACKLOG.md Ref 29) -- a single merged view over
// venue (business) and poi rows for one neighborhood, so an admin doesn't
// have to cross-reference two separate lists to see everything geographically
// in the neighborhood. Read-only composition: each row's own kind-specific
// fields (category reassignment, POI type/description) are still edited
// through the existing venue/POI endpoints, not through this shape.
export interface LocationListItem {
  id: string;
  kind: "venue" | "poi";
  name: string;
  address: string | null;
  // Business: the assigned category name. POI: the free-text type. Never
  // both, since a row is exactly one kind.
  category_or_type: string;
  // Business only -- backs the category-reassign dropdown's selected value;
  // null for POI rows (and for a business with no category mapped yet).
  category_id: string | null;
  status: VenueStatus;
  claimed_by_business: boolean;
  // Null only for legacy POI rows that predate lat/lng (BACKLOG.md Ref 51) --
  // always populated for venues.
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
}

// Bulk Places review (BACKLOG.md Ref 29) -- a Google Places entity inside the
// neighborhood's boundary that isn't yet a venue or POI. Admin-triggered
// (costs a real Places API query each run), not surfaced automatically.
export interface LocationReviewCandidate {
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  // The sync pipeline's own category match, shown as a suggested default --
  // still overridable by the admin when classifying as a business.
  suggested_category_id: string | null;
  suggested_category_name: string | null;
}

// Boundary reconciliation (BACKLOG.md Ref 54): an *active* venue or POI
// still on record whose location no longer falls inside the neighborhood's
// current (saved) boundary -- e.g. after a redraw. Surfaced for explicit
// admin approval rather than silently staying attached or silently hidden.
export interface LocationRemovalCandidate {
  kind: "venue" | "poi";
  id: string;
  name: string;
  address: string | null;
}

export interface LocationReviewReport {
  tiles_queried: number;
  api_calls_made: number;
  calls_at_result_cap: number;
  new_candidates: LocationReviewCandidate[];
  proposed_removals: LocationRemovalCandidate[];
}

export type LocationClassification = "business" | "poi" | "omit";

export interface LocationReviewClassificationInput {
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  classification: LocationClassification;
  // Required when classification is "business".
  category_id?: string;
  // Required when classification is "poi".
  type?: string;
}

export interface LocationRemovalApproval {
  kind: "venue" | "poi";
  id: string;
}

export interface CommitLocationReviewRequest {
  classifications: LocationReviewClassificationInput[];
  removals: LocationRemovalApproval[];
}

export interface CommitLocationReviewResult {
  created_businesses: string[];
  created_pois: string[];
  omitted: string[];
  hidden: string[];
  failed: { name: string; error: string }[];
}

// Only leaf categories (see supabase/migrations/.../category_taxonomy.sql)
// are valid assignment targets -- the 6 top-level group rows are
// organizational only, so this list excludes them.
export interface CategoryOption {
  id: string;
  name: string;
  group_name: string | null;
}

export interface ReassignVenueCategoryRequest {
  category_id: string;
}

// Category taxonomy management (BACKLOG.md Ref 4) -- create/rename/archive
// actions on the category table itself (both top-level groups and leaves),
// distinct from CategoryOption/ReassignVenueCategoryRequest above which only
// reassign a venue's existing category.

export interface CategoryAdminItem {
  id: string;
  name: string;
  parent_category_id: string | null;
  status: CategoryStatus;
  // The Google Places types[] that normalize into this leaf category (README
  // §2/§1.4 step 3) -- empty for top-level group rows.
  google_types: string[];
}

export interface CreateCategoryRequest {
  name: string;
  // null creates a new top-level group; a string must reference an existing
  // top-level group (2-level taxonomy only, no nesting under a leaf).
  parent_category_id: string | null;
  google_types?: string[];
}

export interface RenameCategoryRequest {
  name: string;
}

// Challenges + badges/points (BACKLOG.md Ref 6) -- core gamification loop.
// Points: check-in = 10, first-time favorite/follow a venue = 5. Challenges
// are template-driven (a data row, not code) and reward bonus points plus an
// optional badge on completion.

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export type ChallengeTargetType = "category" | "poi";

export interface Challenge {
  id: string;
  neighborhood_id: string;
  title: string;
  description: string | null;
  target_type: ChallengeTargetType;
  // Populated for target_type "category" -- e.g. "Coffee Shop".
  category_name: string | null;
  // Populated for target_type "poi".
  poi_id: string | null;
  poi_name: string | null;
  target_count: number;
  points_reward: number;
  badge: Badge | null;
  starts_at: string;
  ends_at: string;
}

// GET /neighborhoods/:id/challenges -- adds the requesting user's progress
// on top of the Challenge template. progress_count is a distinct-venue count
// for category challenges, or 0/1 for POI challenges.
export interface ChallengeProgress extends Challenge {
  progress_count: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  points: number;
  rank: number;
}

// GET /me/points (BACKLOG.md Ref 47) -- an all-time, all-neighborhood total,
// for the account page's profile summary card.
export interface UserPointsSummary {
  points: number;
}
