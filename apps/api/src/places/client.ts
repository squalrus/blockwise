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

// Contact/Atmosphere fields only (README §1.1/§1.4 step 4) -- requested
// lazily per-venue when a detail page is opened, never as part of the
// Basic-field sync above, since these fields are billed at a much higher
// per-call rate.
const DETAIL_FIELD_MASK = ["id", "rating", "priceLevel", "reviews", "photos"].join(",");

export interface RawPlaceDetails {
  id: string;
  rating?: number;
  priceLevel?: string;
  reviews?: { text?: { text: string } }[];
  photos?: { name: string }[];
}

export interface PhotoMedia {
  contentType: string;
  data: ArrayBuffer;
}

export interface PlaceDetailsClient {
  getPlaceDetails(placeId: string): Promise<RawPlaceDetails>;
  // Places API (New) returns a photo *reference* (photos[].name), not a
  // fetchable URL. Building the actual media URL requires the API key, so
  // this fetches the image bytes server-side rather than handing callers a
  // URL to embed directly -- an embedded URL would leak the API key to
  // every browser that loads a venue detail page (see venues/app route,
  // which proxies this instead of exposing photo_url as a raw Google link).
  fetchPhotoMedia(photoReference: string): Promise<PhotoMedia>;
}

// Nearby Search (New) caps results at 20 with no pagination cursor -- even
// after restricting to includedTypes and tiling the search area (see
// generateCoverageGrid in geo.ts), a dense tile can still hit this cap.
// syncNeighborhoodPlaces reports how many tiles saturated so that's visible
// per run rather than silently missing venues.
export class LivePlacesClient implements GooglePlacesClient, PlaceDetailsClient {
  constructor(private readonly apiKey: string) {}

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": DETAIL_FIELD_MASK,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Google Places getPlaceDetails failed: ${response.status} ${await response.text()}`
      );
    }

    return (await response.json()) as RawPlaceDetails;
  }

  async fetchPhotoMedia(photoReference: string): Promise<PhotoMedia> {
    const response = await fetch(
      `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=800&key=${this.apiKey}`
    );

    if (!response.ok) {
      throw new Error(
        `Google Places photo media fetch failed: ${response.status} ${await response.text()}`
      );
    }

    return {
      contentType: response.headers.get("content-type") ?? "image/jpeg",
      data: await response.arrayBuffer(),
    };
  }

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
