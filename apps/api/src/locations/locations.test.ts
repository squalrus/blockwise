import { describe, expect, it } from "vitest";
import type { VenueEnrichmentCache } from "@blockwise/types";
import type { EnrichmentRepository, UpsertEnrichmentInput } from "../enrichment/repository";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
import {
  createLocation,
  deleteLocationForNeighborhood,
  getLocationDetailWithFreshEnrichment,
  getLocationForNeighborhood,
  listAssignableCategories,
  listLocationListItemsForNeighborhood,
  listLocationsForNeighborhood,
  reassignLocationCategoryForNeighborhood,
  switchLocationKindForNeighborhood,
  updateLocationForNeighborhood,
  updateLocationStatusForNeighborhood,
} from "./locations";
import type {
  CategoryRecord,
  CreateLocationInput,
  LocationDetailRecord,
  LocationRecord,
  LocationRepository,
  SetLocationKindInput,
  UpdateLocationInput,
} from "./repository";

// In-memory fake, mirroring the pattern used for VenueDetailRepository tests.
class FakeLocationRepository implements LocationRepository {
  locations: LocationRecord[];
  detail: LocationDetailRecord | null = null;
  private nextId = 1;

  constructor(initial: LocationRecord[] = []) {
    this.locations = initial;
  }

  async listVenues() {
    return this.locations
      .filter((l) => l.kind === "business" && l.status === "active")
      .map((l) => ({
        id: l.id,
        name: l.name,
        address: l.address ?? "",
        lat: l.lat ?? 0,
        lng: l.lng ?? 0,
        category_name: l.categoryName,
        category_group: l.categoryGroup,
      }));
  }

  async listLocationsForNeighborhood(neighborhoodId: string, search?: string): Promise<LocationRecord[]> {
    let results = this.locations.filter((l) => l.neighborhoodId === neighborhoodId);
    if (search) {
      const needle = search.toLowerCase();
      results = results.filter((l) => l.name.toLowerCase().includes(needle));
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

  async getLocationDetail(): Promise<LocationDetailRecord | null> {
    return this.detail;
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
    if (input.kind === "poi") {
      location.claimedByBusiness = false;
      location.categoryId = null;
    } else if (input.categoryId !== undefined) {
      location.categoryId = input.categoryId;
    }
    return location;
  }

  async updateLocationCategory(locationId: string, categoryId: string): Promise<LocationRecord> {
    const location = this.locations.find((l) => l.id === locationId)!;
    location.categoryId = categoryId;
    return location;
  }

  async listCategories(): Promise<CategoryRecord[]> {
    return [{ id: "coffee-shop", name: "Coffee Shop", groupName: "Food & Drink" }];
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    return categoryId === "coffee-shop" ? { id: categoryId } : null;
  }

  dependentActivity = new Set<string>();

  async hasDependentActivity(locationId: string): Promise<boolean> {
    return this.dependentActivity.has(locationId);
  }

  async deleteLocation(locationId: string): Promise<void> {
    this.locations = this.locations.filter((l) => l.id !== locationId);
  }
}

function makeBusiness(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return {
    id: "location-1",
    neighborhoodId: "neighborhood-1",
    googlePlaceId: null,
    name: "Diesel Fuel Coffee",
    kind: "business",
    categoryId: null,
    categoryName: null,
    categoryGroup: null,
    description: null,
    lat: 47.67,
    lng: -122.35,
    address: "123 Main St",
    claimedByBusiness: false,
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePoi(overrides: Partial<LocationRecord> = {}): LocationRecord {
  return makeBusiness({ kind: "poi", name: "Woodland Park", ...overrides });
}

describe("createLocation", () => {
  it("creates a POI-kind location", async () => {
    const repo = new FakeLocationRepository();
    const location = await createLocation(
      "neighborhood-1",
      { kind: "poi", name: "Phinney Ridge Park", lat: 47.67, lng: -122.35 },
      repo
    );

    expect(location.neighborhood_id).toBe("neighborhood-1");
    expect(location.kind).toBe("poi");
    expect(location.name).toBe("Phinney Ridge Park");
    expect(location.claimed_by_business).toBe(false);
  });
});

describe("listLocationsForNeighborhood", () => {
  it("filters by neighborhood and optionally by kind", async () => {
    const repo = new FakeLocationRepository([
      makeBusiness({ id: "b1", neighborhoodId: "neighborhood-1" }),
      makePoi({ id: "p1", neighborhoodId: "neighborhood-1" }),
      makePoi({ id: "p2", neighborhoodId: "neighborhood-2" }),
    ]);

    const all = await listLocationsForNeighborhood("neighborhood-1", repo);
    expect(all.map((l) => l.id).sort()).toEqual(["b1", "p1"]);

    const poisOnly = await listLocationsForNeighborhood("neighborhood-1", repo, "poi");
    expect(poisOnly.map((l) => l.id)).toEqual(["p1"]);
  });
});

describe("getLocationForNeighborhood", () => {
  it("returns not_found when the location belongs to a different neighborhood", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1", neighborhoodId: "neighborhood-1" })]);
    const result = await getLocationForNeighborhood("neighborhood-2", "b1", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns the location when the neighborhood matches", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1", neighborhoodId: "neighborhood-1" })]);
    const result = await getLocationForNeighborhood("neighborhood-1", "b1", repo);
    expect(result).toEqual({ status: "found", location: expect.objectContaining({ id: "b1" }) });
  });
});

