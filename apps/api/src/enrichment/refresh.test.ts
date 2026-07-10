import { describe, expect, it } from "vitest";
import type { VenueEnrichmentCache } from "@blockwise/types";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
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
    this.rows.set(input.locationId, row);
    return row;
  }

  async getPhotoReference(locationId: string, index: number): Promise<string | null> {
    return this.rows.get(locationId)?.photo_refs[index] ?? null;
  }
}

class FakePlacesClient implements PlaceDetailsClient {
  calls: string[] = [];
  response: RawPlaceDetails = {
    id: "google-place-1",
    rating: 4.6,
    priceLevel: "PRICE_LEVEL_MODERATE",
    reviews: [
      { rating: 5, text: { text: "Great espresso." }, authorAttribution: { displayName: "Ava" } },
    ],
    photos: [{ name: "places/google-place-1/photos/1" }, { name: "places/google-place-1/photos/2" }],
    nationalPhoneNumber: "(206) 555-0100",
    websiteUri: "https://example.com",
    regularOpeningHours: { weekdayDescriptions: ["Monday: 7:00 AM – 5:00 PM"] },
    editorialSummary: { text: "Cozy neighborhood coffee shop." },
    delivery: false,
    dineIn: true,
    takeout: true,
    outdoorSeating: true,
    goodForChildren: true,
    reservable: false,
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

    const result = await getFreshEnrichment("venue-1", "google-place-1", null, repository, placesClient);

    expect(placesClient.calls).toEqual(["google-place-1"]);
    expect(repository.upsertCalls).toHaveLength(1);
    expect(result).toMatchObject({ rating: 4.6, price_tier: "PRICE_LEVEL_MODERATE" });
  });

  it("works identically for a former-POI-kind location (BACKLOG.md 'POIs and venues managed almost the same')", async () => {
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("poi-1", "google-place-1", null, repository, placesClient);

    expect(repository.upsertCalls).toEqual([expect.objectContaining({ locationId: "poi-1" })]);
    expect(result).toMatchObject({ venue_id: "poi-1", rating: 4.6 });
  });

  it("does not refetch when the cached enrichment is still fresh", async () => {
    const fresh: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "google",
      rating: 4.5,
      reviews: [{ rating: 5, text: "Still good.", author_name: "Ava" }],
      price_tier: "PRICE_LEVEL_MODERATE",
      photo_refs: ["https://example.com/old-photo"],
      phone: "(206) 555-0100",
      website: "https://example.com",
      hours: ["Monday: 7:00 AM – 5:00 PM"],
      editorial_summary: "Cozy neighborhood coffee shop.",
      atmosphere: null,
      fetched_at: new Date().toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", "google-place-1", fresh, repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(repository.upsertCalls).toHaveLength(0);
    expect(result).toEqual(fresh);
  });

  it("refetches when the cached enrichment has passed the TTL", async () => {
    const stale: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "google",
      rating: 4.0,
      reviews: [{ rating: 4, text: "Old review.", author_name: "Sam" }],
      price_tier: "PRICE_LEVEL_MODERATE",
      photo_refs: ["https://example.com/old-photo"],
      phone: null,
      website: null,
      hours: null,
      editorial_summary: null,
      atmosphere: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", "google-place-1", stale, repository, placesClient);

    expect(placesClient.calls).toEqual(["google-place-1"]);
    expect(result?.rating).toBe(4.6);
  });

  it("skips enrichment entirely when there's no google_place_id", async () => {
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();

    const result = await getFreshEnrichment("venue-1", null, null, repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(result).toBeNull();
  });

  it("falls back to stale data instead of failing when the refresh errors", async () => {
    const stale: VenueEnrichmentCache = {
      venue_id: "venue-1",
      source: "google",
      rating: 4.0,
      reviews: [{ rating: 4, text: "Old review.", author_name: "Sam" }],
      price_tier: "PRICE_LEVEL_MODERATE",
      photo_refs: ["https://example.com/old-photo"],
      phone: null,
      website: null,
      hours: null,
      editorial_summary: null,
      atmosphere: null,
      fetched_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };
    const repository = new FakeEnrichmentRepository();
    const placesClient = new FakePlacesClient();
    placesClient.getPlaceDetails = async () => {
      throw new Error("Places API is down");
    };

    const result = await getFreshEnrichment("venue-1", "google-place-1", stale, repository, placesClient);

    expect(result).toEqual(stale);
  });
});
