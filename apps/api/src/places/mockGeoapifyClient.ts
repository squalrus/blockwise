import type {
  GeoapifyPlace,
  GeoapifyPlaceDetails,
  GeoapifyPlaceDetailsClient,
  GeoapifyPlacesClient,
  GeoapifySearchParams,
} from "./geoapifyClient";

// Mirrors mockClient.ts's fixture set (same venues/locations, so the two
// mock clients stay directly comparable) but in Geoapify's shape --
// OSM-style dotted categories instead of Google types, no primaryType, no
// businessStatus. Keeps the same deliberate edge cases: a near-duplicate
// pair for the dedup pass, a place outside the Phinneywood boundary for the
// point-in-polygon filter, and an unmapped category for the "flag rather
// than guess" path.
const FIXTURE_PLACES: GeoapifyPlace[] = [
  {
    placeId: "geoapify-mock-diesel-fuel-coffee",
    name: "Diesel Fuel Coffee",
    formattedAddress: "5629 University Way NE, Seattle, WA",
    location: { lat: 47.6772, lng: -122.3549 },
    categories: ["catering.cafe.coffee_shop"],
  },
  {
    placeId: "geoapify-mock-diesel-fuel-coffee-dup",
    name: "Diesel Fuel Coffee Shop",
    formattedAddress: "5629 University Way NE, Seattle, WA",
    location: { lat: 47.67722, lng: -122.35492 },
    categories: ["catering.cafe.coffee_shop"],
  },
  {
    placeId: "geoapify-mock-herkimer-coffee",
    name: "Herkimer Coffee",
    formattedAddress: "7320 Greenwood Ave N, Seattle, WA",
    location: { lat: 47.6816, lng: -122.3552 },
    categories: ["catering.cafe.coffee_shop"],
  },
  {
    placeId: "geoapify-mock-original-bakery",
    name: "Original Bakery",
    formattedAddress: "6603 Phinney Ave N, Seattle, WA",
    location: { lat: 47.6742, lng: -122.3555 },
    categories: ["catering.cafe.bakery"],
  },
  {
    placeId: "geoapify-mock-mustard-seed-park",
    name: "Mustard Seed Park",
    formattedAddress: "N 80th St & Fremont Ave N, Seattle, WA",
    location: { lat: 47.685, lng: -122.3495 },
    categories: ["leisure.park"],
  },
  {
    placeId: "geoapify-mock-widget-repair",
    name: "Widget Electronics Repair",
    formattedAddress: "7500 Greenwood Ave N, Seattle, WA",
    location: { lat: 47.6822, lng: -122.3548 },
    categories: ["service.electronics_repair"],
  },
  {
    placeId: "geoapify-mock-outside-boundary-cafe",
    name: "Outside The Boundary Cafe",
    formattedAddress: "Capitol Hill, Seattle, WA",
    location: { lat: 47.6, lng: -122.3 },
    categories: ["catering.cafe"],
  },
];

const FIXTURE_PLACE_DETAILS: Record<string, GeoapifyPlaceDetails> = {
  "geoapify-mock-diesel-fuel-coffee": {
    placeId: "geoapify-mock-diesel-fuel-coffee",
    name: "Diesel Fuel Coffee",
    formattedAddress: "5629 University Way NE, Seattle, WA",
    categories: ["catering.cafe.coffee_shop"],
    website: "https://dieselfuelcoffee.example",
    openingHours: "Mo-Su 06:00-19:00",
  },
  "geoapify-mock-herkimer-coffee": {
    placeId: "geoapify-mock-herkimer-coffee",
    name: "Herkimer Coffee",
    formattedAddress: "7320 Greenwood Ave N, Seattle, WA",
    categories: ["catering.cafe.coffee_shop"],
    openingHours: "Mo-Fr 06:30-18:00; Sa-Su 07:00-18:00",
  },
  "geoapify-mock-original-bakery": {
    placeId: "geoapify-mock-original-bakery",
    name: "Original Bakery",
    formattedAddress: "6603 Phinney Ave N, Seattle, WA",
    categories: ["catering.cafe.bakery"],
    phone: "+1 206-555-0148",
  },
};

export class MockGeoapifyClient implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient {
  async searchPlaces(_params: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
    return FIXTURE_PLACES;
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    return (
      FIXTURE_PLACE_DETAILS[placeId] ?? {
        placeId,
        name: null,
        formattedAddress: "",
        categories: [],
      }
    );
  }
}
