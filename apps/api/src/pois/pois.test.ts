import { describe, expect, it } from "vitest";
import { createNeighborhoodPoi, listPoisForNeighborhood } from "./pois";
import type { CreateNeighborhoodPoiInput, PoiRecord, PoiRepository } from "./repository";

// In-memory fake, mirroring the pattern used for EventRepository tests.
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
    };
    this.pois.push(record);
    return record;
  }

  async listPoisForNeighborhood(neighborhoodId: string): Promise<PoiRecord[]> {
    return this.pois.filter((p) => p.neighborhoodId === neighborhoodId);
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
});
