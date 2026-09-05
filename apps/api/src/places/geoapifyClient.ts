import type { LatLng } from "./geo";

// The real Places client (docs/plans/20260828-geoapify-migration-plan.md) -- wired into
// sync.ts/preview.ts/investigate.ts/enrichment/refresh.ts and app.ts's
// getPlacesClient() as of Phase 4, replacing the old Google-shaped
// client.ts (deleted). Names keep the "Geoapify" prefix rather than being
// renamed to something provider-neutral now that there's only one provider,
// since "Geoapify place" reads more clearly than a bare "Place" would next
// to the Postgres-side geoapify_place_id column.

export interface GeoapifyPlace {
  placeId: string;
  name: string | null;
  formattedAddress: string;
  location: LatLng;
  // Geoapify/OSM categories, e.g. "catering.cafe.coffee_shop" -- no
  // primaryType equivalent exists (confirmed live, see
  // docs/plans/20260828-location-services-comparison.md#live-verification), so callers
  // needing a single "best" category must pick a strategy over this array
  // themselves rather than relying on an index-0 convention here.
  categories: string[];
  // OpenStreetMap's own type+id pair (from datasource.raw), e.g. "w" +
  // 491979147 -- the actual stable identity for a place; placeId itself is
  // NOT (live-verified 2026-09-04: the same physical business returned
  // three different placeId strings from three different Geoapify endpoints
  // -- v1/geocode/reverse, v2/places, v2/place-details -- at the same
  // instant). Only present for OSM-sourced results from the Places API
  // (v2/places) and Place Details (v2/place-details); Geoapify's Geocoding
  // API (v1/geocode/search, v1/geocode/reverse -- used by investigate.ts and
  // the standalone Reassign Place ID panel's candidates) doesn't expose
  // datasource.raw at all, so those always come back null here. Optional
  // (rather than required-nullable) purely so hand-built test fixtures
  // don't all need updating for a field production code always sets
  // explicitly either way; treat an omitted value the same as null, never
  // as "unknown."
  osmType?: string | null;
  osmId?: number | null;
}

