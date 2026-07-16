import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryRecord } from "../places/categorize";
import { MockPlacesClient } from "../places/mockClient";
import type { ExistingVenue, NeighborhoodRecord, PlacesRepository, UpsertVenueInput } from "../places/repository";
import type {
  CategoryRecord as LocationCategoryRecord,
  CreateLocationInput,
  LocationRecord,
  LocationRepository,
  SetLocationKindInput,
  UpdateLocationInput,
} from "./repository";
import { commitLocationReview, getLocationsReviewCooldownStatus, reviewNeighborhoodLocations } from "./review";

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

// In-memory fake, mirroring the pattern used for CheckinRepository tests.
// One table for both kinds since the venue/poi merge (BACKLOG.md "POIs and
// venues managed almost the same") -- review.ts now sources its existing-
// location list (for dedup and boundary-removal checks) from here instead
// of the old split venue/POI repositories.
class FakeLocationRepository implements LocationRepository {
  locations: LocationRecord[];
  private nextId = 1;

  constructor(initial: LocationRecord[] = []) {
    this.locations = initial;
  }

  async listVenues() {
    return [];
  }

  async listLocationsForNeighborhood(neighborhoodId: string, search?: string): Promise<LocationRecord[]> {
    // Mirrors the real repository's .neq("status", "removed") -- a removed
    // location is fully detached from the neighborhood (BACKLOG.md "Reimport
    // Locations"), so it must not count as "already known" for dedup or the
    // boundary-removal check.
    let results = this.locations.filter((l) => l.neighborhoodId === neighborhoodId && l.status !== "removed");
    if (search) {
      const needle = search.toLowerCase();
      results = results.filter(
        (l) => l.name.toLowerCase().includes(needle) || (l.address ?? "").toLowerCase().includes(needle)
      );
    }
    return results;
  }

  async countActiveLocationsForNeighborhood(neighborhoodId: string, kind: LocationRecord["kind"]): Promise<number> {
    return this.locations.filter((l) => l.neighborhoodId === neighborhoodId && l.kind === kind && l.status === "active")
      .length;
  }

  async getLocationById(locationId: string): Promise<LocationRecord | null> {
    return this.locations.find((l) => l.id === locationId) ?? null;
  }

  async getLocationDetail(): Promise<null> {
    return null;
  }

  async getLocationNeighborhoodId(locationId: string): Promise<string | null> {
    return this.locations.find((l) => l.id === locationId)?.neighborhoodId ?? null;
  }

  async createLocation(input: CreateLocationInput): Promise<LocationRecord> {
    const record: LocationRecord = {
      id: `location-${this.nextId++}`,
      neighborhoodId: input.neighborhoodId,
      googlePlaceId: input.googlePlaceId,
      name: input.name,
      kind: input.kind,
      categoryId: input.categoryId,
      categoryName: null,
      categoryGroup: null,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      address: input.address,
      claimedByBusiness: false,
      status: input.status ?? "active",
      createdAt: new Date().toISOString(),
    };
    this.locations.push(record);
    return record;
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    Object.assign(location, input);
    return location;
  }

  async setLocationStatus(locationId: string, status: LocationRecord["status"]): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    location.status = status;
    return location;
  }

  async setLocationKind(locationId: string, input: SetLocationKindInput): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    location.kind = input.kind;
    if (input.categoryId !== undefined) location.categoryId = input.categoryId;
    return location;
  }

  async updateLocationCategory(locationId: string, categoryId: string): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    location.categoryId = categoryId;
    return location;
  }

  async listCategories(): Promise<LocationCategoryRecord[]> {
    return [];
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    return { id: categoryId };
  }

  async hasDependentActivity(): Promise<boolean> {
    return false;
  }

  async deleteLocation(locationId: string): Promise<void> {
    this.locations = this.locations.filter((l) => l.id !== locationId);
  }
}

