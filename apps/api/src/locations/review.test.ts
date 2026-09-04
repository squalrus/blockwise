import { beforeEach, describe, expect, it } from "vitest";
import type { VenueAnalytics } from "@blockwise/types";
import type { CategoryRecord } from "../places/categorize";
import { MockGeoapifyClient } from "../places/mockGeoapifyClient";
import type { NeighborhoodRecord, PlacesRepository, UpsertVenueInput } from "../places/repository";
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
  { id: "coffee-shop", name: "Coffee Shop", source_mapping_json: { geoapify: ["catering.cafe.coffee_shop"] } },
  { id: "bakery", name: "Bakery", source_mapping_json: { geoapify: ["catering.cafe.bakery"] } },
  { id: "park", name: "Park & Playground", source_mapping_json: { geoapify: ["leisure.park", "leisure.playground"] } },
];

class FakePlacesRepository implements PlacesRepository {
  upsertCalls: UpsertVenueInput[] = [];

  async getNeighborhoodBySlug(): Promise<NeighborhoodRecord | null> {
    return { id: "phinneywood-id", centerLat: 47.6686, centerLng: -122.355, boundaryGeojson: PHINNEYWOOD_BOUNDARY };
  }

  async listCategories(): Promise<CategoryRecord[]> {
    return CATEGORIES;
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
      geoapifyPlaceId: input.geoapifyPlaceId,
      osmType: input.osmType ?? null,
      osmId: input.osmId ?? null,
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

  async updateLocationIdentity(
    locationId: string,
    identity: { geoapifyPlaceId: string; osmType: string | null; osmId: number | null }
  ): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    location.geoapifyPlaceId = identity.geoapifyPlaceId;
    location.osmType = identity.osmType;
    location.osmId = identity.osmId;
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

  async getAnalytics(locationId: string, days: number): Promise<VenueAnalytics> {
    return {
      venue_id: locationId,
      days,
      checkins_over_time: [],
      activity_by_type: [],
      checkins_by_day_of_week: [],
      coupon_claims_over_time: [],
      event_follows_over_time: [],
      top_followed_events: [],
    };
  }
}

function makeBusinessLocation(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "location-1",
    neighborhoodId: "phinneywood-id",
    geoapifyPlaceId: null,
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
      new MockGeoapifyClient(),
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

  it("categorizes a candidate whose Geoapify tag matches the taxonomy, leaves the rest unmapped", async () => {
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    const bakery = report.newCandidates.find((c) => c.name === "Original Bakery");
    expect(bakery?.suggestedCategoryId).toBe("bakery");

    const widget = report.newCandidates.find((c) => c.name === "Widget Electronics Repair");
    expect(widget?.suggestedCategoryId).toBeNull();
  });

  it("excludes a place already synced as a business, matched by geoapify_place_id", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-1",
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        name: "Herkimer Coffee",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
  });

