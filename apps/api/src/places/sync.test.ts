import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryRecord } from "./categorize";
import type { GooglePlacesClient, RawGooglePlace, SearchNearbyParams } from "./client";
import { haversineMeters } from "./geo";
import { MockPlacesClient } from "./mockClient";
import type {
  ExistingVenue,
  NeighborhoodRecord,
  PlacesRepository,
  UpsertVenueInput,
} from "./repository";
import { syncNeighborhoodPlaces } from "./sync";

// Mirrors the polygon in supabase/seed.sql closely enough to include every
// in-boundary fixture in mockClient.ts and exclude "Outside The Boundary Cafe".
const PHINNEYWOOD_BOUNDARY: NeighborhoodRecord["boundaryGeojson"] = {
  type: "Polygon",
  coordinates: [
    [
      [-122.3605, 47.696],
      [-122.348, 47.696],
      [-122.346, 47.675],
      [-122.348, 47.658],
      [-122.356, 47.656],
      [-122.362, 47.665],
      [-122.362, 47.685],
      [-122.3605, 47.696],
    ],
  ],
};

const CATEGORIES: CategoryRecord[] = [
  { id: "coffee-shop", name: "Coffee Shop", source_mapping_json: { google: ["cafe", "coffee_shop"] } },
  { id: "bakery", name: "Bakery", source_mapping_json: { google: ["bakery"] } },
  { id: "park", name: "Park & Playground", source_mapping_json: { google: ["park", "playground"] } },
];

class FakePlacesRepository implements PlacesRepository {
  venues: ExistingVenue[];
  upsertCalls: UpsertVenueInput[] = [];

  constructor(initialVenues: ExistingVenue[] = []) {
    this.venues = initialVenues;
  }

  async getNeighborhoodBySlug(): Promise<NeighborhoodRecord | null> {
    return {
      id: "phinneywood-id",
      centerLat: 47.6686,
      centerLng: -122.355,
      boundaryGeojson: PHINNEYWOOD_BOUNDARY,
    };
  }

  async listCategories(): Promise<CategoryRecord[]> {
    return CATEGORIES;
  }

  async listVenuesByNeighborhood(): Promise<ExistingVenue[]> {
    return this.venues;
  }

  async upsertVenue(venue: UpsertVenueInput): Promise<void> {
    this.upsertCalls.push(venue);
  }
}

