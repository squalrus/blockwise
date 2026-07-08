import type { SocialLinks, VenueEnrichmentCache, VenueListItem } from "@blockwise/types";

export interface VenueDetailRecord {
  id: string;
  googlePlaceId: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  categoryName: string | null;
  claimedByBusiness: boolean;
  enrichment: VenueEnrichmentCache | null;
  neighborhoodSlug: string;
  neighborhoodName: string;
  // From the venue's approved business_claim, if any (BACKLOG.md Ref 30) --
  // empty for venues with no approved claim.
  socialLinks: SocialLinks;
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
  // Venues are browsed from the neighborhood page (BACKLOG.md), so this is
  // always scoped to a single neighborhood rather than listing every venue.
  listVenues(neighborhoodId: string): Promise<VenueListItem[]>;
  getVenueDetail(venueId: string): Promise<VenueDetailRecord | null>;
  // Neighborhood profile stats (BACKLOG.md Ref 58) -- active-only, mirroring
  // listVenues's own status filter.
  countActiveVenuesForNeighborhood(neighborhoodId: string): Promise<number>;
  upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache>;
  // Just the cached Google photo reference (see venues/enrichment.ts), for
  // the GET /venues/:id/photo proxy route -- avoids assembling the full
  // detail record (category join, enrichment) just to serve an image.
  getEnrichmentPhotoReference(venueId: string): Promise<string | null>;
}
