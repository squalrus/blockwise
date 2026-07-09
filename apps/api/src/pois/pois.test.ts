import { describe, expect, it } from "vitest";
import {
  createNeighborhoodPoi,
  deletePoiForNeighborhood,
  getPoiForNeighborhood,
  listPoisForNeighborhood,
  updatePoiForNeighborhood,
  updatePoiStatusForNeighborhood,
} from "./pois";
import type { CreateNeighborhoodPoiInput, PoiRecord, PoiRepository, UpdatePoiInput } from "./repository";

// In-memory fake, mirroring the pattern used for EventRepository tests.
class FakePoiRepository implements PoiRepository {
  pois: PoiRecord[] = [];
  dependentActivity = new Set<string>();
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

  async listPoisForNeighborhood(neighborhoodId: string, search?: string): Promise<PoiRecord[]> {
    const inNeighborhood = this.pois.filter((p) => p.neighborhoodId === neighborhoodId);
    if (!search) return inNeighborhood;
    const needle = search.toLowerCase();
    return inNeighborhood.filter((p) => p.name.toLowerCase().includes(needle));
  }

  async countActivePoisForNeighborhood(neighborhoodId: string): Promise<number> {
    return this.pois.filter((p) => p.neighborhoodId === neighborhoodId && p.status === "active")
      .length;
  }

  async getPoiById(poiId: string): Promise<PoiRecord | null> {
    return this.pois.find((p) => p.id === poiId) ?? null;
  }

  async getPoiNeighborhoodId(poiId: string): Promise<string | null> {
    return this.pois.find((p) => p.id === poiId)?.neighborhoodId ?? null;
  }

  async updatePoi(poiId: string, input: UpdatePoiInput): Promise<PoiRecord> {
    const poi = this.pois.find((p) => p.id === poiId)!;
    if (input.name !== undefined) poi.name = input.name;
    if (input.description !== undefined) poi.description = input.description;
    if (input.type !== undefined) poi.type = input.type;
    if (input.lat !== undefined) poi.lat = input.lat;
    if (input.lng !== undefined) poi.lng = input.lng;
    if (input.address !== undefined) poi.address = input.address;
    return poi;
  }

  async setPoiStatus(poiId: string, status: PoiRecord["status"]): Promise<PoiRecord> {
    const poi = this.pois.find((p) => p.id === poiId)!;
    poi.status = status;
    return poi;
  }

  async hasDependentActivity(poiId: string): Promise<boolean> {
    return this.dependentActivity.has(poiId);
  }

  async deletePoi(poiId: string): Promise<void> {
    this.pois = this.pois.filter((p) => p.id !== poiId);
  }
}

describe("createNeighborhoodPoi", () => {
  it("creates a neighborhood-owned POI with its location", async () => {
    const repo = new FakePoiRepository();
    const poi = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Phinney Ridge Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    expect(poi.neighborhood_id).toBe("neighborhood-1");
    expect(poi.name).toBe("Phinney Ridge Park");
    expect(poi.description).toBeNull();
    expect(poi.lat).toBe(47.67);
    expect(poi.lng).toBe(-122.35);
    expect(poi.google_place_id).toBeNull();
    expect(poi.address).toBeNull();
    expect(poi.status).toBe("active");
  });

  it("carries an optional google_place_id/address through, e.g. converting a venue to a POI", async () => {
    const repo = new FakePoiRepository();
    const poi = await createNeighborhoodPoi(
      "neighborhood-1",
      {
        name: "Woodland Park Rose Garden",
        type: "park",
        lat: 47.67,
        lng: -122.35,
        googlePlaceId: "places-123",
        address: "700 N 50th St, Seattle, WA",
      },
      repo
    );

    expect(poi.google_place_id).toBe("places-123");
    expect(poi.address).toBe("700 N 50th St, Seattle, WA");
  });
});

describe("listPoisForNeighborhood", () => {
  it("only returns POIs for the requested neighborhood", async () => {
    const repo = new FakePoiRepository();
    await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );
    await createNeighborhoodPoi(
      "neighborhood-2",
      { name: "Transit stop", type: "transit", lat: 47.68, lng: -122.36 },
      repo
    );

    const results = await listPoisForNeighborhood("neighborhood-1", repo);
    expect(results).toHaveLength(1);
    expect(results[0].neighborhood_id).toBe("neighborhood-1");
  });

  it("filters by name when a search term is given", async () => {
    const repo = new FakePoiRepository();
    await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Woodland Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );
    await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Main St Transit Stop", type: "transit", lat: 47.68, lng: -122.36 },
      repo
    );

    const results = await listPoisForNeighborhood("neighborhood-1", repo, "woodland");
    expect(results).toEqual([expect.objectContaining({ name: "Woodland Park" })]);
  });
});

describe("getPoiForNeighborhood", () => {
  it("returns not_found when the POI belongs to a different neighborhood", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await getPoiForNeighborhood("neighborhood-2", created.id, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns not_found for a genuinely missing POI id", async () => {
    const repo = new FakePoiRepository();
    const result = await getPoiForNeighborhood("neighborhood-1", "missing-poi", repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns the POI when the neighborhood matches", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await getPoiForNeighborhood("neighborhood-1", created.id, repo);
    expect(result).toEqual({ status: "found", poi: expect.objectContaining({ name: "Park" }) });
  });
});

describe("updatePoiForNeighborhood", () => {
  it("updates only the provided fields", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35, description: "Old description" },
      repo
    );

    const result = await updatePoiForNeighborhood(
      "neighborhood-1",
      created.id,
      { name: "Woodland Park" },
      repo
    );

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.poi.name).toBe("Woodland Park");
      expect(result.poi.description).toBe("Old description");
    }
  });

  it("returns not_found when the POI belongs to a different neighborhood", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await updatePoiForNeighborhood("neighborhood-2", created.id, { name: "X" }, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("updatePoiStatusForNeighborhood", () => {
  it("hides an active POI", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await updatePoiStatusForNeighborhood("neighborhood-1", created.id, "hidden", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.poi.status).toBe("hidden");
    }
  });

  it("restores a hidden POI back to active", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );
    await updatePoiStatusForNeighborhood("neighborhood-1", created.id, "hidden", repo);

    const result = await updatePoiStatusForNeighborhood("neighborhood-1", created.id, "active", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.poi.status).toBe("active");
    }
  });

  it("returns not_found when the POI belongs to a different neighborhood", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await updatePoiStatusForNeighborhood("neighborhood-2", created.id, "hidden", repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("deletePoiForNeighborhood", () => {
  it("deletes a POI with no dependent activity", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await deletePoiForNeighborhood("neighborhood-1", created.id, repo);
    expect(result).toEqual({ status: "deleted" });
    expect(await repo.getPoiById(created.id)).toBeNull();
  });

  it("blocks deletion when the POI has checkin/point/challenge history", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );
    repo.dependentActivity.add(created.id);

    const result = await deletePoiForNeighborhood("neighborhood-1", created.id, repo);
    expect(result).toEqual({ status: "has_dependent_activity" });
    expect(await repo.getPoiById(created.id)).not.toBeNull();
  });

  it("returns not_found when the POI belongs to a different neighborhood", async () => {
    const repo = new FakePoiRepository();
    const created = await createNeighborhoodPoi(
      "neighborhood-1",
      { name: "Park", type: "park", lat: 47.67, lng: -122.35 },
      repo
    );

    const result = await deletePoiForNeighborhood("neighborhood-2", created.id, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});
