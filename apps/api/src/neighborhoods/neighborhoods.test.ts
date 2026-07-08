import { describe, expect, it } from "vitest";
import type { GeoJsonPolygon, SocialLinks } from "@blockwise/types";
import {
  createNeighborhood,
  getNeighborhoodBoundary,
  getNeighborhoodBySlug,
  updateNeighborhoodBoundary,
  updateNeighborhoodDescription,
  updateNeighborhoodSocialLinks,
} from "./neighborhoods";
import { SlugTakenError } from "./repository";
import type {
  CreatedNeighborhood,
  CreateNeighborhoodInput,
  NeighborhoodBoundaryRecord,
  NeighborhoodRecord,
  NeighborhoodRepository,
} from "./repository";

const SQUARE: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-122.36, 47.67],
      [-122.34, 47.67],
      [-122.34, 47.69],
      [-122.36, 47.69],
      [-122.36, 47.67],
    ],
  ],
};

// In-memory fake, mirroring the pattern used for EventRepository tests.
class FakeNeighborhoodRepository implements NeighborhoodRepository {
  boundaries = new Map<string, NeighborhoodBoundaryRecord>();
  private takenSlugs = new Set<string>();
  private nextId = 100;

  constructor(private neighborhoods: NeighborhoodRecord[]) {
    for (const n of neighborhoods) this.takenSlugs.add(n.slug);
  }

  async getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null> {
    return this.neighborhoods.find((n) => n.slug === slug) ?? null;
  }

  async getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null> {
    return this.neighborhoods.find((n) => n.id === id) ?? null;
  }

  async updateDescription(id: string, description: string): Promise<NeighborhoodRecord> {
    const neighborhood = this.neighborhoods.find((n) => n.id === id);
    if (!neighborhood) throw new Error("not found");
    neighborhood.description = description;
    return neighborhood;
  }

  async updateSocialLinks(id: string, socialLinks: SocialLinks): Promise<NeighborhoodRecord> {
    const neighborhood = this.neighborhoods.find((n) => n.id === id);
    if (!neighborhood) throw new Error("not found");
    neighborhood.social_links = socialLinks;
    return neighborhood;
  }

  async listAll(): Promise<NeighborhoodRecord[]> {
    return this.neighborhoods;
  }

  async getBoundary(id: string): Promise<NeighborhoodBoundaryRecord | null> {
    return this.boundaries.get(id) ?? null;
  }

  async updateBoundary(id: string, boundaryGeojson: GeoJsonPolygon): Promise<NeighborhoodBoundaryRecord> {
    const boundary: NeighborhoodBoundaryRecord = { boundaryGeojson, centerLat: 47.68, centerLng: -122.35 };
    this.boundaries.set(id, boundary);
    return boundary;
  }

  async createNeighborhood(input: CreateNeighborhoodInput): Promise<CreatedNeighborhood> {
    if (this.takenSlugs.has(input.slug)) throw new SlugTakenError(input.slug);
    this.takenSlugs.add(input.slug);

    const id = `neighborhood-${this.nextId++}`;
    const created: CreatedNeighborhood = {
      id,
      name: input.name,
      slug: input.slug,
      city: input.city,
      state: input.state,
      country: input.country,
      timezone: input.timezone,
      status: "onboarding",
      boundaryGeojson: input.boundaryGeojson,
      centerLat: 47.68,
      centerLng: -122.35,
    };
    this.neighborhoods.push({
      id,
      name: input.name,
      slug: input.slug,
      description: null,
      city: input.city,
      state: input.state,
      social_links: {},
    });
    this.boundaries.set(id, { boundaryGeojson: input.boundaryGeojson, centerLat: 47.68, centerLng: -122.35 });
    return created;
  }
}

const PHINNEYWOOD: NeighborhoodRecord = {
  id: "neighborhood-1",
  name: "Phinneywood",
  slug: "phinneywood",
  description: null,
  city: "Seattle",
  state: "WA",
  social_links: {},
};

describe("getNeighborhoodBySlug", () => {
  it("returns the matching neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([PHINNEYWOOD]);
    const result = await getNeighborhoodBySlug("phinneywood", repo);
    expect(result?.id).toBe("neighborhood-1");
  });

  it("returns null for an unknown slug", async () => {
    const repo = new FakeNeighborhoodRepository([PHINNEYWOOD]);
    const result = await getNeighborhoodBySlug("nowhere", repo);
    expect(result).toBeNull();
  });
});

describe("updateNeighborhoodDescription", () => {
  it("updates the description of an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const result = await updateNeighborhoodDescription("neighborhood-1", "A great place.", repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.neighborhood.description).toBe("A great place.");
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await updateNeighborhoodDescription("nope", "A great place.", repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("updateNeighborhoodSocialLinks", () => {
  it("updates the social links of an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const result = await updateNeighborhoodSocialLinks(
      "neighborhood-1",
      { instagram: "https://instagram.com/phinneywood" },
      repo
    );

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.neighborhood.social_links).toEqual({
        instagram: "https://instagram.com/phinneywood",
      });
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await updateNeighborhoodSocialLinks("nope", { instagram: "x" }, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("getNeighborhoodBoundary", () => {
  it("returns the boundary for an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    repo.boundaries.set("neighborhood-1", {
      boundaryGeojson: SQUARE,
      centerLat: 47.68,
      centerLng: -122.35,
    });

    const result = await getNeighborhoodBoundary("neighborhood-1", repo);
    expect(result.status).toBe("found");
    if (result.status === "found") {
      expect(result.boundary.boundaryGeojson).toEqual(SQUARE);
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await getNeighborhoodBoundary("nope", repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("updateNeighborhoodBoundary", () => {
  it("updates the boundary of an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const result = await updateNeighborhoodBoundary("neighborhood-1", SQUARE, repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.boundary.boundaryGeojson).toEqual(SQUARE);
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await updateNeighborhoodBoundary("nope", SQUARE, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("createNeighborhood", () => {
  it("creates a new neighborhood with the drawn boundary", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const created = await createNeighborhood(
      {
        name: "Ballard",
        slug: "ballard",
        city: "Seattle",
        state: "WA",
        country: "US",
        timezone: "America/Los_Angeles",
        boundaryGeojson: SQUARE,
      },
      repo
    );

    expect(created.slug).toBe("ballard");
    expect(created.status).toBe("onboarding");
    expect(created.boundaryGeojson).toEqual(SQUARE);
  });

  it("rejects a slug already used by another neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    await expect(
      createNeighborhood(
        {
          name: "Phinneywood Again",
          slug: "phinneywood",
          city: "Seattle",
          state: "WA",
          country: "US",
          timezone: "America/Los_Angeles",
          boundaryGeojson: SQUARE,
        },
        repo
      )
    ).rejects.toThrow(SlugTakenError);
  });
});
