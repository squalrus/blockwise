import { PLACES_API_NEAR_LIMIT_THRESHOLD, PLACES_API_PRICING, type PlacesApiEndpoint } from "@blockwise/types";
import type { PhotoMedia, PlaceDetailsClient, RawPlaceDetails } from "./client";

export class PlacesApiQuotaExceededError extends Error {
  constructor(public readonly endpoint: PlacesApiEndpoint) {
    super(`Places API monthly free-tier guardrail tripped for ${endpoint}`);
    this.name = "PlacesApiQuotaExceededError";
  }
}

// Cache TTL for the month-to-date count -- getPlaceDetails/fetchPhotoMedia
// fire on ordinary visitor page views (enrichment refresh, venue photos),
// so checking the guard can't cost a DB round trip on every single request.
// A few minutes of staleness just means the guard trips a handful of calls
// late near the boundary, which is fine for a cost guardrail.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Guards the two non-critical, high-frequency Places API endpoints
// (getPlaceDetails, fetchPhotoMedia -- see QuotaGuardedPlacesClient below)
// against runaway cost: once this Google billing month's successful call
// count for an endpoint nears its free tier (PLACES_API_PRICING), further
// calls are refused rather than spending real money on a feature that
// degrades gracefully without it. "This month" is Google's own boundary --
// midnight Pacific Time on the 1st, not UTC midnight -- computed by
// getMonthToDateCallCount (SupabaseMonitoringRepository, via the
// google_places_billing_month_start() Postgres function) rather than here,
// so it doesn't need its own PST/PDT-aware date math. searchNearby/
// searchText aren't guarded here -- both are admin-triggered (neighborhood
// sync, boundary preview, investigate-missing-venue), bounded by an admin
// actually clicking something rather than by page-view volume.
export class PlacesApiQuotaGuard {
  private readonly cache = new Map<PlacesApiEndpoint, { count: number; expiresAt: number }>();

  constructor(private readonly getMonthToDateCallCount: (endpoint: PlacesApiEndpoint) => Promise<number>) {}

  async isNearLimit(endpoint: PlacesApiEndpoint): Promise<boolean> {
    const count = await this.getCount(endpoint);
    const { freeMonthlyEvents } = PLACES_API_PRICING[endpoint];
    return count >= freeMonthlyEvents * PLACES_API_NEAR_LIMIT_THRESHOLD;
  }

  private async getCount(endpoint: PlacesApiEndpoint): Promise<number> {
    const cached = this.cache.get(endpoint);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.count;

    const count = await this.getMonthToDateCallCount(endpoint);
    this.cache.set(endpoint, { count, expiresAt: now + CACHE_TTL_MS });
    return count;
  }
}

// Wraps another PlaceDetailsClient (normally the InstrumentedPlacesClient
// around LivePlacesClient -- see app.ts's getPlacesClient()) and checks the
// guard before getPlaceDetails/fetchPhotoMedia reach it, so a tripped
// guardrail never becomes an actual outbound Google call (and so never gets
// logged as one). Callers are expected to treat PlacesApiQuotaExceededError
// as a graceful "skip", not a real failure -- see
// enrichment/refresh.ts's getFreshEnrichment (falls back to cached data) and
// app.ts's GET /locations/:id/photo route (falls back to 404, same as "no
// photo cached").
export class QuotaGuardedPlacesClient implements PlaceDetailsClient {
  constructor(
    private readonly inner: PlaceDetailsClient,
    private readonly guard: PlacesApiQuotaGuard
  ) {}

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    if (await this.guard.isNearLimit("getPlaceDetails")) {
      throw new PlacesApiQuotaExceededError("getPlaceDetails");
    }
    return this.inner.getPlaceDetails(placeId);
  }

  async fetchPhotoMedia(photoReference: string): Promise<PhotoMedia> {
    if (await this.guard.isNearLimit("fetchPhotoMedia")) {
      throw new PlacesApiQuotaExceededError("fetchPhotoMedia");
    }
    return this.inner.fetchPhotoMedia(photoReference);
  }
}
