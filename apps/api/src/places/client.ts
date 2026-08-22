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

export interface SearchTextParams {
  textQuery: string;
  // Text Search's locationBias (unlike Nearby Search's locationRestriction)
  // is a soft hint, not a hard filter -- a real match just outside the
  // circle can still surface, which is what BACKLOG.md Ref 96's "why isn't
  // this venue showing up" investigation needs: a place Google ranks as
  // slightly outside the neighborhood center is still worth showing an
  // admin, not silently dropped the way Nearby Search would drop it.
  locationBias?: { center: LatLng; radiusMeters: number };
}

// Free-text lookup (BACKLOG.md Ref 96) for investigating a single
// admin-reported missing venue -- distinct from searchNearby, which powers
// the boundary-wide tiled sync/review sweep and only returns Google types
// the category taxonomy maps. Text Search has no such type restriction, so
// it can surface a place the Nearby-Search-based flows would never return.
export interface PlacesTextSearchClient {
  searchText(params: SearchTextParams): Promise<RawGooglePlace[]>;
}

// Contact/Atmosphere fields only (README §1.1/§1.4 step 4) -- requested
// lazily per-venue when a detail page is opened, never as part of the
// Basic-field sync above, since these fields are billed at a much higher
// per-call rate. `reviews`/`photos` already put every call at Google's top
// "Enterprise + Atmosphere" SKU tier (BACKLOG.md Ref 41), so the fields added
// below cost nothing extra per call -- they live at or below that same tier.
const DETAIL_FIELD_MASK = [
  "id",
  "rating",
  "priceLevel",
  "reviews",
  "photos",
  "nationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "editorialSummary",
  "delivery",
  "dineIn",
  "takeout",
  "outdoorSeating",
  "goodForChildren",
  "reservable",
].join(",");

export interface RawPlaceDetails {
  id: string;
  rating?: number;
  priceLevel?: string;
  reviews?: {
    rating?: number;
    text?: { text: string };
    authorAttribution?: { displayName?: string };
    publishTime?: string;
  }[];
  photos?: { name: string }[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  editorialSummary?: { text?: string };
  delivery?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  outdoorSeating?: boolean;
  goodForChildren?: boolean;
  reservable?: boolean;
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
export class LivePlacesClient implements GooglePlacesClient, PlaceDetailsClient, PlacesTextSearchClient {
  constructor(private readonly apiKey: string) {}

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    // Places API (New) has no query param for review order (unlike the
    // legacy API's reviews_sort) -- it always returns Google's "most
    // relevant" ordering. The venue page wants newest-first (see
    // EnrichmentReviews.tsx), so that sort happens client-side in
    // enrichment/refresh.ts's mapPlaceDetails instead.
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": DETAIL_FIELD_MASK,
        },
      }
    );

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

  async searchText({ textQuery, locationBias }: SearchTextParams): Promise<RawGooglePlace[]> {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": BASIC_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        ...(locationBias
          ? {
              locationBias: {
                circle: {
                  center: { latitude: locationBias.center.lat, longitude: locationBias.center.lng },
                  radius: locationBias.radiusMeters,
                },
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Places searchText failed: ${response.status} ${await response.text()}`
      );
    }

    const body = (await response.json()) as { places?: RawGooglePlace[] };
    return body.places ?? [];
  }
}
