import type { Poi, VenueEnrichmentCache, VenueListItem } from "@blockwise/types";

export interface VenueDetailRecord {
  id: string;
  googlePlaceId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categoryName: string | null;
  claimedByBusiness: boolean;
  pois: Poi[];
  enrichment: VenueEnrichmentCache | null;
}

export interface UpsertEnrichmentInput {
  venueId: string;
  source: "google";
  rating: number | null;
  reviewSnippet: string | null;
  priceTier: string | null;
  photoUrl: string | null;
}

// Abstracts persistence so the enrichment refresh logic (enrichment.ts) can
// be tested against an in-memory fake instead of a real Supabase project,
// mirroring the pattern in places/repository.ts.
export interface VenueDetailRepository {
  listVenues(): Promise<VenueListItem[]>;
  getVenueDetail(venueId: string): Promise<VenueDetailRecord | null>;
  upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache>;
  // Just the cached Google photo reference (see venues/enrichment.ts), for
  // the GET /venues/:id/photo proxy route -- avoids assembling the full
  // detail record (pois, category join) just to serve an image.
  getEnrichmentPhotoReference(venueId: string): Promise<string | null>;
}
