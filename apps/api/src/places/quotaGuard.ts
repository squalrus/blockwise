import { PLACES_API_NEAR_LIMIT_THRESHOLD, PLACES_API_PRICING, type PlacesApiEndpoint } from "@blockwise/types";
import type { GeoapifyPlaceDetails, GeoapifyPlaceDetailsClient } from "./geoapifyClient";

export class PlacesApiQuotaExceededError extends Error {
  constructor(public readonly endpoint: PlacesApiEndpoint) {
    super(`Places API monthly free-tier guardrail tripped for ${endpoint}`);
    this.name = "PlacesApiQuotaExceededError";
  }
}

// Cache TTL for the month-to-date count -- getPlaceDetails fires on ordinary
// visitor page views (enrichment refresh), so checking the guard can't cost
// a DB round trip on every single request. A few minutes of staleness just
// means the guard trips a handful of calls late near the boundary, which is
// fine for a cost guardrail.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Guards the one non-critical, high-frequency Places API endpoint
// (getPlaceDetails -- see QuotaGuardedPlacesClient below) against runaway
// cost: once this billing month's successful call count for an endpoint
// nears its free tier (PLACES_API_PRICING), further calls are refused
// rather than spending real money on a feature that degrades gracefully
// without it. "This month" is computed by getMonthToDateCallCount
// (SupabaseMonitoringRepository) rather than here, so it doesn't need its
// own PST/PDT-aware date math (still keyed to Google's old billing-month
// boundary function -- see that repository's comment; Phase 7 revisits this
// for Geoapify's daily-credit model). searchPlaces/searchText aren't
// guarded here -- both are admin-triggered (neighborhood sync, boundary
// preview, investigate-missing-venue), bounded by an admin actually
// clicking something rather than by page-view volume.
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

// Wraps another GeoapifyPlaceDetailsClient (normally the
// InstrumentedPlacesClient around LiveGeoapifyClient -- see app.ts's
// getPlacesClient()) and checks the guard before getPlaceDetails reaches
// it, so a tripped guardrail never becomes an actual outbound Geoapify call
// (and so never gets logged as one). Callers are expected to treat
// PlacesApiQuotaExceededError as a graceful "skip", not a real failure --
// see enrichment/refresh.ts's getFreshEnrichment (falls back to cached data).
export class QuotaGuardedPlacesClient implements GeoapifyPlaceDetailsClient {
  constructor(
    private readonly inner: GeoapifyPlaceDetailsClient,
    private readonly guard: PlacesApiQuotaGuard
  ) {}

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    if (await this.guard.isNearLimit("getPlaceDetails")) {
      throw new PlacesApiQuotaExceededError("getPlaceDetails");
    }
    return this.inner.getPlaceDetails(placeId);
  }
}
