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

// A location's kind (BACKLOG.md "POIs and venues managed almost the same")
// -- "business" is the default for anything sync-created from Google Places
// and can be claimed by its owner; "poi" is neighborhood-owned and can never
// be claimed. Designed to admit a third kind later (none planned today)
// without another schema split -- switching kind is a single field update,
// not a move between tables.
export type LocationKind = "business" | "poi";

export interface Venue {
  id: string;
  google_place_id: string | null;
  name: string;
  kind: LocationKind;
  category_id: string | null;
  // POI-only free-text fields (BACKLOG.md Ref 6/29) -- null for kind
  // "business", where category_id carries the equivalent classification.
  type: string | null;
  description: string | null;
  // Nullable only for legacy rows that predate lat/lng (BACKLOG.md Ref 51);
  // address is nullable for the same reason POIs have always allowed it.
  lat: number | null;
  lng: number | null;
  address: string | null;
  neighborhood_id: string;
  // Always false for kind "poi" -- a POI can never be claimed.
  claimed_by_business: boolean;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

export type EnrichmentSource = "google";

export interface EnrichmentReview {
  rating: number | null;
  text: string | null;
  author_name: string | null;
}

export interface EnrichmentAtmosphere {
  delivery: boolean | null;
  dine_in: boolean | null;
  takeout: boolean | null;
  outdoor_seating: boolean | null;
  good_for_children: boolean | null;
  reservable: boolean | null;
}

export interface VenueEnrichmentCache {
  venue_id: string;
  source: EnrichmentSource;
  rating: number | null;
  reviews: EnrichmentReview[];
  price_tier: string | null;
  // Google Places API (New) photo *references* (e.g. "places/.../photos/..."),
  // not fetchable URLs -- turning one into a URL requires the API key, which
  // must stay server-side. Serve them via apps/api's GET /venues/:id/photo
  // proxy (?index=) rather than embedding these values directly in
  // client-rendered HTML.
  photo_refs: string[];
  phone: string | null;
  website: string | null;
  // Human-readable weekday hours (Google's `regularOpeningHours.weekdayDescriptions`),
  // e.g. ["Monday: 9:00 AM – 5:00 PM", ...] -- avoids parsing raw period data.
  hours: string[] | null;
  editorial_summary: string | null;
  atmosphere: EnrichmentAtmosphere | null;
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
  kind: LocationKind;
  // Gates whether a POI-kind location's photo strip renders at all (most
  // POIs are manually created with no Google Place behind them) -- always
  // populated for kind "business".
  google_place_id: string | null;
  // POI-only fields, null for kind "business".
  type: string | null;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category_name: string | null;
  claimed_by_business: boolean;
  enrichment: VenueEnrichmentCache | null;
  // Profile stat (BACKLOG.md Ref 58) -- meaningful for both kinds now that
  // they share one detail page (BACKLOG.md "POIs and venues managed almost
  // the same"), previously POI-only via PoiDetail.
  checkin_count: number;
  // All-time favorite/follow count (BACKLOG.md Ref 30's `favorite` table),
  // shown alongside checkin_count on the summary card for both kinds.
  favorite_count: number;
  // The neighborhood this location belongs to (venues/POIs both browse from
  // the neighborhood page), for the detail page's "back to neighborhood" link.
  neighborhood_slug: string;
  neighborhood_name: string;
  // From the venue's approved business_claim, if any (BACKLOG.md Ref 30) --
  // empty for venues with no approved claim, and always empty for kind "poi"
  // since a POI can never be claimed.
  social_links: SocialLinks;
}

// Business claiming + GPS check-in (BACKLOG.md, README §4/§5/§14.2).

export interface Checkin {
  id: string;
  user_id: string;
  // Targets either a business or a POI (BACKLOG.md Ref 6) -- both are rows
  // in the same table since the venue/poi merge, so one id column covers
  // both kinds.
  venue_id: string;
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

// POST /locations/:id/checkins response addition -- badges/challenges this
// specific check-in newly unlocked, for the check-in UI's result card.
// Distinct from Badge/Challenge's own catalog shapes since this is scoped to
// "what happened just now" rather than "what exists."
export interface CompletedChallengeSummary {
  id: string;
  title: string;
  points_reward: number;
  badge: Badge | null;
}

export interface CheckinRewardsSummary {
  points_earned: number;
  challenges_completed: CompletedChallengeSummary[];
  badges_earned: Badge[];
}

export interface CheckinResult extends Checkin {
  rewards: CheckinRewardsSummary;
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

// Revoke an already-approved claim (BACKLOG.md "POIs and venues managed
// almost the same") -- reviewClaim only handles pending claims, so this is
// the only way to flip claimed_by_business back to false, e.g. to unblock
// switching a claimed business to POI kind (which is never allowed while
// claimed).
export interface RevokeClaimRequest {
  reason?: string;
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

// BACKLOG.md "Mushroom avatars" -- avatar_url is seeded once from the OAuth
// provider's photo at signup and is otherwise read-only (never client-
// settable via PATCH /me/profile, to close off arbitrary/explicit-content
// URLs); avatar_style is the only user-editable choice, picking between that
// social photo and the account's randomly-assigned mushroom (packages/ui's
// mushroomConfigForUser, deterministic from `id` -- no image upload/URL
// involved either way).
export type AvatarStyle = "social" | "mushroom";

// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- a deliberate override of
// the hash-derived look mushroomConfigForUser (packages/ui) would otherwise
// pick. Approved cap/stalk/spots/bg/spotCount/spotShape values are enforced
// server-side (PATCH /me/profile), not by this type, so a stored value is
// always renderable. stalk, spots, and bg are independent choices (not one
// mirroring another), as are spotCount and spotShape (any count 0-6 pairs
// with any shape) rather than a fused named pattern. bg only affects Avatar
// rendering's backdrop circle, not MushroomField's decorative growing-field
// icons (which never render a background at all).
export interface MushroomCustomization {
  cap: string;
  stalk: string;
  spots: string;
  bg: string;
  spotCount: number;
  spotShape: string;
}

export interface AppUser {
  id: string;
  is_anonymous: boolean;
  account_type: AccountType;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  // Null until the user saves a customizer choice -- rendering falls back
  // to mushroomConfigForUser(id) until then.
  mushroom_customization: MushroomCustomization | null;
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
  avatar_style?: AvatarStyle;
  mushroom_customization?: MushroomCustomization | null;
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
  // The hosting business's name, only populated for venue-scoped events
  // returned by GET /neighborhoods/:id/events (BACKLOG.md Ref 27's merged
  // neighborhood+business Upcoming events tab) -- null everywhere else.
  venue_name: string | null;
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
  pois: Venue[];
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
  avatar_style: AvatarStyle;
  mushroom_customization: MushroomCustomization | null;
  joined_at: string;
  neighborhoods: NeighborhoodMembership[];
  recent_checkins: CheckinHistoryItem[];
  badges: UserBadge[];
  // Every challenge this user has completed, across every neighborhood --
  // mirrors `badges` above (the profile page shows only the latest of each,
  // client-side, same as /account's tabs).
  challenges: UserChallenge[];
  // Added alongside ProfileSummaryCard reuse on the public profile page --
  // checkin_count/favorite_count are all-time totals (unlike recent_checkins,
  // capped to PUBLIC_PROFILE_CHECKIN_LIMIT), mirroring /me/points'
  // account-page equivalent.
  checkin_count: number;
  favorite_count: number;
  points_summary: UserPointsSummary;
  // BACKLOG.md Ref 14/33 "Connect with other users" -- accepted-connection
  // count only; the neighbors themselves are a separate, request-gated
  // listing (GET /me/connections), not exposed on someone else's profile.
  neighbor_count: number;
}

// BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
// profile": a mutual, request-based relationship between two accounts,
// called a "neighbor" in UI copy rather than "friend". Declining a pending
// request, cancelling one, or removing an accepted connection are all a
// hard delete server-side -- there's no "declined" status to represent.
export type ConnectionStatus = "pending" | "accepted";

export interface UserConnection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
}

// GET /me/connections -- user-joined listing for the "My account" page's
// Neighbors section, mirroring FavoriteVenueSummary's venue-joined shape.
// direction tells the UI whether a pending row is incoming (show
// accept/decline) or outgoing (show cancel).
export interface ConnectionSummary {
  id: string;
  status: ConnectionStatus;
  direction: "incoming" | "outgoing";
  created_at: string;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    avatar_style: AvatarStyle;
    mushroom_customization: MushroomCustomization | null;
  };
}

export interface CreateConnectionRequest {
  username: string;
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
  business_count: number;
  member_count: number;
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
  pois: Venue[];
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

// Manual location creation (BACKLOG.md "POIs and venues managed almost the
// same") -- today only wired up for kind "poi" (the "+ Add point of
// interest" admin flow); kind "business" is accepted for forward
// compatibility but has no manual-create UI yet, since businesses are
// otherwise always sync-created from Google Places.
export interface CreateLocationRequest {
  kind: LocationKind;
  name: string;
  description?: string;
  // Required when kind is "poi"; unused for "business" (classified via
  // category_id instead).
  type?: string;
  category_id?: string;
  // Required so the location can be a GPS-verified check-in target
  // (BACKLOG.md Ref 6), matching the venue check-in geofence approach.
  lat: number;
  lng: number;
  address?: string;
  google_place_id?: string;
}

// Location edit (BACKLOG.md Ref 29, generalized from POI-only), all optional
// since an edit may only touch one field at a time.
export interface UpdateLocationRequest {
  name?: string;
  description?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

// Location hide/restore (BACKLOG.md Ref 29), applies uniformly to either kind.
export interface SetLocationStatusRequest {
  status: VenueStatus;
}

// Switch an existing location between business and poi kind in place
// (BACKLOG.md "POIs and venues managed almost the same") -- replaces the old
// hide-then-recreate-as-a-new-row "Convert to POI" flow.
export interface SetLocationKindRequest {
  kind: LocationKind;
  // Optional even when switching to "business" -- matches today's nullable
  // venue.category_id ("Unmapped" is a valid state, reassignable later via
  // the existing category dropdown).
  category_id?: string;
  // Required when switching to "poi", unless the row already has a type
  // from a previous stint as a POI.
  type?: string;
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

// Locations admin tab (BACKLOG.md Ref 29) -- a single merged view over every
// location in a neighborhood regardless of kind, so an admin doesn't have to
// cross-reference two separate lists to see everything geographically in the
// neighborhood. Read-only composition: each row's own kind-specific fields
// (category reassignment, POI type/description) are still edited through the
// existing location endpoints, not through this shape.
export interface LocationListItem {
  id: string;
  kind: LocationKind;
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
  // always populated for businesses.
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

// A badge a user has earned (BACKLOG.md Ref 55), across every neighborhood
// and however it was awarded -- challenge completion or a direct award like
// the founder badge -- shown on the public profile and account pages.
export interface UserBadge {
  badge: Badge;
  awarded_at: string;
}

// "poi" targets one specific venue_id (still named poi_id/poi_name below for
// API stability); "any_poi" targets any POI-kind location in the
// neighborhood; "any_activity" targets a check-in anywhere in the
// neighborhood regardless of category or kind (e.g. a standing "thanks for
// visiting"). Neither "any_poi" nor "any_activity" have a category_id or
// venue_id, so category_name/poi_id/poi_name all stay null for them.
export type ChallengeTargetType = "category" | "poi" | "any_poi" | "any_activity";

export interface Challenge {
  id: string;
  neighborhood_id: string;
  title: string;
  description: string | null;
  target_type: ChallengeTargetType;
  // Populated for target_type "category" -- e.g. "Coffee Shop".
  category_name: string | null;
  // Populated for target_type "poi" -- named poi_id/poi_name for API
  // stability (a challenge still conceptually "targets a specific place"),
  // even though the backing challenge.venue_id column now points at a row
  // that could technically be either kind. Null for "any_poi".
  poi_id: string | null;
  poi_name: string | null;
  target_count: number;
  points_reward: number;
  badge: Badge | null;
  starts_at: string;
  // Null means the challenge runs indefinitely (no scheduled end).
  ends_at: string | null;
}

// GET /neighborhoods/:id/challenges -- adds the requesting user's progress
// on top of the Challenge template. progress_count is a distinct-venue count
// for category and any_poi challenges, or 0/1 for a specific-poi challenge.
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

export type ActivityType = "checkin" | "favorite" | "badge" | "challenge_completion";

// GET /neighborhoods/:id/activity -- the neighborhood-wide Recent activity
// tab (BACKLOG.md Ref 27's "What's happening now" scope). actor_name is
// already resolved server-side against the actor's profile visibility --
// "A user" for a private profile, display_name/username/"A user" for a
// public one -- so the client never sees which private user did what.
// actor_username is likewise only ever set for a public profile (null for
// "A user" rows), letting the web app link the actor's name to their public
// profile without exposing a private user's handle.
export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor_name: string;
  actor_username: string | null;
  venue_id: string | null;
  venue_name: string | null;
  badge_name: string | null;
  badge_icon: string | null;
  challenge_title: string | null;
  occurred_at: string;
}

// GET /neighborhoods/:id/happening-now -- events in progress right now plus
// businesses/POIs whose cached hours say they're currently open.
export interface OpenNowLocation {
  id: string;
  name: string;
  kind: LocationKind;
  category_name: string | null;
}

export interface HappeningNow {
  live_events: Event[];
  open_now: OpenNowLocation[];
}

// GET /me/points (BACKLOG.md Ref 47) -- an all-time, all-neighborhood total,
// for the account page's profile summary card. level/points_into_level/
// points_to_next_level are computed server-side (apps/api's
// gamification/points.ts computeLevel) rather than client-side, so the
// badge rule engine's "level_reached" badges (gamification/badges.ts) and
// this response always agree on the same user's level.
export interface UserPointsSummary {
  points: number;
  level: number;
  points_into_level: number;
  points_to_next_level: number;
}

// GET /me/challenges/completed-count -- an all-time, all-neighborhood total
// of challenges this user has completed, for the account page's profile
// summary card, mirroring UserPointsSummary above.
export interface UserChallengesSummary {
  completed_count: number;
}

// GET /me/challenges -- every challenge this user has completed, across
// every neighborhood, for the account page's Challenges tab, mirroring
// UserBadge's shape (a fixed template plus the award/completion timestamp).
export interface UserChallenge {
  id: string;
  title: string;
  description: string | null;
  neighborhood_id: string;
  neighborhood_name: string;
  points_reward: number;
  badge: Badge | null;
  completed_at: string;
}

// GET /me/challenges/active -- every active, not-yet-completed challenge
// across every neighborhood this user belongs to, for the account page's
// Challenges tab, mirroring UserChallenge's shape but with live progress
// (ChallengeProgress) instead of a completion timestamp.
export interface UserChallengeProgress extends ChallengeProgress {
  neighborhood_name: string;
}