function makeBusinessLocation(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "location-1",
    neighborhoodId: "phinneywood-id",
    googlePlaceId: null,
    name: "Business",
    kind: "business",
    categoryId: null,
    categoryName: null,
    categoryGroup: null,
    description: null,
    lat: 0,
    lng: 0,
    address: null,
    claimedByBusiness: false,
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePoiLocation(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return makeBusinessLocation({ kind: "poi", ...overrides });
}

describe("reviewNeighborhoodLocations", () => {
  let placesRepository: FakePlacesRepository;
  let locationRepository: FakeLocationRepository;

  beforeEach(() => {
    placesRepository = new FakePlacesRepository();
    locationRepository = new FakeLocationRepository();
  });

  it("surfaces every in-boundary place as a new candidate when nothing exists yet", async () => {
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
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
      locationRepository
    );

    const bakery = report.newCandidates.find((c) => c.name === "Original Bakery");
    expect(bakery?.suggestedCategoryId).toBe("bakery");

    const widget = report.newCandidates.find((c) => c.name === "Widget Electronics Repair");
    expect(widget?.suggestedCategoryId).toBeNull();
  });

  it("excludes a place already synced as a business, matched by google_place_id", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-1",
        googlePlaceId: "mock-herkimer-coffee",
        name: "Herkimer Coffee",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
  });

  it("excludes a place already converted to a POI, matched by google_place_id", async () => {
    locationRepository.locations = [
      makePoiLocation({
        id: "existing-poi-1",
        googlePlaceId: "mock-mustard-seed-park",
        name: "Mustard Seed Park",
        lat: 47.685,
        lng: -122.3495,
        address: "N 80th St & Fremont Ave N, Seattle, WA",
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Mustard Seed Park")).toBe(false);
  });

  it("excludes a near-duplicate match against an existing business with no matching place id", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-2",
        googlePlaceId: null,
        name: "Herkimer Coffee Shop",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
  });

  it("skips POIs with null lat/lng when deduping (BACKLOG.md Ref 51)", async () => {
    locationRepository.locations = [
      makePoiLocation({ id: "woodland-park", name: "Woodland Park", lat: null, lng: null }),
    ];

    // Should not throw despite the null-coordinate POI in the dedup list.
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );
    expect(report.newCandidates.length).toBeGreaterThan(0);
  });

  it("flags an active business outside the current boundary as a proposed removal", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "venue-outside",
        name: "Outside The Boundary Cafe",
        address: "Capitol Hill, Seattle, WA",
        status: "active",
        lat: 47.6,
        lng: -122.3,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      id: "venue-outside",
      name: "Outside The Boundary Cafe",
      address: "Capitol Hill, Seattle, WA",
    });
  });

  it("does not flag an already-hidden business outside the boundary", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "venue-outside-hidden",
        name: "Already Hidden Cafe",
        address: "Capitol Hill, Seattle, WA",
        status: "hidden",
        lat: 47.6,
        lng: -122.3,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals.some((r) => r.id === "venue-outside-hidden")).toBe(false);
  });

  it("does not flag an active business still inside the boundary", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "venue-inside",
        name: "Herkimer Coffee",
        address: "7320 Greenwood Ave N, Seattle, WA",
        status: "active",
        lat: 47.6816,
        lng: -122.3552,
        googlePlaceId: "mock-herkimer-coffee",
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals).toHaveLength(0);
  });

  it("flags an active POI outside the current boundary as a proposed removal", async () => {
    locationRepository.locations = [
      makePoiLocation({ id: "poi-faraway", name: "Faraway Park", lat: 47.6, lng: -122.3, address: null }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      id: "poi-faraway",
      name: "Faraway Park",
      address: null,
    });
  });

  it("skips a null-coordinate POI from the removal check (BACKLOG.md Ref 51)", async () => {
    locationRepository.locations = [
      makePoiLocation({ id: "woodland-park", name: "Woodland Park", lat: null, lng: null }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals.some((r) => r.name === "Woodland Park")).toBe(false);
  });
});

