import { describe, expect, it } from "vitest";
import { InstrumentedPlacesClient } from "./instrumentedClient";
import type {
  GeoapifyPlace,
  GeoapifyPlaceDetails,
  GeoapifyPlaceDetailsClient,
  GeoapifyPlacesClient,
  GeoapifyTextSearchClient,
} from "./geoapifyClient";
import type { MonitoringRepository, PlacesApiCallEntry } from "../monitoring/repository";

const PLACE_STUB: GeoapifyPlace = {
  placeId: "p1",
  name: "Test Place",
  formattedAddress: "",
  location: { lat: 0, lng: 0 },
  categories: [],
};

class FakeInnerClient implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient, GeoapifyTextSearchClient {
  async searchPlaces(): Promise<GeoapifyPlace[]> {
    return [PLACE_STUB, PLACE_STUB, PLACE_STUB];
  }
  async searchText(): Promise<GeoapifyPlace[]> {
    return [];
  }
  async getPlaceDetails(): Promise<GeoapifyPlaceDetails> {
    throw new Error("Geoapify getPlaceDetails failed: 500 boom");
  }
}

class FakeMonitoringRepository implements Pick<MonitoringRepository, "logPlacesApiCall"> {
  logged: PlacesApiCallEntry[] = [];
  async logPlacesApiCall(entry: PlacesApiCallEntry): Promise<void> {
    this.logged.push(entry);
  }
}

describe("InstrumentedPlacesClient", () => {
  it("logs a successful call", async () => {
    const repo = new FakeMonitoringRepository();
    const client = new InstrumentedPlacesClient(
      new FakeInnerClient(),
      () => repo as unknown as MonitoringRepository
    );

    await client.searchPlaces({ center: { lat: 47.6, lng: -122.3 }, radiusMeters: 500, categories: ["catering.cafe"] });
    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.logged).toHaveLength(1);
    expect(repo.logged[0]).toMatchObject({
      endpoint: "searchPlaces",
      success: true,
      requestContext: "center: 47.6000,-122.3000 · radius: 500m · 1 categories",
      resultCount: 3,
    });
  });

  it("logs the actual result count for getPlaceDetails as 1, not the underlying array shape", async () => {
    const repo = new FakeMonitoringRepository();
    const inner: GeoapifyPlaceDetailsClient = {
      getPlaceDetails: async () => ({ placeId: "p1", name: null, formattedAddress: "", categories: [] }),
    };
    const client = new InstrumentedPlacesClient(
      inner as GeoapifyPlacesClient & GeoapifyPlaceDetailsClient & GeoapifyTextSearchClient,
      () => repo as unknown as MonitoringRepository
    );

    await client.getPlaceDetails("place-1");
    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.logged[0]).toMatchObject({ endpoint: "getPlaceDetails", success: true, resultCount: 1 });
  });

  it("logs a failed call and still rethrows the underlying error", async () => {
    const repo = new FakeMonitoringRepository();
    const client = new InstrumentedPlacesClient(
      new FakeInnerClient(),
      () => repo as unknown as MonitoringRepository
    );

    await expect(client.getPlaceDetails("place-1")).rejects.toThrow("boom");
    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.logged).toHaveLength(1);
    expect(repo.logged[0]).toMatchObject({
      endpoint: "getPlaceDetails",
      success: false,
      errorMessage: "Geoapify getPlaceDetails failed: 500 boom",
      requestContext: "placeId: place-1",
      resultCount: null,
    });
  });
});
