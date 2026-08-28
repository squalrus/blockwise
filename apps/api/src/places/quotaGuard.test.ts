import { describe, expect, it, vi } from "vitest";
import { PlacesApiQuotaExceededError, PlacesApiQuotaGuard, QuotaGuardedPlacesClient } from "./quotaGuard";
import type { GeoapifyPlaceDetails, GeoapifyPlaceDetailsClient } from "./geoapifyClient";

class FakeInnerClient implements GeoapifyPlaceDetailsClient {
  calls: string[] = [];

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    this.calls.push(placeId);
    return { placeId, name: null, formattedAddress: "", categories: [] };
  }
}

describe("PlacesApiQuotaGuard", () => {
  it("is not near the limit well under the free tier", async () => {
    const guard = new PlacesApiQuotaGuard(async () => 10);
    // getPlaceDetails' free tier is 1,000/month (PLACES_API_PRICING).
    expect(await guard.isNearLimit("getPlaceDetails")).toBe(false);
  });

  it("trips at the 90% near-limit threshold, not just at 100%", async () => {
    const guard = new PlacesApiQuotaGuard(async () => 900); // 90% of getPlaceDetails' 1,000 free tier
    expect(await guard.isNearLimit("getPlaceDetails")).toBe(true);
  });

  it("caches the count so repeated checks don't re-query", async () => {
    const getMonthToDateCallCount = vi.fn().mockResolvedValue(10);
    const guard = new PlacesApiQuotaGuard(getMonthToDateCallCount);

    await guard.isNearLimit("getPlaceDetails");
    await guard.isNearLimit("getPlaceDetails");

    expect(getMonthToDateCallCount).toHaveBeenCalledTimes(1);
  });

  it("checks each endpoint's count independently", async () => {
    const getMonthToDateCallCount = vi.fn().mockImplementation(async (endpoint: string) =>
      endpoint === "getPlaceDetails" ? 950 : 10
    );
    const guard = new PlacesApiQuotaGuard(getMonthToDateCallCount);

    expect(await guard.isNearLimit("getPlaceDetails")).toBe(true);
    expect(await guard.isNearLimit("searchPlaces")).toBe(false);
  });
});

describe("QuotaGuardedPlacesClient", () => {
  it("passes calls through when under the limit", async () => {
    const inner = new FakeInnerClient();
    const guard = new PlacesApiQuotaGuard(async () => 0);
    const client = new QuotaGuardedPlacesClient(inner, guard);

    await client.getPlaceDetails("place-1");

    expect(inner.calls).toEqual(["place-1"]);
  });

  it("throws PlacesApiQuotaExceededError instead of calling through when near the limit", async () => {
    const inner = new FakeInnerClient();
    const guard = new PlacesApiQuotaGuard(async () => 1000); // at getPlaceDetails' free tier
    const client = new QuotaGuardedPlacesClient(inner, guard);

    await expect(client.getPlaceDetails("place-1")).rejects.toThrow(PlacesApiQuotaExceededError);
    expect(inner.calls).toEqual([]);
  });
});
