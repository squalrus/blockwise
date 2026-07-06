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
  category_name: string | null;
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
