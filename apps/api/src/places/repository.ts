import type { CategoryRecord } from "./categorize";

export interface NeighborhoodRecord {
  id: string;
  centerLat: number;
  centerLng: number;
  boundaryGeojson: { type: "Polygon"; coordinates: number[][][] } | null;
}

export interface ExistingVenue {
  id: string;
  googlePlaceId: string | null;
  name: string;
  lat: number;
  lng: number;
  claimedByBusiness: boolean;
}

export interface UpsertVenueInput {
  googlePlaceId: string;
  name: string;
  categoryId: string | null;
  lat: number;
  lng: number;
  address: string;
  neighborhoodId: string;
}

// Abstracts persistence so the sync orchestrator (sync.ts) can be tested
// against an in-memory fake instead of a real Supabase project.
export interface PlacesRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  listCategories(): Promise<CategoryRecord[]>;
  listVenuesByNeighborhood(neighborhoodId: string): Promise<ExistingVenue[]>;
  upsertVenue(venue: UpsertVenueInput): Promise<void>;
}
