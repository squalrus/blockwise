import { haversineMeters, type LatLng } from "./geo";
import type {
  GeoapifyPlace,
  GeoapifyPlaceDetails,
  GeoapifyPlaceDetailsClient,
  GeoapifyPlacesClient,
  GeoapifySearchParams,
  GeoapifySearchTextParams,
  GeoapifyTextSearchClient,
} from "./geoapifyClient";

// Fixture data for building/testing the sync pipeline without a real
// GEOAPIFY_API_KEY, in the same shape LiveGeoapifyClient returns --
// OSM-style dotted categories, no businessStatus equivalent. Deliberately
// includes the same edge cases the pipeline needs to handle correctly: a
// near-duplicate pair for the dedup pass, a place outside the Phinneywood
// boundary for the point-in-polygon filter, and an unmapped category for
// the "flag rather than guess" path.
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

export class MockGeoapifyClient
  implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient, GeoapifyTextSearchClient
{
  async searchPlaces(_params: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
    return FIXTURE_PLACES;
  }

  // Matches by substring against the fixture names rather than always
  // returning everything -- so local dev without a GEOAPIFY_API_KEY still
  // exercises the "nothing found" path investigate.ts (BACKLOG.md Ref 96)
  // exists to diagnose, not just the "found it" path.
  async searchText({ text }: GeoapifySearchTextParams): Promise<GeoapifyPlace[]> {
    const query = text.trim().toLowerCase();
    if (!query) return [];
    return FIXTURE_PLACES.filter((place) => place.name?.toLowerCase().includes(query));
  }

  // Nearest fixture within 50m, mirroring LiveGeoapifyClient's real-world
  // behavior of resolving to whatever's physically closest to the point --
  // empty when nothing fixture-shaped is nearby, same "nothing found" path
  // as searchText above.
  async reverseGeocode(point: LatLng): Promise<GeoapifyPlace[]> {
    const nearest = FIXTURE_PLACES.filter((place) => haversineMeters(point, place.location) <= 50);
    return nearest;
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
