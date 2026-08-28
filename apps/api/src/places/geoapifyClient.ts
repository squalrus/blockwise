import type { LatLng } from "./geo";

// New, standalone module -- not yet wired into sync.ts/app.ts (see
// docs/geoapify-migration-plan.md Phase 1). Deliberately does not reuse or
// extend client.ts's Google-shaped types/interfaces, so this can be built
// and tested in isolation without touching the live Google Places pipeline.
// Names get the "Geoapify" prefix for the same reason -- once Phase 4/8
// actually replaces client.ts, these become the provider-neutral names.

export interface GeoapifyPlace {
  placeId: string;
  name: string | null;
  formattedAddress: string;
  location: LatLng;
  // Geoapify/OSM categories, e.g. "catering.cafe.coffee_shop" -- no
  // primaryType equivalent exists (confirmed live, see
  // docs/location-services-comparison.md#live-verification), so callers
  // needing a single "best" category must pick a strategy over this array
  // themselves rather than relying on an index-0 convention here.
  categories: string[];
}

export interface GeoapifySearchParams {
  center: LatLng;
  radiusMeters: number;
  // Geoapify OSM category tags (comma-joined into the request's
  // `categories` param) -- unlike Google's includedTypes, the per-request
  // count ceiling here is unconfirmed (docs/geoapify-migration-plan.md
  // Phase 0 still open item), so callers shouldn't assume Google's 50-type
  // chunking limit applies.
  categories: string[];
  // Geoapify bills 1 credit per request plus 1 credit per additional 20
  // results -- defaults to Geoapify's own default (20) when omitted, not
  // hardcoded here, so a caller can raise it deliberately and pay for it
  // knowingly rather than this client silently making that cost decision.
  limit?: number;
}

export interface GeoapifyPlacesClient {
  searchPlaces(params: GeoapifySearchParams): Promise<GeoapifyPlace[]>;
}

export interface GeoapifyPlaceDetails {
  placeId: string;
  name: string | null;
  formattedAddress: string;
  categories: string[];
  phone?: string;
  website?: string;
  // Raw OSM opening_hours syntax (e.g. "Mo-Fr 11:00-18:00; Sa 11:00-17:00"),
  // not parsed here -- matches how client.ts leaves regularOpeningHours
  // unparsed for enrichment/refresh.ts to interpret.
  openingHours?: string;
  description?: string;
}

// Deliberately has no rating/reviews/photo fields at all -- ratings,
// reviews, and photo galleries are removed as product features in this
// migration (docs/geoapify-migration-plan.md), not just deprioritized, so
// the DTO shape itself prevents them from silently coming back through a
// future field-mask-style addition.
export interface GeoapifyPlaceDetailsClient {
  getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails>;
}

interface GeoapifyFeatureProperties {
  place_id: string;
  name?: string;
  formatted?: string;
  lat?: number;
  lon?: number;
  categories?: string[];
  contact?: { phone?: string };
  website?: string;
  opening_hours?: string;
  description?: string;
}

interface GeoapifyFeatureCollection {
  features?: { properties: GeoapifyFeatureProperties }[];
}

function toGeoapifyPlace(properties: GeoapifyFeatureProperties): GeoapifyPlace {
  return {
    placeId: properties.place_id,
    name: properties.name ?? null,
    formattedAddress: properties.formatted ?? "",
    location: { lat: properties.lat ?? 0, lng: properties.lon ?? 0 },
    categories: properties.categories ?? [],
  };
}

function toGeoapifyPlaceDetails(properties: GeoapifyFeatureProperties): GeoapifyPlaceDetails {
  return {
    placeId: properties.place_id,
    name: properties.name ?? null,
    formattedAddress: properties.formatted ?? "",
    categories: properties.categories ?? [],
    phone: properties.contact?.phone,
    website: properties.website,
    openingHours: properties.opening_hours,
    description: properties.description,
  };
}

export class LiveGeoapifyClient implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient {
  constructor(private readonly apiKey: string) {}

  async searchPlaces({ center, radiusMeters, categories, limit }: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
    const params = new URLSearchParams({
      categories: categories.join(","),
      filter: `circle:${center.lng},${center.lat},${radiusMeters}`,
      bias: `proximity:${center.lng},${center.lat}`,
      apiKey: this.apiKey,
    });
    if (limit !== undefined) params.set("limit", String(limit));

    const response = await fetch(`https://api.geoapify.com/v2/places?${params}`);
    if (!response.ok) {
      throw new Error(`Geoapify searchPlaces failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as GeoapifyFeatureCollection;
    return (body.features ?? []).map((feature) => toGeoapifyPlace(feature.properties));
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    const params = new URLSearchParams({
      id: placeId,
      features: "details",
      apiKey: this.apiKey,
    });

    const response = await fetch(`https://api.geoapify.com/v2/place-details?${params}`);
    if (!response.ok) {
      throw new Error(`Geoapify getPlaceDetails failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as GeoapifyFeatureCollection;
    const feature = body.features?.[0];
    if (!feature) {
      throw new Error(`Geoapify getPlaceDetails: no feature returned for place_id ${placeId}`);
    }

    return toGeoapifyPlaceDetails(feature.properties);
  }
}
