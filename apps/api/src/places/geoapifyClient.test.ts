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
      name: "Book Larder",
      formattedAddress: "4252 Fremont Ave N, Seattle, WA",
      categories: ["commercial.books"],
      phone: undefined,
      website: undefined,
      openingHours: "Mo-Fr 11:00-18:00",
      description: undefined,
    });
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
