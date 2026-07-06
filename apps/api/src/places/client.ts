import type { LatLng } from "./geo";

// Basic Data fields only (README §1.1/§1.5) -- Contact/Atmosphere fields are
// never requested here, only lazily via VenueEnrichmentCache when a user
// opens a venue detail page.
const BASIC_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.businessStatus",
].join(",");

export interface RawGooglePlace {
  id: string;
  displayName: { text: string; languageCode?: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
  primaryType?: string;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
}

export interface SearchNearbyParams {
  center: LatLng;
  radiusMeters: number;
  // Restricts results to these Google place types (README §2's taxonomy is
  // the source of this list in practice, via sync.ts) -- without it, Nearby
  // Search returns every establishment nearby, not just the commercial
  // venues this app is scoped to: an unrestricted Phinneywood sync pulled in
  // schools, churches, and apartment buildings alongside actual businesses.
  includedTypes?: string[];
}

export interface GooglePlacesClient {
  searchNearby(params: SearchNearbyParams): Promise<RawGooglePlace[]>;
}

// Nearby Search (New) caps results at 20 with no pagination cursor -- even
// after restricting to includedTypes and tiling the search area (see
// generateCoverageGrid in geo.ts), a dense tile can still hit this cap.
// syncNeighborhoodPlaces reports how many tiles saturated so that's visible
// per run rather than silently missing venues.
export class LivePlacesClient implements GooglePlacesClient {
  constructor(private readonly apiKey: string) {}

  async searchNearby({
    center,
    radiusMeters,
    includedTypes,
  }: SearchNearbyParams): Promise<RawGooglePlace[]> {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": BASIC_FIELD_MASK,
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
        ...(includedTypes && includedTypes.length > 0 ? { includedTypes } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Places searchNearby failed: ${response.status} ${await response.text()}`
      );
    }

    const body = (await response.json()) as { places?: RawGooglePlace[] };
    return body.places ?? [];
  }
}
