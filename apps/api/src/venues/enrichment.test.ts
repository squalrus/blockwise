import { describe, expect, it } from "vitest";
import type { VenueEnrichmentCache } from "@blockwise/types";
import type { PlaceDetailsClient, RawPlaceDetails } from "../places/client";
import type {
  UpsertEnrichmentInput,
  VenueDetailRecord,
  VenueDetailRepository,
} from "./detailRepository";
import { getVenueDetailWithFreshEnrichment, isStale } from "./enrichment";

const BASE_RECORD: VenueDetailRecord = {
  id: "venue-1",
  googlePlaceId: "google-place-1",
  name: "Diesel Fuel Coffee",
  address: "5629 University Way NE, Seattle, WA",
  lat: 47.6772,
  lng: -122.3549,
  categoryName: "Coffee Shop",
  claimedByBusiness: false,
  enrichment: null,
  neighborhoodSlug: "phinneywood",
  neighborhoodName: "Phinneywood",
  socialLinks: {},
};

class FakeRepository implements VenueDetailRepository {
  upsertCalls: UpsertEnrichmentInput[] = [];

  constructor(private record: VenueDetailRecord | null) {}

  async listVenues() {
    return [];
  }

  async getVenueDetail(): Promise<VenueDetailRecord | null> {
    return this.record;
  }

  async countActiveVenuesForNeighborhood(): Promise<number> {
    return this.record ? 1 : 0;
  }

  async getEnrichmentPhotoReference(_venueId: string, index: number): Promise<string | null> {
    return this.record?.enrichment?.photo_refs[index] ?? null;
  }

  async upsertEnrichment(input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    this.upsertCalls.push(input);
    const row: VenueEnrichmentCache = {
      venue_id: input.venueId,
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
    if (this.record) this.record = { ...this.record, enrichment: row };
    return row;
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

describe("getVenueDetailWithFreshEnrichment", () => {
  it("returns null when the venue doesn't exist", async () => {
    const result = await getVenueDetailWithFreshEnrichment(
      "missing",
      new FakeRepository(null),
      new FakePlacesClient()
    );
    expect(result).toBeNull();
  });

  it("fetches and caches enrichment when none exists yet", async () => {
    const repository = new FakeRepository(BASE_RECORD);
    const placesClient = new FakePlacesClient();

    const result = await getVenueDetailWithFreshEnrichment("venue-1", repository, placesClient);

    expect(placesClient.calls).toEqual(["google-place-1"]);
    expect(repository.upsertCalls).toHaveLength(1);
    expect(result?.enrichment).toMatchObject({
      rating: 4.6,
      price_tier: "PRICE_LEVEL_MODERATE",
      reviews: [{ rating: 5, text: "Great espresso.", author_name: "Ava" }],
      photo_refs: ["places/google-place-1/photos/1", "places/google-place-1/photos/2"],
      phone: "(206) 555-0100",
      website: "https://example.com",
      hours: ["Monday: 7:00 AM – 5:00 PM"],
      editorial_summary: "Cozy neighborhood coffee shop.",
      atmosphere: {
        delivery: false,
        dine_in: true,
        takeout: true,
        outdoor_seating: true,
        good_for_children: true,
        reservable: false,
      },
    });
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
    const repository = new FakeRepository({ ...BASE_RECORD, enrichment: fresh });
    const placesClient = new FakePlacesClient();

    const result = await getVenueDetailWithFreshEnrichment("venue-1", repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(repository.upsertCalls).toHaveLength(0);
    expect(result?.enrichment).toEqual(fresh);
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
    const repository = new FakeRepository({ ...BASE_RECORD, enrichment: stale });
    const placesClient = new FakePlacesClient();

    const result = await getVenueDetailWithFreshEnrichment("venue-1", repository, placesClient);

    expect(placesClient.calls).toEqual(["google-place-1"]);
    expect(result?.enrichment?.rating).toBe(4.6);
  });

  it("skips enrichment entirely when the venue has no google_place_id", async () => {
    const repository = new FakeRepository({ ...BASE_RECORD, googlePlaceId: null });
    const placesClient = new FakePlacesClient();

    const result = await getVenueDetailWithFreshEnrichment("venue-1", repository, placesClient);

    expect(placesClient.calls).toHaveLength(0);
    expect(result?.enrichment).toBeNull();
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
    const repository = new FakeRepository({ ...BASE_RECORD, enrichment: stale });
    const placesClient = new FakePlacesClient();
    placesClient.getPlaceDetails = async () => {
      throw new Error("Places API is down");
    };

    const result = await getVenueDetailWithFreshEnrichment("venue-1", repository, placesClient);

    expect(result?.enrichment).toEqual(stale);
  });
});
