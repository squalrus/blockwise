import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryMappingRepository, CategoryRecord as CategoryMappingCategoryRecord, VenueCategoryRecord } from "../categoryMapping/repository";
import type { CategoryRecord } from "../places/categorize";
import { MockPlacesClient } from "../places/mockClient";
import type { ExistingVenue, NeighborhoodRecord, PlacesRepository, UpsertVenueInput } from "../places/repository";
import type {
  CreateNeighborhoodPoiInput,
  PoiRecord,
  PoiRepository,
  UpdatePoiInput,
} from "../pois/repository";
import { commitLocationReview, reviewNeighborhoodLocations } from "./review";

// Mirrors places/sync.test.ts's boundary fixture -- includes every
// in-boundary place in mockClient.ts, excludes "Outside The Boundary Cafe".
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
    return { id: "phinneywood-id", centerLat: 47.6686, centerLng: -122.355, boundaryGeojson: PHINNEYWOOD_BOUNDARY };
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

class FakePoiRepository implements PoiRepository {
  pois: PoiRecord[] = [];
  private nextId = 1;

  async createPoiForNeighborhood(input: CreateNeighborhoodPoiInput): Promise<PoiRecord> {
    const record: PoiRecord = {
      id: `poi-${this.nextId++}`,
      neighborhoodId: input.neighborhoodId,
      name: input.name,
      description: input.description,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      googlePlaceId: input.googlePlaceId,
      address: input.address,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    this.pois.push(record);
    return record;
  }

  async listPoisForNeighborhood(): Promise<PoiRecord[]> {
    return this.pois;
  }

  async getPoiById(poiId: string): Promise<PoiRecord | null> {
    return this.pois.find((p) => p.id === poiId) ?? null;
  }

  async getPoiNeighborhoodId(poiId: string): Promise<string | null> {
    return this.pois.find((p) => p.id === poiId)?.neighborhoodId ?? null;
  }

  async updatePoi(poiId: string, input: UpdatePoiInput): Promise<PoiRecord> {
    const poi = this.pois.find((p) => p.id === poiId)!;
    Object.assign(poi, input);
    return poi;
  }

  async setPoiStatus(poiId: string, status: PoiRecord["status"]): Promise<PoiRecord> {
    const poi = this.pois.find((p) => p.id === poiId)!;
    poi.status = status;
    return poi;
  }

  async hasDependentActivity(): Promise<boolean> {
    return false;
  }

  async deletePoi(poiId: string): Promise<void> {
    this.pois = this.pois.filter((p) => p.id !== poiId);
  }
}

// Minimal fake -- reviewNeighborhoodLocations/commitLocationReview only use
// listVenuesForNeighborhood, getVenueNeighborhoodId (via
// updateVenueStatusForNeighborhood), and setVenueStatus; the
// category-reassignment methods aren't exercised by anything in this file.
class FakeCategoryMappingRepository implements CategoryMappingRepository {
  venues: VenueCategoryRecord[] = [];

  async listVenuesForNeighborhood(): Promise<VenueCategoryRecord[]> {
    return this.venues;
  }

  async getVenueNeighborhoodId(venueId: string): Promise<string | null> {
    return this.venues.some((v) => v.id === venueId) ? "phinneywood-id" : null;
  }

  async listCategories(): Promise<CategoryMappingCategoryRecord[]> {
    return [];
  }

  async getVenue(venueId: string): Promise<{ id: string } | null> {
    const venue = this.venues.find((v) => v.id === venueId);
    return venue ? { id: venue.id } : null;
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    return { id: categoryId };
  }

  async updateVenueCategory(venueId: string, categoryId: string): Promise<VenueCategoryRecord> {
    const venue = this.venues.find((v) => v.id === venueId)!;
    venue.categoryId = categoryId;
    return venue;
  }

