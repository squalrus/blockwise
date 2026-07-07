import { describe, expect, it } from "vitest";
import {
  listAssignableCategories,
  listVenueCategoryMappingsForNeighborhood,
  reassignVenueCategory,
  reassignVenueCategoryForNeighborhood,
} from "./categoryMapping";
import type { CategoryMappingRepository, CategoryRecord, VenueCategoryRecord } from "./repository";

// In-memory fake, mirroring the pattern used for claims/claims.test.ts.
class FakeCategoryMappingRepository implements CategoryMappingRepository {
  constructor(
    private readonly venues: VenueCategoryRecord[],
    private readonly categories: CategoryRecord[],
    private readonly venueNeighborhoods: Record<string, string> = {}
  ) {}

  async listVenuesForNeighborhood(neighborhoodId: string, search?: string): Promise<VenueCategoryRecord[]> {
    const inNeighborhood = this.venues.filter((v) => this.venueNeighborhoods[v.id] === neighborhoodId);
    if (!search) return inNeighborhood;
    const needle = search.toLowerCase();
    return inNeighborhood.filter(
      (v) => v.name.toLowerCase().includes(needle) || v.address.toLowerCase().includes(needle)
    );
  }

  async getVenueNeighborhoodId(venueId: string): Promise<string | null> {
    return this.venueNeighborhoods[venueId] ?? null;
  }

  async listCategories(): Promise<CategoryRecord[]> {
    return this.categories;
  }

  async getVenue(venueId: string): Promise<{ id: string } | null> {
    const venue = this.venues.find((v) => v.id === venueId);
    return venue ? { id: venue.id } : null;
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? { id: category.id } : null;
  }

  async updateVenueCategory(venueId: string, categoryId: string): Promise<VenueCategoryRecord> {
    const venue = this.venues.find((v) => v.id === venueId)!;
    const category = this.categories.find((c) => c.id === categoryId)!;
    venue.categoryId = category.id;
    venue.categoryName = category.name;
    venue.categoryGroup = category.groupName;
    return venue;
  }
}

const VENUES: VenueCategoryRecord[] = [
  {
    id: "venue-1",
    name: "Corner Cafe",
    address: "123 Greenwood Ave N",
    categoryId: "cat-restaurant",
    categoryName: "Restaurant",
    categoryGroup: "Food & Drink",
  },
  {
    id: "venue-2",
    name: "Phinney Hardware",
    address: "456 Phinney Ave N",
    categoryId: null,
    categoryName: null,
    categoryGroup: null,
  },
];

const CATEGORIES: CategoryRecord[] = [
  { id: "cat-restaurant", name: "Restaurant", groupName: "Food & Drink" },
  { id: "cat-hardware", name: "Home & Garden", groupName: "Retail" },
];

const VENUE_NEIGHBORHOODS: Record<string, string> = {
  "venue-1": "neighborhood-1",
  "venue-2": "neighborhood-1",
};

describe("listVenueCategoryMappingsForNeighborhood", () => {
  it("returns all venues in the neighborhood when no search term is given", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await listVenueCategoryMappingsForNeighborhood("neighborhood-1", repo);
    expect(result).toHaveLength(2);
  });

  it("filters by name or address within the neighborhood when a search term is given", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await listVenueCategoryMappingsForNeighborhood("neighborhood-1", repo, "hardware");
    expect(result).toEqual([
      expect.objectContaining({ id: "venue-2", name: "Phinney Hardware" }),
    ]);
  });

  it("excludes venues belonging to a different neighborhood", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await listVenueCategoryMappingsForNeighborhood("neighborhood-2", repo);
    expect(result).toHaveLength(0);
  });
});

describe("listAssignableCategories", () => {
  it("returns categories with their group name", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await listAssignableCategories(repo);
    expect(result).toEqual([
      { id: "cat-restaurant", name: "Restaurant", group_name: "Food & Drink" },
      { id: "cat-hardware", name: "Home & Garden", group_name: "Retail" },
    ]);
  });
});

describe("reassignVenueCategory", () => {
  it("returns venue_not_found for an unknown venue", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategory("missing-venue", "cat-hardware", repo);
    expect(result).toEqual({ status: "venue_not_found" });
  });

  it("returns invalid_category for an unknown or non-leaf category", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategory("venue-2", "cat-missing", repo);
    expect(result).toEqual({ status: "invalid_category" });
  });

  it("reassigns a venue's category_id", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategory("venue-2", "cat-hardware", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.venue.category_id).toBe("cat-hardware");
      expect(result.venue.category_name).toBe("Home & Garden");
      expect(result.venue.category_group).toBe("Retail");
    }
  });
});

describe("reassignVenueCategoryForNeighborhood", () => {
  it("returns venue_not_found when the venue belongs to a different neighborhood", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategoryForNeighborhood("neighborhood-2", "venue-2", "cat-hardware", repo);
    expect(result).toEqual({ status: "venue_not_found" });
  });

  it("returns venue_not_found for a genuinely missing venue id", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategoryForNeighborhood("neighborhood-1", "missing-venue", "cat-hardware", repo);
    expect(result).toEqual({ status: "venue_not_found" });
  });

  it("reassigns the category when the neighborhood matches", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategoryForNeighborhood("neighborhood-1", "venue-2", "cat-hardware", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.venue.category_id).toBe("cat-hardware");
    }
  });

  it("still returns invalid_category when the category id doesn't reference a leaf category", async () => {
    const repo = new FakeCategoryMappingRepository(VENUES, CATEGORIES, VENUE_NEIGHBORHOODS);
    const result = await reassignVenueCategoryForNeighborhood("neighborhood-1", "venue-2", "cat-missing", repo);
    expect(result).toEqual({ status: "invalid_category" });
  });
});
