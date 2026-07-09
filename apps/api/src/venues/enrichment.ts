import type { VenueDetail } from "@blockwise/types";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
import type { VenueDetailRepository } from "./detailRepository";

// The venue_enrichment_cache.photo_refs column stores Google photo
// *references* (photos[].name), not fetchable URLs -- turning one into an
// actual media URL requires the API key, which must never reach the
// browser. See app.ts's GET /venues/:id/photo route, which proxies the
// fetch server-side instead.

// TTL for Google's Contact/Atmosphere fields (README §1.4 step 4): "if stale
// (configurable TTL), refresh from the API and rewrite the cache row."
export const ENRICHMENT_TTL_MS = 24 * 60 * 60 * 1000;

export function isStale(fetchedAt: string, now: number, ttlMs: number): boolean {
  return now - new Date(fetchedAt).getTime() >= ttlMs;
}

function mapPlaceDetails(details: RawPlaceDetails) {
  return {
    rating: details.rating ?? null,
    reviews: (details.reviews ?? []).map((review) => ({
      rating: review.rating ?? null,
      text: review.text?.text ?? null,
      author_name: review.authorAttribution?.displayName ?? null,
    })),
    priceTier: details.priceLevel ?? null,
    photoRefs: (details.photos ?? []).map((photo) => photo.name),
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

export interface GetVenueDetailOptions {
  ttlMs?: number;
  now?: number;
}

// Reads a venue's detail record and, if its enrichment cache is missing or
// stale, refreshes it from Google Place Details before returning (README
// §1.4 step 4). A refresh failure (e.g. transient Places API error) falls
// back to whatever's already cached rather than failing the whole page --
// core venue info (name/address/POIs) shouldn't be blocked by an enrichment
// hiccup.
export async function getVenueDetailWithFreshEnrichment(
  venueId: string,
  repository: VenueDetailRepository,
  placesClient: PlaceDetailsClient,
  options: GetVenueDetailOptions = {}
): Promise<VenueDetail | null> {
  const ttlMs = options.ttlMs ?? ENRICHMENT_TTL_MS;
  const now = options.now ?? Date.now();

  const record = await repository.getVenueDetail(venueId);
  if (!record) return null;

  let enrichment = record.enrichment;
  const needsRefresh = !enrichment || isStale(enrichment.fetched_at, now, ttlMs);

  if (needsRefresh && record.googlePlaceId) {
    try {
      const details = await placesClient.getPlaceDetails(record.googlePlaceId);
      const mapped = mapPlaceDetails(details);
      enrichment = await repository.upsertEnrichment({
        venueId,
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
      console.error(`enrichment refresh failed for venue ${venueId}:`, err);
    }
  }

  return {
    id: record.id,
    name: record.name,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    category_name: record.categoryName,
    claimed_by_business: record.claimedByBusiness,
    enrichment: enrichment ?? null,
    neighborhood_slug: record.neighborhoodSlug,
    neighborhood_name: record.neighborhoodName,
    social_links: record.socialLinks,
  };
}
