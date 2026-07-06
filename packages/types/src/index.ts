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
  photo_url: string | null;
  fetched_at: string;
}
