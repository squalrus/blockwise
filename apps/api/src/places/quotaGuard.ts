import {
  GEOAPIFY_FREE_DAILY_CREDITS,
  PLACES_API_CREDIT_COST,
  PLACES_API_NEAR_LIMIT_THRESHOLD,
  type MonitoringPlacesApiDayToDate,
  type PlacesApiEndpoint,
} from "@blockwise/types";
import type { GeoapifyPlaceDetails, GeoapifyPlaceDetailsClient } from "./geoapifyClient";

export class PlacesApiQuotaExceededError extends Error {
  constructor(public readonly endpoint: PlacesApiEndpoint) {
    super(`Places API daily free-credit guardrail tripped for ${endpoint}`);
    this.name = "PlacesApiQuotaExceededError";
  }
}

// Cache TTL for the day-to-date credit total -- getPlaceDetails fires on
// ordinary visitor page views (enrichment refresh), so checking the guard
// can't cost a DB round trip on every single request. A few minutes of
// staleness just means the guard trips a handful of calls late near the
// boundary, which is fine for a cost guardrail.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Guards the one non-critical, high-frequency Places API endpoint
// (getPlaceDetails -- see QuotaGuardedPlacesClient below) against runaway
// cost: once today's total credit usage across *every* endpoint nears
// Geoapify's shared daily free tier (GEOAPIFY_FREE_DAILY_CREDITS), further
// getPlaceDetails calls are refused rather than spending real money on a
// feature that degrades gracefully without it. Unlike Google's old
// per-endpoint monthly free tiers, Geoapify meters one shared daily credit
// pool across the whole account, so the check has to sum every endpoint's
// weighted usage, not just getPlaceDetails' own count in isolation.
// searchPlaces/searchText/reverseGeocode still aren't gated here -- all
// three are admin-triggered (neighborhood sync, boundary preview,
// investigate-missing-venue), bounded by an admin actually clicking
// something rather than by page-view volume -- but their credit usage still
// counts toward the shared total this guard checks.
export class PlacesApiQuotaGuard {
  private cached: { totalCredits: number; expiresAt: number } | undefined;

  constructor(private readonly getDayToDateCallCounts: () => Promise<MonitoringPlacesApiDayToDate[]>) {}

  async isNearLimit(): Promise<boolean> {
    const totalCredits = await this.getTotalCredits();
    return totalCredits >= GEOAPIFY_FREE_DAILY_CREDITS * PLACES_API_NEAR_LIMIT_THRESHOLD;
  }

  private async getTotalCredits(): Promise<number> {
    const cached = this.cached;
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.totalCredits;

    const counts = await this.getDayToDateCallCounts();
    const totalCredits = counts.reduce(
      (sum, { endpoint, count }) => sum + count * PLACES_API_CREDIT_COST[endpoint].creditsPerRequest,
      0
    );
    this.cached = { totalCredits, expiresAt: now + CACHE_TTL_MS };
    return totalCredits;
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
    if (await this.guard.isNearLimit()) {
      throw new PlacesApiQuotaExceededError("getPlaceDetails");
    }
    return this.inner.getPlaceDetails(placeId);
  }
}
