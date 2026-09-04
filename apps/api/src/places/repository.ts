import type { VenueStatus } from "@blockwise/types";
import type { CategoryRecord } from "./categorize";

export interface NeighborhoodRecord {
  id: string;
  centerLat: number;
  centerLng: number;
  boundaryGeojson: { type: "Polygon"; coordinates: number[][][] } | null;
}

// Always a brand-new row (see SupabasePlacesRepository.upsertVenue's
// comment) -- review.ts's commitLocationReview only ever calls this for a
// place that already cleared reviewNeighborhoodLocations's own identity/
// dedup check against every known location.
export interface UpsertVenueInput {
  geoapifyPlaceId: string;
  // Null when the matched Places API result itself lacked OSM data (rare --
  // see GeoapifyPlace.osmType's comment) or came from a non-Places-API path.
  osmType: string | null;
  osmId: number | null;
  name: string;
  categoryId: string | null;
  lat: number;
  lng: number;
  address: string;
  neighborhoodId: string;
}

// Abstracts persistence so commitLocationReview's "business" classification
// path (review.ts) can be tested against an in-memory fake instead of a
// real Supabase project.
export interface PlacesRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  listCategories(): Promise<CategoryRecord[]>;
  upsertVenue(venue: UpsertVenueInput): Promise<void>;
}
