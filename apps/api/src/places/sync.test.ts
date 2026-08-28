import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryRecord } from "./categorize";
import type { GeoapifyPlace, GeoapifySearchParams } from "./geoapifyClient";
import { haversineMeters } from "./geo";
import { MockGeoapifyClient } from "./mockGeoapifyClient";
import type {
  ExistingVenue,
  NeighborhoodRecord,
  PlacesRepository,
  UpsertVenueInput,
} from "./repository";
import { syncNeighborhoodPlaces } from "./sync";

// Mirrors the polygon in supabase/seed.sql closely enough to include every
// in-boundary fixture in mockGeoapifyClient.ts and exclude "Outside The
// Boundary Cafe".
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
  { id: "coffee-shop", name: "Coffee Shop", source_mapping_json: { geoapify: ["catering.cafe.coffee_shop"] } },
  { id: "bakery", name: "Bakery", source_mapping_json: { geoapify: ["catering.cafe.bakery"] } },
  { id: "park", name: "Park & Playground", source_mapping_json: { geoapify: ["leisure.park", "leisure.playground"] } },
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
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);
    expect(report.skippedOutOfBoundary).toBe(1);
    expect(repository.upsertCalls.some((v) => v.name === "Outside The Boundary Cafe")).toBe(false);
  });

  it("dedups a near-duplicate place returned in the same batch", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);

    expect(report.inserted).toContain("Diesel Fuel Coffee");
    expect(report.skippedDuplicates).toContainEqual({
      candidate: "Diesel Fuel Coffee Shop",
      matchedExisting: "Diesel Fuel Coffee",
    });
    expect(repository.upsertCalls.filter((v) => v.name.startsWith("Diesel Fuel Coffee"))).toHaveLength(1);
  });

  it("flags a place with an unmapped Geoapify category instead of guessing", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);

    expect(report.unmappedTypes).toContainEqual({
      name: "Widget Electronics Repair",
      types: ["service.electronics_repair"],
    });
    const widgetUpsert = repository.upsertCalls.find((v) => v.name === "Widget Electronics Repair");
    expect(widgetUpsert?.categoryId).toBeNull();
  });

  it("categorizes a place whose Geoapify tag matches the taxonomy", async () => {
    await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);

    const coffee = repository.upsertCalls.find((v) => v.name === "Diesel Fuel Coffee");
    expect(coffee?.categoryId).toBe("coffee-shop");

    const bakery = repository.upsertCalls.find((v) => v.name === "Original Bakery");
    expect(bakery?.categoryId).toBe("bakery");

    const park = repository.upsertCalls.find((v) => v.name === "Mustard Seed Park");
    expect(park?.categoryId).toBe("park");
  });

  it("no OSM/Geoapify equivalent to businessStatus exists, so skippedClosedPermanently is always 0", async () => {
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);
    expect(report.skippedClosedPermanently).toBe(0);
  });

  it("updates an already-synced, unclaimed venue instead of skipping it", async () => {
    repository.venues = [
      {
        id: "existing-1",
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        name: "Herkimer Coffee (old name)",
        lat: 47.6816,
        lng: -122.3552,
        claimedByBusiness: false,
      },
    ];

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);

    expect(report.updated).toContain("Herkimer Coffee");
    expect(repository.upsertCalls.some((v) => v.geoapifyPlaceId === "geoapify-mock-herkimer-coffee")).toBe(true);
  });

  it("does not overwrite a claimed venue's data", async () => {
    repository.venues = [
      {
        id: "existing-2",
        geoapifyPlaceId: "geoapify-mock-original-bakery",
        name: "Original Bakery (business-submitted name)",
        lat: 47.6742,
        lng: -122.3555,
        claimedByBusiness: true,
      },
    ];

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new MockGeoapifyClient(), repository);

    expect(report.skippedClaimed).toContain("Original Bakery");
    expect(repository.upsertCalls.some((v) => v.geoapifyPlaceId === "geoapify-mock-original-bakery")).toBe(false);
  });

  it("merges places from different tiles rather than only using one call's worth", async () => {
    // A realistic fake: each tile only "sees" places within its own radius,
    // like Geoapify actually would. These two are ~2.9km apart -- too far
    // for any single circle covering both to stay within a small radius in
    // practice, so this only passes if the sync actually queries more than
    // one tile and merges the results.
    const north = { placeId: "north-cafe", location: { lat: 47.694, lng: -122.352 } };
    const south = { placeId: "south-bakery", location: { lat: 47.66, lng: -122.353 } };

    class PartitionedClient {
      calls: GeoapifySearchParams[] = [];

      async searchPlaces(params: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
        this.calls.push(params);
        return [north, south]
          .filter((p) => haversineMeters(params.center, p.location) <= params.radiusMeters)
          .map((p) => ({
            placeId: p.placeId,
            name: p.placeId,
            formattedAddress: "test address",
            location: p.location,
            categories: [],
          }));
      }
    }

    const client = new PartitionedClient();
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", client, repository);

    expect(client.calls.length).toBeGreaterThan(1);
    expect(report.tilesQueried).toBe(client.calls.length);
    expect(report.inserted).toEqual(expect.arrayContaining(["north-cafe", "south-bakery"]));
  });

  it("reports tiles that hit the Places API's per-call result cap, subdividing to retry each one", async () => {
    class SaturatedClient {
      calls = 0;

      async searchPlaces(): Promise<GeoapifyPlace[]> {
        this.calls++;
        // Outside the Phinneywood boundary so the per-place pipeline just
        // skips them -- only the raw tile response size matters here.
        return Array.from({ length: 500 }, (_, i) => ({
          placeId: `saturated-${i}`,
          name: `Saturated Place ${i}`,
          formattedAddress: "test address",
          location: { lat: 47.5, lng: -122.2 },
          categories: [],
        }));
      }
    }

    const client = new SaturatedClient();
    const report = await syncNeighborhoodPlaces("phinneywood-seattle", client, repository);

    // Every tile saturates every time (including retries), so subdivision
    // recurses to its depth limit -- apiCallsMade should reflect every one of
    // those calls, not just the initial top-level grid.
    expect(report.apiCallsMade).toBe(client.calls);
    expect(report.apiCallsMade).toBeGreaterThan(report.tilesQueried);
    expect(report.callsAtResultCap).toBe(report.apiCallsMade);
    expect(report.callsAtResultCap).toBeGreaterThan(0);
  });

  // Distinct-enough names (not just a shared prefix + counter) so tightly
  // packed synthetic fixture venues below don't trip dedup.ts's own
  // name-similarity check (>=0.6) at close range -- a real dense area's
  // venues have genuinely different names, which this mimics well enough
  // to isolate what this test actually checks (subdivision, not dedup).
  // Both words depend on *both* row and col (not one word per axis) so
  // even a same-row or same-col neighbor gets a fully different name, not
  // just one differing word next to an unchanged one -- verified empirically
  // (no adjacent-cell pair within the grid's spacing scores >=0.6 similarity).
  const WORD_A = [
    "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet",
    "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango",
    "Uniform", "Victor", "Whiskey", "Xray", "Yankee", "Zulu", "Amber", "Coral", "Ivory", "Jade",
    "Onyx", "Pearl", "Ruby", "Topaz", "Cedar", "Elm", "Maple", "Oak", "Pine", "Willow",
  ];
  const WORD_B = [
    "Market", "Grocers", "Bakery", "Diner", "Bistro", "Tavern", "Provisions", "Outfitters",
    "Emporium", "Depot", "Foundry", "Gallery", "Cellars", "Roasters", "Cafe", "Kitchen", "Parlor",
    "Workshop", "Studio", "Mercantile", "Apothecary", "Bookshop", "Cannery", "Distillery",
    "Farmstand", "Garage", "Hardware", "Ironworks", "Junkyard", "Kiosk", "Laundry", "Motel",
    "Newsstand", "Outpost", "Pharmacy", "Quikstop", "Repair", "Salvage", "Trading", "Union",
  ];
  function gridName(row: number, col: number): string {
    const a = WORD_A[(row * 7 + col * 3) % WORD_A.length];
    const b = WORD_B[(row * 11 + col * 17) % WORD_B.length];
    return `${a} ${b}`;
  }

  it("catches venues past the cap in a dense tile by subdividing", async () => {
    // 528 real, distinct venues in a grid centered on the neighborhood
    // center, spread widely enough (~270m radius) that a single 400m-radius
    // tile sees all of them (saturating past the 500-result cap) but each
    // of subdivideCircle's 4 sub-circles only sees roughly a quarter --
    // comfortably under the cap, so the retry recovers the full set rather
    // than truncating again.
    const rows = 24;
    const cols = 22;
    const densePlaces: GeoapifyPlace[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        densePlaces.push({
          placeId: `dense-${i}`,
          name: gridName(row, col),
          formattedAddress: "test address",
          location: {
            lat: 47.6686 + (row - rows / 2) * 0.00015,
            lng: -122.355 + (col - cols / 2) * 0.00015,
          },
          categories: [],
        });
      }
    }

    class DenseClient {
      async searchPlaces(params: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
        const inRange = densePlaces.filter((p) => haversineMeters(params.center, p.location) <= params.radiusMeters);
        return inRange.slice(0, 500);
      }
    }

    const report = await syncNeighborhoodPlaces("phinneywood-seattle", new DenseClient(), repository);

    expect(report.skippedDuplicates).toHaveLength(0);
    expect(report.inserted.length).toBe(densePlaces.length);
  });

  // Geoapify's Places API requires a non-empty `categories` filter, so every
  // configured taxonomy tag is sent in one request per tile (deduped), not
  // chunked across multiple calls the way Google's old 50-type cap forced --
  // one call per tile regardless of how large the taxonomy grows.
  it("makes exactly one call per tile, regardless of taxonomy size", async () => {
    const manyCategories: CategoryRecord[] = Array.from({ length: 120 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i}`,
      source_mapping_json: { geoapify: [`geoapify_type_${i}`] },
    }));

    class CountingRepository extends FakePlacesRepository {
      async listCategories(): Promise<CategoryRecord[]> {
        return manyCategories;
      }
    }

    const countingRepository = new CountingRepository();
    const report = await syncNeighborhoodPlaces(
      "phinneywood-seattle",
      new MockGeoapifyClient(),
      countingRepository
    );

    expect(report.apiCallsMade).toBe(report.tilesQueried);
  });

  it("throws a clear error when the neighborhood has no boundary set", async () => {
    class NoBoundaryRepository extends FakePlacesRepository {
      async getNeighborhoodBySlug(): Promise<NeighborhoodRecord | null> {
        return { id: "x", centerLat: 0, centerLng: 0, boundaryGeojson: null };
      }
    }

    await expect(
      syncNeighborhoodPlaces("no-boundary", new MockGeoapifyClient(), new NoBoundaryRepository())
    ).rejects.toThrow(/no boundary_geojson set/);
  });
});
