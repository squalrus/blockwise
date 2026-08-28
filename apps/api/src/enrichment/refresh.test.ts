import { describe, expect, it } from "vitest";
import type { VenueEnrichmentCache } from "@blockwise/types";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
import { PlacesApiQuotaExceededError } from "../places/quotaGuard";
import { getFreshEnrichment, isStale } from "./refresh";
import type { EnrichmentRepository, UpsertEnrichmentInput } from "./repository";

class FakeEnrichmentRepository implements EnrichmentRepository {
  upsertCalls: UpsertEnrichmentInput[] = [];
  private rows = new Map<string, VenueEnrichmentCache>();

  async getEnrichment(locationId: string): Promise<VenueEnrichmentCache | null> {
    return this.rows.get(locationId) ?? null;
  }

  async upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    this.upsertCalls.push(input);
    const row: VenueEnrichmentCache = {
      venue_id: input.locationId,
      source: input.source,
      phone: input.phone,
      website: input.website,
      hours: input.hours,
      editorial_summary: input.editorialSummary,
      fetched_at: new Date().toISOString(),
    };
    this.rows.set(input.locationId, row);
    return row;
  }
}

class FakePlacesClient implements PlaceDetailsClient {
  calls: string[] = [];
  response: RawPlaceDetails = {
    id: "geoapify-place-1",
    nationalPhoneNumber: "(206) 555-0100",
    websiteUri: "https://example.com",
    regularOpeningHours: { weekdayDescriptions: ["Monday: 7:00 AM – 5:00 PM"] },
    editorialSummary: { text: "Cozy neighborhood coffee shop." },
  };

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    this.calls.push(placeId);
    return this.response;
  }

  async fetchPhotoMedia() {
    return { contentType: "image/png", data: new ArrayBuffer(0) };
  }
}

describe("isStale", () => {
  it("is not stale within the TTL window", () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z").toISOString();
    const now = new Date("2026-01-01T12:00:00Z").getTime();
    expect(isStale(fetchedAt, now, 24 * 60 * 60 * 1000)).toBe(false);
  });

  it("is stale once the TTL has elapsed", () => {
    const fetchedAt = new Date("2026-01-01T00:00:00Z").toISOString();
    const now = new Date("2026-01-02T00:00:01Z").getTime();
    expect(isStale(fetchedAt, now, 24 * 60 * 60 * 1000)).toBe(true);
  });
});

describe("getFreshEnrichment", () => {
  it("fetches and caches enrichment when none exists yet", async () => {
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", "geoapify-place-1", null, repository, placesClient);

    expect(placesClient.calls).toEqual(["geoapify-place-1"]);
    expect(repository.upsertCalls).toHaveLength(1);
    expect(result).toMatchObject({ phone: "(206) 555-0100", website: "https://example.com" });
  });

  it("works identically for a former-POI-kind location (BACKLOG.md 'POIs and venues managed almost the same')", async () => {
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("poi-1", "geoapify-place-1", null, repository, placesClient);

    expect(repository.upsertCalls).toEqual([expect.objectContaining({ locationId: "poi-1" })]);
    expect(result).toMatchObject({ venue_id: "poi-1", phone: "(206) 555-0100" });
  });

  it("does not refetch when the cached enrichment is still fresh", async () => {
    const fresh: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "geoapify",
      phone: "(206) 555-0100",
      website: "https://example.com",
      hours: ["Monday: 7:00 AM – 5:00 PM"],
      editorial_summary: "Cozy neighborhood coffee shop.",
      fetched_at: new Date().toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", "geoapify-place-1", fresh, repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(repository.upsertCalls).toHaveLength(0);
    expect(result).toEqual(fresh);
  });

  it("refetches when the cached enrichment has passed the TTL", async () => {
    const stale: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "geoapify",
      phone: null,
      website: null,
      hours: null,
      editorial_summary: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", "geoapify-place-1", stale, repository, placesClient);

    expect(placesClient.calls).toEqual(["geoapify-place-1"]);
    expect(result?.phone).toBe("(206) 555-0100");
  });

  it("skips enrichment entirely when there's no geoapify_place_id", async () => {
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", null, null, repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(result).toBeNull();
  });

  it("falls back to stale data instead of failing when the refresh errors", async () => {
    const stale: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "geoapify",
      phone: null,
      website: null,
      hours: null,
      editorial_summary: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();
    placesClient.getPlaceDetails = async () => {
      throw new Error("Places API is down");
    };

    const result = await getFreshEnrichment("venue-1", "geoapify-place-1", stale, repository, placesClient);

    expect(result).toEqual(stale);
  });

  it("falls back to stale data instead of failing when the cost guardrail trips", async () => {
    const stale: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "geoapify",
      phone: null,
      website: null,
      hours: null,
      editorial_summary: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();
    placesClient.getPlaceDetails = async () => {
      throw new PlacesApiQuotaExceededError("getPlaceDetails");
    };

    const result = await getFreshEnrichment("venue-1", "geoapify-place-1", stale, repository, placesClient);

    expect(result).toEqual(stale);
  });
});