class FakeEnrichmentRepository implements EnrichmentRepository {
  upsertCalls: UpsertEnrichmentInput[] = [];

  async getEnrichment(): Promise<VenueEnrichmentCache | null> {
    return null;
  }

  async upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    this.upsertCalls.push(input);
    return {
      venue_id: input.locationId,
      source: input.source,
      rating: input.rating,
      reviews: input.reviews,
      price_tier: input.priceTier,
      photo_refs: input.photoRefs,
      phone: input.phone,
      website: input.website,
      hours: input.hours,
      editorial_summary: input.editorialSummary,
      atmosphere: input.atmosphere,
      fetched_at: new Date().toISOString(),
    };
  }

  async getPhotoReference(): Promise<string | null> {
    return null;
  }
}

class FakePlacesClient implements PlaceDetailsClient {
  calls: string[] = [];
  response: RawPlaceDetails = { id: "google-place-1", rating: 4.7 };

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    this.calls.push(placeId);
    return this.response;
  }

  async fetchPhotoMedia() {
    return { contentType: "image/png", data: new ArrayBuffer(0) };
  }
}

const BASE_DETAIL: LocationDetailRecord = {
  id: "location-1",
  googlePlaceId: "google-place-1",
  name: "Diesel Fuel Coffee",
  kind: "business",
  description: null,
  address: "123 Main St",
  lat: 47.67,
  lng: -122.35,
  categoryName: "Coffee Shop",
  claimedByBusiness: false,
  enrichment: null,
  neighborhoodSlug: "phinneywood",
  neighborhoodName: "Phinneywood",
  socialLinks: {},
  checkinCount: 3,
  favoriteCount: 2,
  recentCheckinMushrooms: [],
};

