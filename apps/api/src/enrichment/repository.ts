import type { LocationKind, VenueEnrichmentCache } from "@blockwise/types";

export interface UpsertEnrichmentInput {
  locationId: string;
  source: "geoapify";
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  editorialSummary: string | null;
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
  // Flags a failed Place Details fetch (refresh.ts) -- e.g. a cached
  // geoapify_place_id has gone stale (see Venue.osm_type's comment in
  // @blockwise/types) and needs a fresh one from the next sync/Import run.
  // Only updates an *existing* enrichment row; a location that's never had a
  // successful fetch at all has nothing to flag as newly-stale yet, so this
  // is a no-op for one (upsertEnrichment's own next success still creates
  // the row normally). Cleared back to null by upsertEnrichment's next
  // success, not by this method.
  recordEnrichmentFailure(locationId: string, message: string): Promise<void>;
  // Every active location in the neighborhood with cached hours, for the
  // Today tab's "open right now" section (BACKLOG.md Ref 27) --
  // callers run isOpenNow(hours) themselves since "now" is a runtime
  // concern, not a query concern.
  listOpenNowCandidates(neighborhoodId: string): Promise<OpenNowCandidate[]>;
}
