import type { EnrichmentAtmosphere, EnrichmentReview, LocationKind, VenueEnrichmentCache } from "@blockwise/types";

export interface UpsertEnrichmentInput {
  locationId: string;
  source: "google";
  rating: number | null;
  reviews: EnrichmentReview[];
  priceTier: string | null;
  photoRefs: string[];
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  editorialSummary: string | null;
  atmosphere: EnrichmentAtmosphere | null;
}

// Abstracts persistence so the refresh logic (refresh.ts) can be tested
// against an in-memory fake, mirroring venues/detailRepository.ts. Shared by
// both business and POI locations since the venue/poi merge (BACKLOG.md
// "POIs and venues managed almost the same") -- one id space, no kind
// discriminant needed.
export interface OpenNowCandidate {
  id: string;
  name: string;
  kind: LocationKind;
  categoryName: string | null;
  hours: string[];
}

export interface EnrichmentRepository {
  getEnrichment(locationId: string): Promise<VenueEnrichmentCache | null>;
  upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache>;
  // For the photo proxy route (GET /locations/:id/photo) -- avoids
  // assembling a full detail record just to serve an image.
  getPhotoReference(locationId: string, index: number): Promise<string | null>;
  // Every active location in the neighborhood with cached hours, for the
  // Today tab's "open right now" section (BACKLOG.md Ref 27) --
  // callers run isOpenNow(hours) themselves since "now" is a runtime
  // concern, not a query concern.
  listOpenNowCandidates(neighborhoodId: string): Promise<OpenNowCandidate[]>;
}