describe("syncNeighborhoodPlaces", () => {
  let repository: FakePlacesRepository;

  beforeEach(() => {
    repository = new FakePlacesRepository();
  });

  it("filters out-of-boundary places", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);
    expect(report.skippedOutOfBoundary).toBe(1);
    expect(repository.upsertCalls.some((v) => v.name === "Outside The Boundary Cafe")).toBe(false);
  });

  it("dedups a near-duplicate place returned in the same batch", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);

    expect(report.inserted).toContain("Diesel Fuel Coffee");
    expect(report.skippedDuplicates).toContainEqual({
      candidate: "Diesel Fuel Coffee Shop",
      matchedExisting: "Diesel Fuel Coffee",
    });
    expect(repository.upsertCalls.filter((v) => v.name.startsWith("Diesel Fuel Coffee"))).toHaveLength(1);
  });

  it("flags a place with an unmapped Google type instead of guessing a category", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);

    expect(report.unmappedTypes).toContainEqual({
      name: "Widget Electronics Repair",
      types: ["electronics_repair"],
    });
    const widgetUpsert = repository.upsertCalls.find((v) => v.name === "Widget Electronics Repair");
    expect(widgetUpsert?.categoryId).toBeNull();
  });

  it("assigns the matched category to a mapped place", async () => {
    await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);

    const bakery = repository.upsertCalls.find((v) => v.name === "Original Bakery");
    expect(bakery?.categoryId).toBe("bakery");
  });

  it("updates an already-synced, unclaimed venue instead of skipping it", async () => {
    repository.venues = [
      {
        id: "existing-1",
        googlePlaceId: "mock-herkimer-coffee",
        name: "Herkimer Coffee (old name)",
        lat: 47.6816,
        lng: -122.3552,
        claimedByBusiness: false,
      },
    ];

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);

    expect(report.updated).toContain("Herkimer Coffee");
    expect(repository.upsertCalls.some((v) => v.googlePlaceId === "mock-herkimer-coffee")).toBe(true);
  });

  it("does not overwrite a claimed venue's data", async () => {
    repository.venues = [
      {
        id: "existing-2",
        googlePlaceId: "mock-original-bakery",
        name: "Original Bakery (business-submitted name)",
        lat: 47.6742,
        lng: -122.3555,
        claimedByBusiness: true,
      },
    ];

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockPlacesClient(), repository);

    expect(report.skippedClaimed).toContain("Original Bakery");
    expect(repository.upsertCalls.some((v) => v.googlePlaceId === "mock-original-bakery")).toBe(false);
  });

  it("merges places from different tiles rather than only using one call's worth", async () => {
    // A realistic fake: each tile only "sees" places within its own radius,
    // like Google actually would. These two are ~2.9km apart -- too far
    // for any single circle covering both to stay under the result cap in
    // practice, so this only passes if the sync actually queries more than
    // one tile and merges the results.
    const north = { id: "north-cafe", location: { lat: 47.694, lng: -122.352 } };
    const south = { id: "south-bakery", location: { lat: 47.66, lng: -122.353 } };

    class PartitionedClient implements GooglePlacesClient {
      calls: SearchNearbyParams[] = [];

      async searchNearby(params: SearchNearbyParams): Promise<RawGooglePlace[]> {
        this.calls.push(params);
        return [north, south]
          .filter((p) => haversineMeters(params.center, p.location) <= params.radiusMeters)
          .map((p) => ({
            id: p.id,
            displayName: { text: p.id },
            formattedAddress: "test address",
            location: { latitude: p.location.lat, longitude: p.location.lng },
            types: ["cafe"],
            businessStatus: "OPERATIONAL",
          }));
      }
    }

    const client = new PartitionedClient();
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", client, repository);

    expect(client.calls.length).toBeGreaterThan(1);
    expect(report.tilesQueried).toBe(client.calls.length);
    expect(report.inserted).toEqual(expect.arrayContaining(["north-cafe", "south-bakery"]));
  });

  it("reports tiles that hit the Places API's per-call result cap", async () => {
    class SaturatedClient implements GooglePlacesClient {
      async searchNearby(): Promise<RawGooglePlace[]> {
        // Outside the Phinneywood boundary so the per-place pipeline just
        // skips them -- only the raw tile response size matters here.
        return Array.from({ length: 20 }, (_, i) => ({
          id: `saturated-${i}`,
          displayName: { text: `Saturated Place ${i}` },
          formattedAddress: "test address",
          location: { latitude: 47.5, longitude: -122.2 },
          types: ["cafe"],
          businessStatus: "OPERATIONAL" as const,
        }));
      }
    }

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new SaturatedClient(), repository);

    // The test taxonomy has only 3 google types, well under the 50-per-call
    // chunk limit, so exactly one API call happens per tile here.
    expect(report.apiCallsMade).toBe(report.tilesQueried);
    expect(report.callsAtResultCap).toBe(report.apiCallsMade);
    expect(report.callsAtResultCap).toBeGreaterThan(0);
  });

  it("chunks includedTypes across multiple calls when the taxonomy exceeds the per-call limit", async () => {
    const manyCategories: CategoryRecord[] = Array.from({ length: 120 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i}`,
      source_mapping_json: { google: [`google_type_${i}`] },
    }));

    class CountingRepository extends FakePlacesRepository {
      async listCategories(): Promise<CategoryRecord[]> {
        return manyCategories;
      }
    }

    const countingRepository = new CountingRepository();
    const report = await syncNeighborhoodPlaces(
      "phinneywood-seattle",
      new MockPlacesClient(),
      countingRepository
    );

    // 120 types over a 50-per-call limit needs 3 chunks per tile.
    expect(report.apiCallsMade).toBe(report.tilesQueried * 3);
  });

  it("throws a clear error when the neighborhood has no boundary set", async () => {
    class NoBoundaryRepository extends FakePlacesRepository {
      async getNeighborhoodBySlug(): Promise<NeighborhoodRecord | null> {
        return { id: "x", centerLat: 0, centerLng: 0, boundaryGeojson: null };
      }
    }

    await expect(
      syncNeighborhoodPlaces("no-boundary", new MockPlacesClient(), new NoBoundaryRepository())
    ).rejects.toThrow(/no boundary_geojson set/);
  });
});