  it("excludes a place already converted to a POI, matched by geoapify_place_id", async () => {
    locationRepository.locations = [
      makePoiLocation({
        id: "existing-poi-1",
        geoapifyPlaceId: "geoapify-mock-mustard-seed-park",
        name: "Mustard Seed Park",
        lat: 47.685,
        lng: -122.3495,
        address: "N 80th St & Fremont Ave N, Seattle, WA",
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Mustard Seed Park")).toBe(false);
  });

  it("surfaces a near-duplicate match against an existing business as a possible match, not a new candidate", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-2",
        geoapifyPlaceId: null,
        name: "Herkimer Coffee Shop",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.newCandidates.some((c) => c.name === "Herkimer Coffee")).toBe(false);
    expect(report.possibleMatches).toHaveLength(1);
    expect(report.possibleMatches[0]).toMatchObject({
      locationId: "existing-2",
      existingName: "Herkimer Coffee Shop",
      geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
      matchedName: "Herkimer Coffee",
    });
    expect(report.possibleMatches[0].confidencePercent).toBeGreaterThanOrEqual(60);
  });

  it("skips POIs with null lat/lng when deduping (BACKLOG.md Ref 51)", async () => {
    locationRepository.locations = [
      makePoiLocation({ id: "woodland-park", name: "Woodland Park", lat: null, lng: null }),
    ];

    // Should not throw despite the null-coordinate POI in the dedup list.
    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
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
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      id: "venue-outside",
      name: "Outside The Boundary Cafe",
      address: "Capitol Hill, Seattle, WA",
    });
  });

  it("flags an already-hidden business outside the boundary too -- hidden is a curation choice, not a geography one", async () => {
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
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals).toContainEqual({
      id: "venue-outside-hidden",
      name: "Already Hidden Cafe",
      address: "Capitol Hill, Seattle, WA",
    });
  });

  it("does not flag an already-removed business outside the boundary again", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "venue-outside-removed",
        name: "Already Removed Cafe",
        address: "Capitol Hill, Seattle, WA",
        status: "removed",
        lat: 47.6,
        lng: -122.3,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals.some((r) => r.id === "venue-outside-removed")).toBe(false);
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
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
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
      new MockGeoapifyClient(),
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
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.proposedRemovals.some((r) => r.name === "Woodland Park")).toBe(false);
  });

  // User-requested follow-up to the osm_type/osm_id fix ("could we also run
  // the same refresh across the locations" on import) -- see
  // refreshMatchedLocation's comment in review.ts.
  it("refreshes an unclaimed matched business's basic info and fills its unset category", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-1",
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        name: "Herkimer Coffee (old name)",
        lat: 47.6816,
        lng: -122.3552,
        address: null,
        categoryId: null,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.refreshed).toContain("Herkimer Coffee (old name)");
    const updated = locationRepository.locations.find((l) => l.id === "existing-1")!;
    expect(updated.name).toBe("Herkimer Coffee");
    expect(updated.address).toBe("7320 Greenwood Ave N, Seattle, WA");
    expect(updated.categoryId).toBe("coffee-shop");
  });

  it("never overwrites a claimed business's basic info during Import", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-1",
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        name: "Business-Submitted Name",
        lat: 47.6816,
        lng: -122.3552,
        claimedByBusiness: true,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.refreshed).not.toContain("Business-Submitted Name");
    const updated = locationRepository.locations.find((l) => l.id === "existing-1")!;
    expect(updated.name).toBe("Business-Submitted Name");
  });

  it("leaves a matched POI's basic info untouched during Import, even though it's unclaimed", async () => {
    // Unlike a deliberate one-off Reassign, an unattended scheduled Import
    // can't tell a POI's own manual curation (PoiForm) apart from stale
    // source data -- see refreshMatchedLocation's comment.
    locationRepository.locations = [
      makePoiLocation({
        id: "existing-poi-1",
        geoapifyPlaceId: "geoapify-mock-mustard-seed-park",
        name: "Mustard Seed Park (curated name)",
        lat: 47.685,
        lng: -122.3495,
        address: "N 80th St & Fremont Ave N, Seattle, WA",
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
      placesRepository,
      locationRepository
    );

    expect(report.refreshed).not.toContain("Mustard Seed Park (curated name)");
    const updated = locationRepository.locations.find((l) => l.id === "existing-poi-1")!;
    expect(updated.name).toBe("Mustard Seed Park (curated name)");
  });

  it("refreshes a stale geoapify_place_id cache when matched by osm ref alone, even with basic info unchanged", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-1",
        geoapifyPlaceId: "stale-place-id",
        osmType: "n",
        osmId: 123,
        name: "Sully's Ale House",
        lat: 47.6816,
        lng: -122.3552,
        address: "some address",
        categoryId: "some-category",
      }),
    ];

    class FreshIdClient {
      async searchPlaces() {
        return [
          {
            placeId: "fresh-place-id",
            name: "Sully's Ale House",
            formattedAddress: "some address",
            location: { lat: 47.6816, lng: -122.3552 },
            categories: [],
            osmType: "n",
            osmId: 123,
          },
        ];
      }
    }

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new FreshIdClient(),
      placesRepository,
      locationRepository
    );

    expect(report.refreshed).toContain("Sully's Ale House");
    const updated = locationRepository.locations.find((l) => l.id === "existing-1")!;
    expect(updated.geoapifyPlaceId).toBe("fresh-place-id");
    // Unchanged -- isolates this test to the identity-cache refresh alone.
    expect(updated.name).toBe("Sully's Ale House");
    expect(updated.categoryId).toBe("some-category");
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
    geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
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
      locationRepository,
      new MockGeoapifyClient()
    );

    expect(result.createdBusinesses).toEqual(["Herkimer Coffee"]);
    expect(placesRepository.upsertCalls).toEqual([
      {
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        osmType: null,
        osmId: null,
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
      locationRepository,
      new MockGeoapifyClient()
    );

    expect(result.createdPois).toEqual(["Herkimer Coffee"]);
    expect(locationRepository.locations).toHaveLength(1);
    expect(locationRepository.locations[0]).toMatchObject({
      name: "Herkimer Coffee",
      geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
      kind: "poi",
    });
  });

  it("persists an omit classification as a hidden POI, not skipping it", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [{ ...candidate, classification: "omit" }],
      [],
      placesRepository,
      locationRepository,
      new MockGeoapifyClient()
    );

    expect(result.omitted).toEqual(["Herkimer Coffee"]);
    expect(placesRepository.upsertCalls).toHaveLength(0);
    expect(locationRepository.locations).toHaveLength(1);
    expect(locationRepository.locations[0]).toMatchObject({
      name: "Herkimer Coffee",
      geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
      kind: "poi",
      status: "hidden",
    });
  });

  it("reports a failure without aborting the rest of the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [
        { ...candidate, classification: "business" }, // missing categoryId
        { ...candidate, geoapifyPlaceId: "geoapify-mock-original-bakery", name: "Original Bakery", classification: "poi" },
      ],
      [],
      placesRepository,
      locationRepository,
      new MockGeoapifyClient()
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
      locationRepository,
      new MockGeoapifyClient()
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
      locationRepository,
      new MockGeoapifyClient()
    );

    expect(result.removed).toEqual(["Faraway Park"]);
    expect(locationRepository.locations[0].status).toBe("removed");
    expect(locationRepository.locations).toHaveLength(1);
  });

  it("reidentifies an approved possible match, rewriting the existing location's geoapify_place_id and basic info", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "existing-2",
        geoapifyPlaceId: "ChIJ-legacy-google-id",
        name: "Herkimer Coffee Shop",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [],
      placesRepository,
      locationRepository,
      new MockGeoapifyClient(),
      [{ locationId: "existing-2", geoapifyPlaceId: "geoapify-mock-herkimer-coffee", osmType: null, osmId: null }]
    );

    // Reassign now also refreshes basic info from the same Place Details
    // lookup (user-requested follow-up: "when reassigning to a known place,
    // should the name update?") -- so the reported name is the fresh one.
    expect(result.reidentified).toEqual(["Herkimer Coffee"]);
    expect(locationRepository.locations[0].geoapifyPlaceId).toBe("geoapify-mock-herkimer-coffee");
    expect(locationRepository.locations[0].name).toBe("Herkimer Coffee");
  });

  it("reports a failure for a reidentification referencing an unknown location, without aborting the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [],
      placesRepository,
      locationRepository,
      new MockGeoapifyClient(),
      [{ locationId: "missing-location", geoapifyPlaceId: "geoapify-mock-herkimer-coffee" }]
    );

    expect(result.reidentified).toHaveLength(0);
    expect(result.failed).toEqual([{ name: "missing-location", error: "Location not found" }]);
  });

  it("reports a failure for a removal referencing an unknown id, without aborting the batch", async () => {
    const result = await commitLocationReview(
      "phinneywood-id",
      [],
      [{ id: "missing-venue" }, { id: "missing-poi" }],
      placesRepository,
      locationRepository,
      new MockGeoapifyClient()
    );

    expect(result.removed).toHaveLength(0);
    expect(result.failed).toEqual([
      { name: "missing-venue", error: "Location not found" },
      { name: "missing-poi", error: "Location not found" },
    ]);
  });

  it("treats a removed location as forgotten -- its geoapify place resurfaces as a new candidate again", async () => {
    locationRepository.locations = [
      makeBusinessLocation({
        id: "previously-removed",
        geoapifyPlaceId: "geoapify-mock-herkimer-coffee",
        name: "Herkimer Coffee (stale)",
        status: "removed",
        lat: 47.6816,
        lng: -122.3552,
      }),
    ];

    const report = await reviewNeighborhoodLocations(
      "phinneywood-id",
      PHINNEYWOOD_BOUNDARY!,
      new MockGeoapifyClient(),
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
