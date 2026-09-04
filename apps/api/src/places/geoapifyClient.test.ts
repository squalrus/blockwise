import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveGeoapifyClient } from "./geoapifyClient";
import { MockGeoapifyClient } from "./mockGeoapifyClient";

describe("MockGeoapifyClient", () => {
  it("returns the fixture set from searchPlaces", async () => {
    const client = new MockGeoapifyClient();
    const places = await client.searchPlaces({
      center: { lat: 47.67, lng: -122.35 },
      radiusMeters: 400,
      categories: ["catering.cafe"],
    });
    expect(places.length).toBeGreaterThan(0);
    expect(places.map((p) => p.name)).toContain("Diesel Fuel Coffee");
  });

  it("returns fixture details for a known place, a safe default for an unknown one", async () => {
    const client = new MockGeoapifyClient();
    const known = await client.getPlaceDetails("geoapify-mock-herkimer-coffee");
    expect(known.openingHours).toBe("Mo-Fr 06:30-18:00; Sa-Su 07:00-18:00");

    const unknown = await client.getPlaceDetails("does-not-exist");
    expect(unknown).toMatchObject({ placeId: "does-not-exist", name: null, categories: [] });
  });

  it("reverseGeocode returns the fixture within 50m, nothing when too far away", async () => {
    const client = new MockGeoapifyClient();
    const nearby = await client.reverseGeocode({ lat: 47.6772, lng: -122.3549 });
    expect(nearby.map((p) => p.name)).toContain("Diesel Fuel Coffee");

    const farAway = await client.reverseGeocode({ lat: 47.5, lng: -122.2 });
    expect(farAway).toEqual([]);
  });
});

