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

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: Record<string, unknown> | null;
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
  // Exactly one of venue_id/neighborhood_id is set (BACKLOG.md "Neighborhood
  // profile pages") -- a venue-owned POI, or a neighborhood-owned one (parks,
  // transit, landmarks not tied to any single business).
  venue_id: string | null;
  neighborhood_id: string | null;
  name: string;
  description: string | null;
  type: string;
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
  pois: Poi[];
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
  // Exactly one of venue_id/neighborhood_id is set -- see Poi above.
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

export interface UpdateNeighborhoodDescriptionRequest {
  description: string;
}

export interface CreateNeighborhoodPoiRequest {
  name: string;
  description?: string;
  type: string;
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

export interface VenueCategoryMapping {
  id: string;
  name: string;
  address: string;
  category_id: string | null;
  category_name: string | null;
  category_group: string | null;
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
