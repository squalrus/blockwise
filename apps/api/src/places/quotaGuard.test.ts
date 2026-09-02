import { describe, expect, it, vi } from "vitest";
import { PlacesApiQuotaExceededError, PlacesApiQuotaGuard, QuotaGuardedPlacesClient } from "./quotaGuard";
import type { GeoapifyPlaceDetails, GeoapifyPlaceDetailsClient } from "./geoapifyClient";
import type { MonitoringPlacesApiDayToDate } from "@blockwise/types";

class FakeInnerClient implements GeoapifyPlaceDetailsClient {
  calls: string[] = [];

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    this.calls.push(placeId);
    return { placeId, name: null, formattedAddress: "", categories: [] };
  }
}

function counts(rows: MonitoringPlacesApiDayToDate[]): () => Promise<MonitoringPlacesApiDayToDate[]> {
  return async () => rows;
}

describe("PlacesApiQuotaGuard", () => {
  it("is not near the limit well under the shared daily free tier", async () => {
    const guard = new PlacesApiQuotaGuard(counts([{ endpoint: "getPlaceDetails", count: 10 }]));
    // GEOAPIFY_FREE_DAILY_CREDITS is 3,000/day; 10 credits is nowhere close.
    expect(await guard.isNearLimit()).toBe(false);
  });

  it("trips at the 90% near-limit threshold, not just at 100%", async () => {
    const guard = new PlacesApiQuotaGuard(counts([{ endpoint: "getPlaceDetails", count: 2700 }])); // 90% of 3,000
    expect(await guard.isNearLimit()).toBe(true);
  });

  it("caches the total so repeated checks don't re-query", async () => {
    const getDayToDateCallCounts = vi.fn().mockResolvedValue([{ endpoint: "getPlaceDetails", count: 10 }]);
    const guard = new PlacesApiQuotaGuard(getDayToDateCallCounts);

    await guard.isNearLimit();
    await guard.isNearLimit();

    expect(getDayToDateCallCounts).toHaveBeenCalledTimes(1);
  });

  it("sums credits across every endpoint toward the shared pool, not just one", async () => {
    // Neither endpoint alone reaches 2,700, but their combined credit usage does --
    // Geoapify meters one shared daily pool, not a separate tier per endpoint.
    const guard = new PlacesApiQuotaGuard(
      counts([
        { endpoint: "searchPlaces", count: 1500 },
        { endpoint: "getPlaceDetails", count: 1500 },
      ])
    );
    expect(await guard.isNearLimit()).toBe(true);
  });
});

describe("QuotaGuardedPlacesClient", () => {
  it("passes calls through when under the limit", async () => {
    const inner = new FakeInnerClient();
    const guard = new PlacesApiQuotaGuard(counts([]));
    const client = new QuotaGuardedPlacesClient(inner, guard);

    await client.getPlaceDetails("place-1");

    expect(inner.calls).toEqual(["place-1"]);
  });

  it("throws PlacesApiQuotaExceededError instead of calling through when near the limit", async () => {
    const inner = new FakeInnerClient();
    const guard = new PlacesApiQuotaGuard(counts([{ endpoint: "getPlaceDetails", count: 3000 }])); // at the free tier
    const client = new QuotaGuardedPlacesClient(inner, guard);

    await expect(client.getPlaceDetails("place-1")).rejects.toThrow(PlacesApiQuotaExceededError);
    expect(inner.calls).toEqual([]);
  });
});