  async setVenueStatus(venueId: string, status: VenueCategoryRecord["status"]): Promise<VenueCategoryRecord> {
    const venue = this.venues.find((v) => v.id === venueId)!;
    venue.status = status;
    return venue;
  }
}

describe("reviewNeighborhoodLocations", () => {
  let placesRepository: FakePlacesRepository;
  let poiRepository: FakePoiRepository;
  let categoryMappingRepository: FakeCategoryMappingRepository;

  beforeEach(() => {
    placesRepository = new FakePlacesRepository();
    poiRepository = new FakePoiRepository();
    categoryMappingRepository = new FakeCategoryMappingRepository();
  });

  it("surfaces every in-boundary place as a new candidate when nothing exists yet", async () => {
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    // 7 fixtures, one out-of-boundary, one near-duplicate pair collapsed to one.
    expect(report.newCandidates.map((c) => c.name)).toEqual(
      expect.arrayContaining(["Diesel Fuel Coffee", "Herkimer Coffee", "Original Bakery", "Mustard Seed Park"])
    );
    expect(report.newCandidates.some((c) => c.name === "Outside The Boundary Cafe")).toBe(false);
    expect(report.newCandidates.filter((c) => c.name.startsWith("Diesel Fuel Coffee"))).toHaveLength(1);
  });

  it("suggests the sync pipeline's own category match", async () => {
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    const bakery = report.newCandidates.find((c) => c.name === "Original Bakery");
    expect(bakery?.suggestedCategoryId).toBe("bakery");

    const widget = report.newCandidates.find((c) => c.name === "Widget Electronics Repair");
    expect(widget?.suggestedCategoryId).toBeNull();
  });

  it("excludes a place already synced as a venue, matched by google_place_id", async () => {
    placesRepository.venues = [
      {
        id: "existing-1",
        googlePlaceId: "mock-herkimer-coffee",
        name: "Herkimer Coffee",
        lat: 47.6816,
        lng: -122.3552,
        claimedByBusiness: false,
      },
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
  });

  it("excludes a place already converted to a POI, matched by google_place_id", async () => {
    await poiRepository.createPoiForNeighborhood({
      neighborhoodId: "phinneywood-id",
      name: "Mustard Seed Park",
      description: null,
      type: "park",
      lat: 47.685,
      lng: -122.3495,
      googlePlaceId: "mock-mustard-seed-park",
      address: "N 80th St & Fremont Ave N, Seattle, WA",
    });

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Mustard Seed Park")).toBe(false);
  });

  it("excludes a near-duplicate match against an existing venue with no matching place id", async () => {
    placesRepository.venues = [
      {
        id: "existing-2",
        googlePlaceId: null,
        name: "Herkimer Coffee Shop",
        lat: 47.6816,
        lng: -122.3552,
        claimedByBusiness: false,
      },
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
  });

  it("skips POIs with null lat/lng when deduping (BACKLOG.md Ref 51)", async () => {
    await poiRepository.createPoiForNeighborhood({
      neighborhoodId: "phinneywood-id",
      name: "Woodland Park",
      description: null,
      type: "park",
      // @ts-expect-error -- exercising the legacy null-coordinate row.
      lat: null,
      // @ts-expect-error -- exercising the legacy null-coordinate row.
      lng: null,
      googlePlaceId: null,
      address: null,
    });

    // Should not throw despite the null-coordinate POI in the dedup list.
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );
    expect(report.newCandidates.length).toBeGreaterThan(0);
  });

  it("flags an active venue outside the current boundary as a proposed removal", async () => {
    categoryMappingRepository.venues = [
      {
        id: "venue-outside",
        name: "Outside The Boundary Cafe",
        address: "Capitol Hill, Seattle, WA",
        categoryId: null,
        categoryName: null,
        categoryGroup: null,
        status: "active",
        lat: 47.6,
        lng: -122.3,
        googlePlaceId: null,
        claimedByBusiness: false,
      },
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      kind: "venue",
      id: "venue-outside",
      name: "Outside The Boundary Cafe",
      address: "Capitol Hill, Seattle, WA",
    });
  });

  it("does not flag an already-hidden venue outside the boundary", async () => {
    categoryMappingRepository.venues = [
      {
        id: "venue-outside-hidden",
        name: "Already Hidden Cafe",
        address: "Capitol Hill, Seattle, WA",
        categoryId: null,
        categoryName: null,
        categoryGroup: null,
        status: "hidden",
        lat: 47.6,
        lng: -122.3,
        googlePlaceId: null,
        claimedByBusiness: false,
      },
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.proposedRemovals.some((r) => r.id === "venue-outside-hidden")).toBe(false);
  });

  it("does not flag an active venue still inside the boundary", async () => {
    categoryMappingRepository.venues = [
      {
        id: "venue-inside",
        name: "Herkimer Coffee",
        address: "7320 Greenwood Ave N, Seattle, WA",
        categoryId: null,
        categoryName: null,
        categoryGroup: null,
        status: "active",
        lat: 47.6816,
        lng: -122.3552,
        googlePlaceId: "mock-herkimer-coffee",
        claimedByBusiness: false,
      },
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.proposedRemovals).toHaveLength(0);
  });

  it("flags an active POI outside the current boundary as a proposed removal", async () => {
    const poi = await poiRepository.createPoiForNeighborhood({
      neighborhoodId: "phinneywood-id",
      name: "Faraway Park",
      description: null,
      type: "park",
      lat: 47.6,
      lng: -122.3,
      googlePlaceId: null,
      address: null,
    });

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      kind: "poi",
      id: poi.id,
      name: "Faraway Park",
      address: null,
    });
  });

