import type { VenueEnrichmentCache } from "@blockwise/types";
import type { GeoapifyPlaceDetails, GeoapifyPlaceDetailsClient } from "../places/geoapifyClient";
import { PlacesApiQuotaExceededError } from "../places/quotaGuard";
import { parseOsmOpeningHours } from "./openingHours";
import type { EnrichmentRepository } from "./repository";

// TTL for Geoapify's Contact fields (README §1.4 step 4): "if stale
// (configurable TTL), refresh from the API and rewrite the cache row."
export const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000;

export function isStale(fetchedAt: string, now: number, ttlMs: number): boolean {
  return now - new Date(fetchedAt).getTime() >= ttlMs;
}

function mapPlaceDetails(details: GeoapifyPlaceDetails) {
  const parsedHours = details.openingHours ? parseOsmOpeningHours(details.openingHours) : [];
  return {
    phone: details.phone ?? null,
    website: details.website ?? null,
    // parseOsmOpeningHours converts Geoapify's raw OSM opening_hours syntax
    // into the weekday-line shape locations/hours.ts already parses -- null
    // (not []) when nothing was understood, so hours.ts's "no hours data"
    // path applies the same way a missing Google value used to.
    hours: parsedHours.length > 0 ? parsedHours : null,
    editorialSummary: details.description ?? null,
  };
}

export interface GetFreshEnrichmentOptions {
  ttlMs?: number;
  now?: number;
}

// Refreshes an enrichment cache row -- business or POI, both trace back to
// the same underlying Geoapify Place (BACKLOG.md Ref 59) -- from Geoapify
// Place Details if missing or stale. A refresh failure (e.g. transient
// Places API error) falls back to whatever's already cached rather than
// failing the whole page -- core location info shouldn't be blocked by an
// enrichment hiccup.
export async function getFreshEnrichment(
  locationId: string,
  geoapifyPlaceId: string | null,
  cached: VenueEnrichmentCache | null,
  repository: EnrichmentRepository,
  placesClient: GeoapifyPlaceDetailsClient,
  options: GetFreshEnrichmentOptions = {}
): Promise<VenueEnrichmentCache | null> {
  const ttlMs = options.ttlMs ?? ENRICHMENT_TTL_MS;
  const now = options.now ?? Date.now();

  let enrichment = cached;
  const needsRefresh = !enrichment || isStale(enrichment.fetched_at, now, ttlMs);

  if (needsRefresh && geoapifyPlaceId) {
    try {
      const details = await placesClient.getPlaceDetails(geoapifyPlaceId);
      const mapped = mapPlaceDetails(details);
      enrichment = await repository.upsertEnrichment({
        locationId,
        source: "geoapify",
        phone: mapped.phone,
        website: mapped.website,
        hours: mapped.hours,
        editorialSummary: mapped.editorialSummary,
      });
    } catch (err) {
      // A tripped cost guardrail (QuotaGuardedPlacesClient) is expected
      // behavior, not a Geoapify/network failure -- log it quietly so it
      // doesn't read as an incident, but the fallback-to-cached-data path
      // below is identical either way.
      if (err instanceof PlacesApiQuotaExceededError) {
        // Expected throttling, not a sign the cached place_id itself is
        // broken -- doesn't warrant flagging "needs reimport".
        console.warn(`enrichment refresh skipped for location ${locationId}: ${err.message}`);
      } else {
        console.error(`enrichment refresh failed for location ${locationId}:`, err);
        try {
          await repository.recordEnrichmentFailure(
            locationId,
            err instanceof Error ? err.message : "Unknown error"
          );
        } catch (recordErr) {
          console.error(`failed to record enrichment failure for location ${locationId}:`, recordErr);
        }
      }
    }
  }

  return enrichment ?? null;
}