describe("commitLocationReview", () => {
  let placesRepository: FakePlacesRepository;
  let locationRepository: FakeLocationRepository;

  beforeEach(() => {
    placesRepository = new FakePlacesRepository();
    locationRepository = new FakeLocationRepository();
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
      locationRepository
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
      [{ ...candidate, classification: "poi" }],
      [],
      placesRepository,
      locationRepository
    );

    expect(result.createdPois).toEqual(["Herkimer Coffee"]);
    expect(locationRepository.locations).toHaveLength(1);
    expect(locationRepository.locations[0]).toMatchObject({
      name: "Herkimer Coffee",
      googlePlaceId: "mock-herkimer-coffee",
      kind: "poi",
    });
  });

  it("persists an omit classification as a hidden POI, not skipping it", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [{ ...candidate, classification: "omit" }],
      [],
      placesRepository,
      locationRepository
    );

    expect(result.omitted).toEqual(["Herkimer Coffee"]);
    expect(placesRepository.upsertCalls).toHaveLength(0);
    expect(locationRepository.locations).toHaveLength(1);
    expect(locationRepository.locations[0]).toMatchObject({
      name: "Herkimer Coffee",
      googlePlaceId: "mock-herkimer-coffee",
      kind: "poi",
      status: "hidden",
    });
  });

  it("reports a failure without aborting the rest of the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [
        { ...candidate, classification: "business" }, // missing categoryId
        { ...candidate, googlePlaceId: "mock-original-bakery", name: "Original Bakery", classification: "poi" },
      ],
      [],
      placesRepository,
      locationRepository
    );

    expect(result.failed).toEqual([
      { name: "Herkimer Coffee", error: "category_id is required to classify as a business" },
    ]);
    expect(result.createdPois).toEqual(["Original Bakery"]);
  });

  it("marks an approved business removal as removed without deleting it", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "venue-outside",
        name: "Outside The Boundary Cafe",
        address: "Capitol Hill, Seattle, WA",
        status: "active",
        lat: 47.6,
        lng: -122.3,
      }),
    ];

    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ id: "venue-outside" }],
      placesRepository,
      locationRepository
    );

    expect(result.removed).toEqual(["Outside The Boundary Cafe"]);
    expect(locationRepository.locations[0].status).toBe("removed");
  });

  it("marks an approved POI removal as removed without deleting it", async () => {
    locationRepository.locations = [
      makePoiLocation({ id: "poi-faraway", name: "Faraway Park", lat: 47.6, lng: -122.3, address: null }),
    ];

    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ id: "poi-faraway" }],
      placesRepository,
      locationRepository
    );

    expect(result.removed).toEqual(["Faraway Park"]);
    expect(locationRepository.locations[0].status).toBe("removed");
    expect(locationRepository.locations).toHaveLength(1);
  });

  it("reports a failure for a removal referencing an unknown id, without aborting the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ id: "missing-venue" }, { id: "missing-poi" }],
      placesRepository,
      locationRepository
    );

    expect(result.removed).toHaveLength(0);
    expect(result.failed).toEqual([
      { name: "missing-venue", error: "Location not found" },
      { name: "missing-poi", error: "Location not found" },
    ]);
  });

  it("treats a removed location as forgotten -- its google place resurfaces as a new candidate again", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "previously-removed",
        googlePlaceId: "mock-herkimer-coffee",
        name: "Herkimer Coffee (stale)",
        status: "removed",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockPlacesClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(true);
  });
});

describe("getLocationsReviewCooldownStatus", () => {
  it("allows running immediately when never reviewed before", () => {
    const status = getLocationsReviewCooldownStatus(null);
    expect(status).toEqual({ lastReviewedAt: null, nextAllowedAt: null, canRun: true });
  });

  it("blocks running right after a review", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const status = getLocationsReviewCooldownStatus("2026-07-15T11:00:00.000Z", now);
    expect(status.canRun).toBe(false);
    expect(status.nextAllowedAt).toBe("2026-07-16T11:00:00.000Z");
  });

  it("allows running again exactly 24h after the last review", () => {
    const lastReviewedAt = "2026-07-15T11:00:00.000Z";
    const exactlyOneDayLater = new Date("2026-07-16T11:00:00.000Z");
    const status = getLocationsReviewCooldownStatus(lastReviewedAt, exactlyOneDayLater);
    expect(status.canRun).toBe(true);
  });

  it("blocks running one millisecond before the 24h mark", () => {
    const lastReviewedAt = "2026-07-15T11:00:00.000Z";
    const justUnderOneDayLater = new Date("2026-07-16T10:59:59.999Z");
    const status = getLocationsReviewCooldownStatus(lastReviewedAt, justUnderOneDayLater);
    expect(status.canRun).toBe(false);
  });

  it("lets a super admin bypass the cooldown while still reporting the real last/next review times", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const lastReviewedAt = "2026-07-15T11:00:00.000Z";
    const status = getLocationsReviewCooldownStatus(lastReviewedAt, now, true);
    expect(status.canRun).toBe(true);
    expect(status.lastReviewedAt).toBe(lastReviewedAt);
    expect(status.nextAllowedAt).toBe("2026-07-16T11:00:00.000Z");
  });

  it("bypass has no effect when there's nothing to bypass (never reviewed before)", () => {
    const status = getLocationsReviewCooldownStatus(null, new Date(), true);
    expect(status).toEqual({ lastReviewedAt: null, nextAllowedAt: null, canRun: true });
  });
});