describe("LiveGeoapifyClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a circle-filtered searchPlaces request and maps the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "abc123",
              name: "Caffe Vita",
              formatted: "4301 Fremont Ave N, Seattle, WA",
              lat: 47.659,
              lon: -122.35,
              categories: ["catering.cafe.coffee_shop"],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const results = await client.searchPlaces({
      center: { lat: 47.659, lng: -122.35 },
      radiusMeters: 400,
      categories: ["catering.cafe", "commercial.books"],
    });

    expect(results).toEqual([
      {
        placeId: "abc123",
        osmType: null,
        osmId: null,
        name: "Caffe Vita",
        formattedAddress: "4301 Fremont Ave N, Seattle, WA",
        location: { lat: 47.659, lng: -122.35 },
        categories: ["catering.cafe.coffee_shop"],
      },
    ]);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://api.geoapify.com/v2/places");
    expect(requestedUrl.searchParams.get("categories")).toBe("catering.cafe,commercial.books");
    expect(requestedUrl.searchParams.get("filter")).toBe("circle:-122.35,47.659,400");
    expect(requestedUrl.searchParams.get("apiKey")).toBe("test-key");
  });

  it("extracts osm_type/osm_id from datasource.raw when present", async () => {
    // Live-verified 2026-09-04 (see dedup.test.ts's "Kipos"/"Salon Opal"
    // cases): this is the one field that stays identical across Geoapify
    // endpoints for the same real-world place, unlike place_id itself.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "5100d6f4ea6d965ec05947bf6cf15fd84740f00102f9018b01531d0000000092030a53616c6f6e204f70616c",
              name: "Salon Opal",
              formatted: "549 North 85th Street, Seattle, WA 98103, United States of America",
              lat: 47.69042795,
              lon: -122.35045885,
              categories: ["service.beauty.hairdresser"],
              datasource: { sourcename: "openstreetmap", raw: { osm_type: "w", osm_id: 491979147 } },
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const results = await client.searchPlaces({
      center: { lat: 47.6904, lng: -122.3505 },
      radiusMeters: 100,
      categories: ["service.beauty.hairdresser"],
    });

    expect(results[0].osmType).toBe("w");
    expect(results[0].osmId).toBe(491979147);
  });

  it("builds a proximity-biased searchText request and maps the FeatureCollection response", async () => {
    // Regression test: the Geocoding API returns a GeoJSON FeatureCollection
    // (features[].properties), same top-level shape as the Places API --
    // not a flat `results` array. An earlier version of searchText assumed
    // the latter and silently returned [] for every real search.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "geo123",
              name: "7-Eleven",
              formatted: "7314 Aurora Ave N, Seattle, WA",
              lat: 47.6826,
              lon: -122.344,
              category: "commercial.convenience",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const results = await client.searchText({ text: "7-Eleven", bias: { lat: 47.68, lng: -122.35 } });

    expect(results).toEqual([
      {
        placeId: "geo123",
        osmType: null,
        osmId: null,
        name: "7-Eleven",
        formattedAddress: "7314 Aurora Ave N, Seattle, WA",
        location: { lat: 47.6826, lng: -122.344 },
        categories: ["commercial.convenience"],
      },
    ]);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://api.geoapify.com/v1/geocode/search");
    expect(requestedUrl.searchParams.get("text")).toBe("7-Eleven");
    expect(requestedUrl.searchParams.get("bias")).toBe("proximity:-122.35,47.68");
  });

  it("reverseGeocode requests the reverse endpoint and keeps only named amenity results", async () => {
    // Live-verified (Ref 114 Phase 5): reverse-geocoding a legacy venue's
    // own coordinates can resolve to a nameless "building" result when
    // Geoapify has no POI tagged at that exact point -- that's not a match
    // and must not be surfaced as a false-confidence suggestion.
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "amenity-1",
              name: "Sully's Snowgoose Saloon",
              formatted: "6119 Phinney Avenue North, Seattle, WA 98103, United States of America",
              lat: 47.6737,
              lon: -122.3546,
              category: "catering.bar",
              result_type: "amenity",
            },
          },
          {
            properties: {
              place_id: "building-1",
              formatted: "100 NW 85th Street, Seattle, WA 98117, United States of America",
              lat: 47.69197,
              lon: -122.35869,
              result_type: "building",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const results = await client.reverseGeocode({ lat: 47.6737, lng: -122.3546 });

    expect(results).toEqual([
      {
        placeId: "amenity-1",
        // Geoapify's Geocoding API (v1/geocode/*) never exposes datasource.raw
        // at all, unlike the Places API -- see GeoapifyPlace.osmType's comment.
        osmType: null,
        osmId: null,
        name: "Sully's Snowgoose Saloon",
        formattedAddress: "6119 Phinney Avenue North, Seattle, WA 98103, United States of America",
        location: { lat: 47.6737, lng: -122.3546 },
        categories: ["catering.bar"],
      },
    ]);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://api.geoapify.com/v1/geocode/reverse");
    expect(requestedUrl.searchParams.get("lat")).toBe("47.6737");
    expect(requestedUrl.searchParams.get("lon")).toBe("-122.3546");
  });

  it("maps a place-details response, tolerating missing optional fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "abc123",
              name: "Book Larder",
              formatted: "4252 Fremont Ave N, Seattle, WA",
              categories: ["commercial.books"],
              opening_hours: "Mo-Fr 11:00-18:00",
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const details = await client.getPlaceDetails("abc123");

    expect(details).toEqual({
      placeId: "abc123",
      osmType: null,
      osmId: null,
      name: "Book Larder",
      formattedAddress: "4252 Fremont Ave N, Seattle, WA",
      location: { lat: 0, lng: 0 },
      categories: ["commercial.books"],
      phone: undefined,
      website: undefined,
      openingHours: "Mo-Fr 11:00-18:00",
      description: undefined,
    });
  });

  it("place-details extracts osm_type/osm_id from datasource.raw too", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              place_id: "5101d6f4ea6d965ec059f4c46cf15fd84740f00102f9018b01531d0000000092030a53616c6f6e204f70616c",
              name: "Salon Opal",
              formatted: "549 North 85th Street, Seattle, WA 98103, United States of America",
              categories: ["service.beauty.hairdresser"],
              datasource: { sourcename: "openstreetmap", raw: { osm_type: "w", osm_id: 491979147 } },
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new LiveGeoapifyClient("test-key");
    const details = await client.getPlaceDetails("some-id");

    expect(details.osmType).toBe("w");
    expect(details.osmId).toBe(491979147);
  });

  it("throws when getPlaceDetails returns no feature", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) })
    );

    const client = new LiveGeoapifyClient("test-key");
    await expect(client.getPlaceDetails("missing")).rejects.toThrow(
      "Geoapify getPlaceDetails: no feature returned for place_id missing"
    );
  });

  it("throws with status and body text when the HTTP call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "PERMISSION_DENIED" })
    );

    const client = new LiveGeoapifyClient("bad-key");
    await expect(
      client.searchPlaces({ center: { lat: 0, lng: 0 }, radiusMeters: 100, categories: ["catering.cafe"] })
    ).rejects.toThrow("Geoapify searchPlaces failed: 403 PERMISSION_DENIED");
  });
});
