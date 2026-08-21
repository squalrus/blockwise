import { describe, expect, it } from "vitest";
import { InstrumentedPlacesClient } from "./instrumentedClient";
import type { GooglePlacesClient, PlaceDetailsClient, PlacesTextSearchClient, RawGooglePlace, RawPlaceDetails } from "./client";
import type { MonitoringRepository, PlacesApiCallEntry } from "../monitoring/repository";

class FakeInnerClient implements GooglePlacesClient, PlaceDetailsClient, PlacesTextSearchClient {
  async searchNearby(): Promise<RawGooglePlace[]> {
    return [];
  }
  async searchText(): Promise<RawGooglePlace[]> {
    return [];
  }
  async getPlaceDetails(): Promise<RawPlaceDetails> {
    throw new Error("Google Places getPlaceDetails failed: 500 boom");
  }
  async fetchPhotoMedia() {
    return { contentType: "image/png", data: new ArrayBuffer(0) };
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

    await client.searchNearby({ center: { lat: 47.6, lng: -122.3 }, radiusMeters: 500 });
    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.logged).toHaveLength(1);
    expect(repo.logged[0]).toMatchObject({ endpoint: "searchNearby", success: true });
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
    expect(repo.logged[0]).toMatchObject({ endpoint: "getPlaceDetails", success: false });
  });
});
