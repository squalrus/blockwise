import type { VenueStatus } from "@blockwise/types";
import type { CategoryRecord } from "./categorize";

export interface NeighborhoodRecord {
  id: string;
  centerLat: number;
  centerLng: number;
  boundaryGeojson: { type: "Polygon"; coordinates: number[][][] } | null;
}

export interface ExistingVenue {
  id: string;
  geoapifyPlaceId: string | null;
  name: string;
  lat: number;
  lng: number;
  claimedByBusiness: boolean;
  status: VenueStatus;
}

export interface UpsertVenueInput {
  geoapifyPlaceId: string;
  name: string;
  categoryId: string | null;
  lat: number;
  lng: number;
  address: string;
  neighborhoodId: string;
  // Set only when this upsert is reviving a venue that matched by exact
  // geoapify_place_id but was previously status "removed" (BACKLOG.md Ref
  // 114's migration surfaced this gap: upsertVenue never touched status, so
  // a boundary redrawn back out to re-include an unchanged venue refreshed
  // its data but left it silently invisible forever). Never forces "hidden"
  // back to "active" -- that's a separate, deliberate admin curation axis
  // this sync pipeline must never override.
  revive?: boolean;
}

// Abstracts persistence so the sync orchestrator (sync.ts) can be tested
// against an in-memory fake instead of a real Supabase project.
export interface PlacesRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  listCategories(): Promise<CategoryRecord[]>;
  listVenuesByNeighborhood(neighborhoodId: string): Promise<ExistingVenue[]>;
  upsertVenue(venue: UpsertVenueInput): Promise<void>;
}