export interface GeoapifySearchParams {
  center: LatLng;
  radiusMeters: number;
  // Geoapify OSM category tags (comma-joined into the request's
  // `categories` param) -- unlike Google's includedTypes, the per-request
  // count ceiling here is unconfirmed (docs/plans/20260828-geoapify-migration-plan.md
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

export interface GeoapifySearchTextParams {
  text: string;
  // Soft hint (Geoapify's Geocoding API `bias=proximity:lon,lat`, not a
  // hard filter) -- unlike searchPlaces' `filter=circle:...`, a real match
  // outside the radius can still surface, which is what investigate.ts's
  // "why isn't this venue showing up" lookup needs: a place ranked as
  // slightly outside the neighborhood is still worth showing an admin, not
  // silently dropped.
  bias?: LatLng;
}

// Free-text lookup for investigate.ts (BACKLOG.md Ref 96) -- backed by
// Geoapify's Geocoding API (v1/geocode/search), not the Places API, since
// Geoapify's Places API has no free-text query mode (only category +
// location filters). Geocoding primarily indexes addresses but returns POI
// results too via its `category`/`result_type: "amenity"` fields, which is
// enough for "find this business by name."
//
// reverseGeocode (v1/geocode/reverse, same API family) is the Geoapify
// migration's coordinate-based match (BACKLOG.md Ref 114 Phase 5): given a
// legacy-ID location's own stored lat/lng, asks "what's physically here
// today?" instead of matching by name -- catches a rebranded/renamed
// business a name-similarity search would never connect (live-verified:
// "Sullys Ale House LLC" -> "Sully's Snowgoose Saloon", "La Conasupo
// Taqueria & Snack Shop" -> "Laem Buri", both 1-4m from the stored point).
export interface GeoapifyTextSearchClient {
  searchText(params: GeoapifySearchTextParams): Promise<GeoapifyPlace[]>;
  reverseGeocode(point: LatLng): Promise<GeoapifyPlace[]>;
}

export interface GeoapifyPlaceDetails {
  placeId: string;
  // See GeoapifyPlace.osmType's comment -- Place Details is one of the two
  // endpoints that does carry this.
  osmType?: string | null;
  osmId?: number | null;
  name: string | null;
  formattedAddress: string;
  // Absent (rather than nullable) purely to limit pre-existing hand-built
  // test fixtures (locations.test.ts, refresh.test.ts) that don't exercise
  // basic-info refresh -- production code always sets it. Added for the
  // Reassign/Import basic-info-refresh feature (see
  // locations.ts's refreshLocationBasicInfo), which needs fresh lat/lng from
  // the same Place Details call already made for identity resolution.
  location?: LatLng;
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
// migration (docs/plans/20260828-geoapify-migration-plan.md), not just deprioritized, so
// the DTO shape itself prevents them from silently coming back through a
// future field-mask-style addition.
export interface GeoapifyPlaceDetailsClient {
  getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails>;
}

// Present on v2/places and v2/place-details results sourced from
// OpenStreetMap (the overwhelming majority) -- absent for results from
// whatever other data layers Geoapify blends in, which is the one case
// osmType/osmId legitimately come back null from a Places-API-family
// response (see GeoapifyPlace.osmType's comment for the Geocoding-API case).
interface GeoapifyDatasource {
  sourcename?: string;
  raw?: { osm_type?: string; osm_id?: number };
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
  datasource?: GeoapifyDatasource;
}

interface GeoapifyFeatureCollection {
  features?: { properties: GeoapifyFeatureProperties }[];
}

// Geocoding API's format=json (the default) returns a GeoJSON
// FeatureCollection, same top-level shape as Places API's response
// (confirmed live -- an earlier version of this code assumed a flat
// `results` array, which silently returned zero results for every search)
// -- geocode search results have no `categories` array though, just a
// single `category` string (apidocs.geoapify.com/docs/geocoding),
// normalized to GeoapifyPlace's array shape below.
interface GeoapifyGeocodeResult {
  place_id: string;
  name?: string;
  formatted?: string;
  lat?: number;
  lon?: number;
  category?: string;
  // "amenity" means Geoapify has a named POI at this point; "building",
  // "street", etc. mean it only resolved to a bare address/geometry with no
  // business identity -- reverseGeocode filters to amenity-with-a-name only
  // (live-verified: reverse-geocoding a legacy venue's own coordinates can
  // resolve to a nameless "building" when Geoapify has no POI tagged there,
  // which reverseGeocode's caller must not treat as a match).
  result_type?: string;
}

interface GeoapifyGeocodeFeatureCollection {
  features?: { properties: GeoapifyGeocodeResult }[];
}

function toGeoapifyPlaceFromGeocode(result: GeoapifyGeocodeResult): GeoapifyPlace {
  return {
    placeId: result.place_id,
    // Geoapify's Geocoding API never exposes datasource.raw -- see
    // GeoapifyPlace.osmType's comment.
    osmType: null,
    osmId: null,
    name: result.name ?? null,
    formattedAddress: result.formatted ?? "",
    location: { lat: result.lat ?? 0, lng: result.lon ?? 0 },
    categories: result.category ? [result.category] : [],
  };
}

function toGeoapifyPlace(properties: GeoapifyFeatureProperties): GeoapifyPlace {
  return {
    placeId: properties.place_id,
    osmType: properties.datasource?.raw?.osm_type ?? null,
    osmId: properties.datasource?.raw?.osm_id ?? null,
    name: properties.name ?? null,
    formattedAddress: properties.formatted ?? "",
    location: { lat: properties.lat ?? 0, lng: properties.lon ?? 0 },
    categories: properties.categories ?? [],
  };
}

function toGeoapifyPlaceDetails(properties: GeoapifyFeatureProperties): GeoapifyPlaceDetails {
  return {
    placeId: properties.place_id,
    osmType: properties.datasource?.raw?.osm_type ?? null,
    osmId: properties.datasource?.raw?.osm_id ?? null,
    name: properties.name ?? null,
    formattedAddress: properties.formatted ?? "",
    location: { lat: properties.lat ?? 0, lng: properties.lon ?? 0 },
    categories: properties.categories ?? [],
    phone: properties.contact?.phone,
    website: properties.website,
    openingHours: properties.opening_hours,
    description: properties.description,
  };
}

export class LiveGeoapifyClient
  implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient, GeoapifyTextSearchClient
{
  constructor(private readonly apiKey: string) {}

  async searchText({ text, bias }: GeoapifySearchTextParams): Promise<GeoapifyPlace[]> {
    const params = new URLSearchParams({ text, apiKey: this.apiKey });
    if (bias) params.set("bias", `proximity:${bias.lng},${bias.lat}`);

    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`);
    if (!response.ok) {
      throw new Error(`Geoapify searchText failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as GeoapifyGeocodeFeatureCollection;
    return (body.features ?? []).map((feature) => toGeoapifyPlaceFromGeocode(feature.properties));
  }

  async reverseGeocode({ lat, lng }: LatLng): Promise<GeoapifyPlace[]> {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), apiKey: this.apiKey });

    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`);
    if (!response.ok) {
      throw new Error(`Geoapify reverseGeocode failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as GeoapifyGeocodeFeatureCollection;
    return (body.features ?? [])
      .filter((f) => f.properties.result_type === "amenity" && f.properties.name)
      .map((feature) => toGeoapifyPlaceFromGeocode(feature.properties));
  }

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
