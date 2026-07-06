import type { GooglePlacesClient, RawGooglePlace, SearchNearbyParams } from "./client";

// Fixture data for building/testing the sync pipeline without a real
// GOOGLE_PLACES_API_KEY (BACKLOG "Data layer MVP": "built against mocked
// responses first"). Deliberately includes cases the pipeline needs to
// handle correctly:
//   - a near-duplicate pair (same business, slightly different name/coords)
//     for the dedup pass to catch
//   - a place outside the Phinneywood boundary polygon for the point-in-
//     polygon filter to drop
//   - a place with a Google type not in the category taxonomy, for the
//     "flag unmapped rather than guess" path
const FIXTURE_PLACES: RawGooglePlace[] = [
  {
    id: "mock-diesel-fuel-coffee",
    displayName: { text: "Diesel Fuel Coffee" },
    formattedAddress: "5629 University Way NE, Seattle, WA",
    location: { latitude: 47.6772, longitude: -122.3549 },
    types: ["cafe", "coffee_shop", "food"],
    primaryType: "cafe",
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-diesel-fuel-coffee-dup",
    displayName: { text: "Diesel Fuel Coffee Shop" },
    formattedAddress: "5629 University Way NE, Seattle, WA",
    location: { latitude: 47.67722, longitude: -122.35492 },
    types: ["cafe", "coffee_shop"],
    primaryType: "cafe",
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-herkimer-coffee",
    displayName: { text: "Herkimer Coffee" },
    formattedAddress: "7320 Greenwood Ave N, Seattle, WA",
    location: { latitude: 47.6816, longitude: -122.3552 },
    types: ["cafe", "coffee_shop"],
    primaryType: "coffee_shop",
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-original-bakery",
    displayName: { text: "Original Bakery" },
    formattedAddress: "6603 Phinney Ave N, Seattle, WA",
    location: { latitude: 47.6742, longitude: -122.3555 },
    types: ["bakery", "food"],
    primaryType: "bakery",
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-mustard-seed-park",
    displayName: { text: "Mustard Seed Park" },
    formattedAddress: "N 80th St & Fremont Ave N, Seattle, WA",
    location: { latitude: 47.685, longitude: -122.3495 },
    types: ["park", "point_of_interest"],
    primaryType: "park",
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-widget-repair",
    displayName: { text: "Widget Electronics Repair" },
    formattedAddress: "7500 Greenwood Ave N, Seattle, WA",
    location: { latitude: 47.6822, longitude: -122.3548 },
    types: ["electronics_repair"],
    businessStatus: "OPERATIONAL",
  },
  {
    id: "mock-outside-boundary-cafe",
    displayName: { text: "Outside The Boundary Cafe" },
    formattedAddress: "Capitol Hill, Seattle, WA",
    location: { latitude: 47.6, longitude: -122.3 },
    types: ["cafe", "coffee_shop"],
    primaryType: "cafe",
    businessStatus: "OPERATIONAL",
  },
];

export class MockPlacesClient implements GooglePlacesClient {
  async searchNearby(_params: SearchNearbyParams): Promise<RawGooglePlace[]> {
    return FIXTURE_PLACES;
  }
}