describe("getLocationDetailWithFreshEnrichment", () => {
  it("returns null when the location doesn't exist", async () => {
    const repo = new FakeLocationRepository();
    const result = await getLocationDetailWithFreshEnrichment(
      "missing",
      repo,
      new FakeEnrichmentRepository(),
      new FakePlacesClient()
    );
    expect(result).toBeNull();
  });

  it("merges a fresh enrichment fetch into the returned detail, for either kind", async () => {
    const repo = new FakeLocationRepository();
    repo.detail = BASE_DETAIL;
    const enrichmentRepository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getLocationDetailWithFreshEnrichment("location-1", repo, enrichmentRepository, placesClient);

    expect(placesClient.calls).toEqual(["google-place-1"]);
    expect(result?.enrichment).toMatchObject({ rating: 4.7 });
    expect(result?.checkin_count).toBe(3);
    expect(result?.favorite_count).toBe(2);
    expect(result?.kind).toBe("business");
  });

  it("passes through recent check-in mushroom snapshots for the 'who's foraged here' mosaic", async () => {
    const repo = new FakeLocationRepository();
    const snapshot = { v: 2, cap: "#e8542a", stalk: "#fbf2e4", spots: "#fbf2e4", bg: "#fbf2e4", spotCount: 3, spotShape: "circle" as const };
    repo.detail = { ...BASE_DETAIL, recentCheckinMushrooms: [snapshot] };

    const result = await getLocationDetailWithFreshEnrichment(
      "location-1",
      repo,
      new FakeEnrichmentRepository(),
      new FakePlacesClient()
    );

    expect(result?.recent_checkin_mushrooms).toEqual([snapshot]);
  });

  it("skips enrichment when the location has no google_place_id", async () => {
    const repo = new FakeLocationRepository();
    repo.detail = { ...BASE_DETAIL, kind: "poi", googlePlaceId: null };
    const placesClient = new FakePlacesClient();

    const result = await getLocationDetailWithFreshEnrichment("location-1", repo, new FakeEnrichmentRepository(), placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(result?.enrichment).toBeNull();
  });
});

describe("updateLocationForNeighborhood", () => {
  it("updates only the provided fields", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1", description: "Old description" })]);
    const result = await updateLocationForNeighborhood("neighborhood-1", "p1", { name: "New Name" }, repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.location.name).toBe("New Name");
      expect(result.location.description).toBe("Old description");
    }
  });

  it("returns not_found for a cross-neighborhood location", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1", neighborhoodId: "neighborhood-1" })]);
    const result = await updateLocationForNeighborhood("neighborhood-2", "p1", { name: "X" }, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("updateLocationStatusForNeighborhood", () => {
  it("hides and restores a location regardless of kind", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1" })]);

    const hidden = await updateLocationStatusForNeighborhood("neighborhood-1", "b1", "hidden", repo);
    expect(hidden.status).toBe("updated");
    if (hidden.status === "updated") expect(hidden.location.status).toBe("hidden");

    const restored = await updateLocationStatusForNeighborhood("neighborhood-1", "b1", "active", repo);
    if (restored.status === "updated") expect(restored.location.status).toBe("active");
  });
});

describe("reassignLocationCategoryForNeighborhood", () => {
  it("rejects a category that isn't a valid leaf", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1" })]);
    const result = await reassignLocationCategoryForNeighborhood("neighborhood-1", "b1", "not-a-category", repo);
    expect(result).toEqual({ status: "invalid_category" });
  });

  it("reassigns to a valid leaf category", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1" })]);
    const result = await reassignLocationCategoryForNeighborhood("neighborhood-1", "b1", "coffee-shop", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") expect(result.location.category_id).toBe("coffee-shop");
  });
});

describe("switchLocationKindForNeighborhood", () => {
  it("switches a business to poi in place, keeping the same id", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1" })]);
    const result = await switchLocationKindForNeighborhood("neighborhood-1", "b1", "poi", {}, repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.location.id).toBe("b1");
      expect(result.location.kind).toBe("poi");
    }
  });

  it("blocks switching a claimed business to poi", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1", claimedByBusiness: true })]);
    const result = await switchLocationKindForNeighborhood("neighborhood-1", "b1", "poi", {}, repo);
    expect(result).toEqual({ status: "claimed" });
  });

  it("is idempotent when already the requested kind", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1" })]);
    const result = await switchLocationKindForNeighborhood("neighborhood-1", "p1", "poi", {}, repo);
    expect(result.status).toBe("already_this_kind");
  });

  it("switches a poi back to business without requiring a category (Unmapped is valid)", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1" })]);
    const result = await switchLocationKindForNeighborhood("neighborhood-1", "p1", "business", {}, repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") expect(result.location.kind).toBe("business");
  });

  it("rejects an invalid category when switching to business", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1" })]);
    const result = await switchLocationKindForNeighborhood(
      "neighborhood-1",
      "p1",
      "business",
      { categoryId: "not-a-category" },
      repo
    );
    expect(result).toEqual({ status: "invalid_category" });
  });

  it("returns not_found for a cross-neighborhood location", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1", neighborhoodId: "neighborhood-1" })]);
    const result = await switchLocationKindForNeighborhood("neighborhood-2", "b1", "poi", {}, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("deleteLocationForNeighborhood", () => {
  it("deletes a POI with no dependent activity", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1" })]);
    const result = await deleteLocationForNeighborhood("neighborhood-1", "p1", repo);
    expect(result).toEqual({ status: "deleted" });
    expect(await repo.getLocationById("p1")).toBeNull();
  });

  it("blocks deletion when the POI has dependent history", async () => {
    const repo = new FakeLocationRepository([makePoi({ id: "p1" })]);
    repo.dependentActivity.add("p1");
    const result = await deleteLocationForNeighborhood("neighborhood-1", "p1", repo);
    expect(result).toEqual({ status: "has_dependent_activity" });
  });

  it("refuses to delete a business-kind location", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1" })]);
    const result = await deleteLocationForNeighborhood("neighborhood-1", "b1", repo);
    expect(result).toEqual({ status: "business_kind" });
    expect(await repo.getLocationById("b1")).not.toBeNull();
  });
});

describe("listLocationListItemsForNeighborhood", () => {
  it("merges both kinds into one sorted-by-repository list, mapping category_or_type per kind", async () => {
    const repo = new FakeLocationRepository([
      makeBusiness({ id: "b1", categoryName: "Coffee Shop" }),
      makePoi({ id: "p1" }),
    ]);

    const items = await listLocationListItemsForNeighborhood("neighborhood-1", repo);
    expect(items).toEqual([
      expect.objectContaining({ id: "b1", kind: "business", category_or_type: "Coffee Shop" }),
      expect.objectContaining({ id: "p1", kind: "poi", category_or_type: "Point of interest" }),
    ]);
  });

  it("labels an unmapped business as 'Unmapped'", async () => {
    const repo = new FakeLocationRepository([makeBusiness({ id: "b1", categoryName: null })]);
    const items = await listLocationListItemsForNeighborhood("neighborhood-1", repo);
    expect(items[0].category_or_type).toBe("Unmapped");
  });
});

describe("listAssignableCategories", () => {
  it("maps repository categories to CategoryOption", async () => {
    const repo = new FakeLocationRepository();
    const options = await listAssignableCategories(repo);
    expect(options).toEqual([{ id: "coffee-shop", name: "Coffee Shop", group_name: "Food & Drink" }]);
  });
});