  it("skips a null-coordinate POI from the removal check (BACKLOG.md Ref 51)", async () => {
    await poiRepository.createPoiForNeighborhood({
      neighborhoodId: "phinneywood-id",
      name: "Woodland Park",
      description: null,
      type: "park",
      // @ts-expect-error -- exercising the legacy null-coordinate row.
      lat: null,
      // @ts-expect-error -- exercising the legacy null-coordinate row.
      lng: null,
      googlePlaceId: null,
      address: null,
    });

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(report.proposedRemovals.some((r) => r.name === "Woodland Park")).toBe(false);
  });
});

describe("commitLocationReview", () => {
  let placesRepository: FakePlacesRepository;
  let poiRepository: FakePoiRepository;
  let categoryMappingRepository: FakeCategoryMappingRepository;

  beforeEach(() => {
    placesRepository = new FakePlacesRepository();
    poiRepository = new FakePoiRepository();
    categoryMappingRepository = new FakeCategoryMappingRepository();
  });

  const candidate = {
    googlePlaceId: "mock-herkimer-coffee",
    name: "Herkimer Coffee",
    lat: 47.6816,
    lng: -122.3552,
    address: "7320 Greenwood Ave N, Seattle, WA",
  };

  it("creates a venue for a business classification", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [{ ...candidate, classification: "business", categoryId: "coffee-shop" }],
      [],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.createdBusinesses).toEqual(["Herkimer Coffee"]);
    expect(placesRepository.upsertCalls).toEqual([
      {
        googlePlaceId: "mock-herkimer-coffee",
        name: "Herkimer Coffee",
        categoryId: "coffee-shop",
        lat: 47.6816,
        lng: -122.3552,
        address: "7320 Greenwood Ave N, Seattle, WA",
        neighborhoodId: "phinneywood-id",
      },
    ]);
  });

  it("creates a POI for a poi classification", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [{ ...candidate, classification: "poi", type: "cafe" }],
      [],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.createdPois).toEqual(["Herkimer Coffee"]);
    expect(poiRepository.pois).toHaveLength(1);
    expect(poiRepository.pois[0]).toMatchObject({ name: "Herkimer Coffee", googlePlaceId: "mock-herkimer-coffee" });
  });

  it("does not persist an omit classification", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [{ ...candidate, classification: "omit" }],
      [],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.omitted).toEqual(["Herkimer Coffee"]);
    expect(placesRepository.upsertCalls).toHaveLength(0);
    expect(poiRepository.pois).toHaveLength(0);
  });

  it("reports a failure without aborting the rest of the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [
        { ...candidate, classification: "business" }, // missing categoryId
        { ...candidate, googlePlaceId: "mock-original-bakery", name: "Original Bakery", classification: "poi", type: "bakery" },
      ],
      [],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.failed).toEqual([
      { name: "Herkimer Coffee", error: "category_id is required to classify as a business" },
    ]);
    expect(result.createdPois).toEqual(["Original Bakery"]);
  });

  it("hides an approved venue removal without deleting it", async () => {
    categoryMappingRepository.venues = [
      {
        id: "venue-outside",
        name: "Outside The Boundary Cafe",
        address: "Capitol Hill, Seattle, WA",
        categoryId: null,
        categoryName: null,
        categoryGroup: null,
        status: "active",
        lat: 47.6,
        lng: -122.3,
        googlePlaceId: null,
        claimedByBusiness: false,
      },
    ];

    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ kind: "venue", id: "venue-outside" }],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.hidden).toEqual(["Outside The Boundary Cafe"]);
    expect(categoryMappingRepository.venues[0].status).toBe("hidden");
  });

  it("hides an approved POI removal without deleting it", async () => {
    const poi = await poiRepository.createPoiForNeighborhood({
      neighborhoodId: "phinneywood-id",
      name: "Faraway Park",
      description: null,
      type: "park",
      lat: 47.6,
      lng: -122.3,
      googlePlaceId: null,
      address: null,
    });

    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ kind: "poi", id: poi.id }],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.hidden).toEqual(["Faraway Park"]);
    expect(poiRepository.pois[0].status).toBe("hidden");
    expect(poiRepository.pois).toHaveLength(1);
  });

  it("reports a failure for a removal referencing an unknown id, without aborting the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [
        { kind: "venue", id: "missing-venue" },
        { kind: "poi", id: "missing-poi" },
      ],
      placesRepository,
      poiRepository,
      categoryMappingRepository
    );

    expect(result.hidden).toHaveLength(0);
    expect(result.failed).toEqual([
      { name: "missing-venue", error: "Venue not found" },
      { name: "missing-poi", error: "Point of interest not found" },
    ]);
  });
});
