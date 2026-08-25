import type { VenueEnrichmentCache } from "@blockwise/types";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
import { PlacesApiQuotaExceededError } from "../places/quotaGuard";
import type { EnrichmentRepository } from "./repository";

// TTL for Google's Contact/Atmosphere fields (README §1.4 step 4): "if stale
// (configurable TTL), refresh from the API and rewrite the cache row."
export const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000;

// Google returns up to 10 photos per place, but Google Maps Platform's
// Terms of Service (Section 3.2.3(b) "No Caching") don't allow caching
// Places API photos or photo names beyond a live fetch -- there's no
// exception for photos the way there is for place_id (indefinite) or
// lat/lng (30 days). So unlike a server-side cache, the only ToS-compliant
// lever for cost is requesting fewer photos in the first place: capping
// here means EnrichmentPhotos (apps/web/src/app/EnrichmentSection.tsx)
// never has more than this many to render, directly bounding how many
// live fetchPhotoMedia calls one venue's gallery can cost.
const MAX_GALLERY_PHOTOS = 4;

export function isStale(fetchedAt: string, now: number, ttlMs: number): boolean {
  return now - new Date(fetchedAt).getTime() >= ttlMs;
}

function mapPlaceDetails(details: RawPlaceDetails) {
  return {
    rating: details.rating ?? null,
    // Places API (New) returns reviews in its own "most relevant" order with
    // no way to request newest-first (places/client.ts) -- sort here so the
    // venue page's "Latest 3" (EnrichmentReviews.tsx) really is the most
    // recent. Reviews without a publishTime sort last.
    reviews: [...(details.reviews ?? [])]
      .sort((a, b) => {
        const aTime = a.publishTime ? new Date(a.publishTime).getTime() : -Infinity;
        const bTime = b.publishTime ? new Date(b.publishTime).getTime() : -Infinity;
        return bTime - aTime;
      })
      .map((review) => ({
        rating: review.rating ?? null,
        text: review.text?.text ?? null,
        author_name: review.authorAttribution?.displayName ?? null,
        published_at: review.publishTime ?? null,
      })),
    priceTier: details.priceLevel ?? null,
    photoRefs: (details.photos ?? []).slice(0, MAX_GALLERY_PHOTOS).map((photo) => photo.name),
    phone: details.nationalPhoneNumber ?? null,
    website: details.websiteUri ?? null,
    hours: details.regularOpeningHours?.weekdayDescriptions ?? null,
    editorialSummary: details.editorialSummary?.text ?? null,
    atmosphere: {
      delivery: details.delivery ?? null,
      dine_in: details.dineIn ?? null,
      takeout: details.takeout ?? null,
      outdoor_seating: details.outdoorSeating ?? null,
      good_for_children: details.goodForChildren ?? null,
      reservable: details.reservable ?? null,
    },
  };
}

export interface GetFreshEnrichmentOptions {
  ttlMs?: number;
  now?: number;
}

// Refreshes an enrichment cache row -- business or POI, both trace back to
// the same underlying Google Place (BACKLOG.md Ref 59) -- from Google Place
// Details if missing or stale. A refresh failure (e.g. transient Places API
// error) falls back to whatever's already cached rather than failing the
// whole page -- core location info shouldn't be blocked by an enrichment
// hiccup.
export async function getFreshEnrichment(
  locationId: string,
  googlePlaceId: string | null,
  cached: VenueEnrichmentCache | null,
  repository: EnrichmentRepository,
  placesClient: PlaceDetailsClient,
  options: GetFreshEnrichmentOptions = {}
): Promise<VenueEnrichmentCache | null> {
  const ttlMs = options.ttlMs ?? ENRICHMENT_TTL_MS;
  const now = options.now ?? Date.now();

  let enrichment = cached;
  const needsRefresh = !enrichment || isStale(enrichment.fetched_at, now, ttlMs);

  if (needsRefresh && googlePlaceId) {
    try {
      const details = await placesClient.getPlaceDetails(googlePlaceId);
      const mapped = mapPlaceDetails(details);
      enrichment = await repository.upsertEnrichment({
        locationId,
        source: "google",
        rating: mapped.rating,
        reviews: mapped.reviews,
        priceTier: mapped.priceTier,
        photoRefs: mapped.photoRefs,
        phone: mapped.phone,
        website: mapped.website,
        hours: mapped.hours,
        editorialSummary: mapped.editorialSummary,
        atmosphere: mapped.atmosphere,
      });
    } catch (err) {
      // A tripped cost guardrail (QuotaGuardedPlacesClient) is expected
      // behavior, not a Google/network failure -- log it quietly so it
      // doesn't read as an incident, but the fallback-to-cached-data path
      // below is identical either way.
      if (err instanceof PlacesApiQuotaExceededError) {
        console.warn(`enrichment refresh skipped for location ${locationId}: ${err.message}`);
      } else {
        console.error(`enrichment refresh failed for location ${locationId}:`, err);
      }
    }
  }

  return enrichment ?? null;
}
