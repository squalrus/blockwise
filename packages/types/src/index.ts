export interface HealthCheckResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

// Data layer types (README §1.3). Mirrors the Supabase schema in
// supabase/migrations — keep the two in sync when either changes.

export type NeighborhoodStatus = "onboarding" | "active";

export interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundary_geojson: Record<string, unknown> | null;
  center_lat: number;
  center_lng: number;
  status: NeighborhoodStatus;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
  source_mapping_json: Record<string, unknown>;
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
  venue_id: string;
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
}

export interface CreateBusinessClaimRequest {
  contact_name: string;
  contact_method: BusinessClaimContactMethod;
  contact_value: string;
  note?: string;
}

// Real user authentication (BACKLOG.md, README §14.2/§14.3).

export type AccountType = "consumer" | "business";

export interface AppUser {
  id: string;
  is_anonymous: boolean;
  account_type: AccountType;
  email: string | null;
  phone: string | null;
  created_at: string;
  // Additive to account_type -- an account can be a consumer, a claimed
  // business owner, and a neighborhood admin all at once (BACKLOG.md
  // "Neighborhood admin invites").
  is_neighborhood_admin: boolean;
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
