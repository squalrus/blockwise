import { buildGeoapifyCategoryIndex, matchCategory, type CategoryRecord } from "./categorize";
import type { GeoapifyPlace, GeoapifyPlacesClient } from "./geoapifyClient";
import { generateCoverageGrid, isPointInPolygon, subdivideCircle, type GeoJsonPolygon, type LatLng } from "./geo";

// Small enough that a dense commercial block is unlikely to exceed a
// single tile's result cap (confirmed necessary in practice -- a single
// circle covering all of Phinneywood hit Google's old 20-result cap
// immediately; Geoapify's real per-tile saturation behavior at the higher
// cap below hasn't been observed against a real dense area yet).
const DEFAULT_TILE_RADIUS_METERS = 400;
// Geoapify's Places API documents a default `limit` of 20 and a maximum of
// 500 per request (no pagination cursor beyond that), unlike Google's fixed
// 20-result Nearby Search cap -- explicitly requested via `limit` below
// rather than relying on the default. Real-world saturation behavior at
// this cap is unverified (docs/plans/20260828-geoapify-migration-plan.md Phase 0's tiled
// bulk-search ceiling is still an open live-verification item), so this is
// a documented-default starting point, not a load-tested one.
const PLACES_API_RESULT_CAP = 500;
// When a tile+category call comes back saturated (BACKLOG.md Ref 73: dense
// areas silently drop venues past the cap), re-query that same circle as a
// fixed fan-out of 4 smaller, overlapping sub-circles (subdivideCircle) to
// catch the overflow. Bounded by depth AND by a fixed branching factor --
// depth alone isn't enough: an earlier version reused generateCoverageGrid's
// full-grid tiling for sub-tiles (~11 per level instead of 4) and blew a
// real Google Cloud project's "SearchNearbyRequest per minute" quota on one
// review run against a real, moderately dense neighborhood -- kept at the
// same fixed branching factor for Geoapify since its own per-minute request
// limits aren't yet characterized either. At branching factor 4, worst case
// (every tile and sub-tile saturated) is 1 + 4 = 5 calls per originally-
// saturated tile -- depth capped at 1 rather than 2 to keep that worst case
// low.
const MAX_SUBTILE_DEPTH = 1;

interface TileSearchOutcome {
  results: GeoapifyPlace[];
  apiCallsMade: number;
  callsAtResultCap: number;
}

async function searchTileWithSubdivision(
  client: GeoapifyPlacesClient,
  center: LatLng,
  radiusMeters: number,
  categories: string[],
  depth: number
): Promise<TileSearchOutcome> {
  const results = await client.searchPlaces({ center, radiusMeters, categories, limit: PLACES_API_RESULT_CAP });
  const saturated = results.length >= PLACES_API_RESULT_CAP;

  if (!saturated || depth >= MAX_SUBTILE_DEPTH) {
    return { results, apiCallsMade: 1, callsAtResultCap: saturated ? 1 : 0 };
  }

  const subCircles = subdivideCircle(center, radiusMeters);

  const subOutcomes = await Promise.all(
    subCircles.map((sub) =>
      searchTileWithSubdivision(client, sub.center, sub.radiusMeters, categories, depth + 1)
    )
  );

  // Merge by place ID -- sub-circles overlap by design (subdivideCircle),
  // and the parent's own (capped) results are folded in too as a cheap safety
  // net in case Geoapify's ranking doesn't return a strict superset on retry.
  const merged = new Map<string, GeoapifyPlace>();
  for (const place of results) merged.set(place.placeId, place);
  for (const outcome of subOutcomes) {
    for (const place of outcome.results) merged.set(place.placeId, place);
  }

  return {
    results: [...merged.values()],
    apiCallsMade: 1 + subOutcomes.reduce((sum, o) => sum + o.apiCallsMade, 0),
    callsAtResultCap: 1 + subOutcomes.reduce((sum, o) => sum + o.callsAtResultCap, 0),
  };
}

export interface PlaceSearchCandidate {
  raw: GeoapifyPlace;
  name: string;
  location: LatLng;
  category: CategoryRecord | null;
}

export interface PlaceSearchResult {
  tilesQueried: number;
  apiCallsMade: number;
  callsAtResultCap: number;
  // No OSM/Geoapify equivalent to Google's businessStatus exists -- always 0
  // now (docs/plans/20260828-geoapify-migration-plan.md Phase 4, an accepted, explicitly-
  // called-out behavior change). A closed business only drops out once a
  // later sync no longer finds it, not proactively. Kept in the report
  // shape rather than removed so callers/consumers don't need a schema
  // change for a field that's simply always zero now.
  skippedClosedPermanently: number;
  skippedOutOfBoundary: number;
  // A place Geoapify matched to one of our category tags but that carries no
  // `name` in its own data -- almost always a road/way segment or a bare
  // address point mistagged with a category, not a real business/POI (a
  // genuinely nameless real venue would be exceedingly rare). Filtered here,
  // before the name-or-address fallback below, so an address string never
  // stands in for a name downstream -- previously these surfaced as
  // "New entries" on the Import review page labeled with nothing but a
  // street address (e.g. "2nd Avenue Northwest, Seattle, WA 98113").
  skippedNoName: number;
  unmappedTypes: { name: string; types: string[] }[];
  places: PlaceSearchCandidate[];
}

// The tiling/search/boundary-filter/categorize pipeline (README §1.4 steps
// 1-3), shared by the admin boundary-drawing dry-run preview (preview.ts --
// BACKLOG.md Ref 8, project plan §12.6) and the Import review/refresh flow
// (review.ts's reviewNeighborhoodLocations, which additionally dedupes
// against known locations, refreshes matches, and upserts new ones -- the
// standalone CLI sync script that used to live here (syncNeighborhoodPlaces)
// was retired once Import took over its one job of syncing an already-known
// venue's data, per the "rely on the admin UI for these kinds of changes"
// decision).
export async function searchPlacesInPolygon(
  polygon: GeoJsonPolygon,
  client: GeoapifyPlacesClient,
  categories: CategoryRecord[],
  tileRadiusMeters = DEFAULT_TILE_RADIUS_METERS
): Promise<PlaceSearchResult> {
  const tiles = generateCoverageGrid(polygon, tileRadiusMeters);

  const categoryIndex = buildGeoapifyCategoryIndex(categories);
  // Geoapify's Places API requires at least one non-empty `categories`
  // value per request (apidocs.geoapify.com/docs/places) -- there's no
  // wildcard/catch-all tag, unlike Google's old "omit includedTypes for
  // unrestricted" behavior. Every distinct tag configured across the
  // taxonomy (category.source_mapping_json.geoapify) is sent, which is both
  // the closest practical equivalent to "unrestricted" and fixes matching:
  // a place tagged outside this list simply isn't returned at all, rather
  // than coming back and failing to match downstream.
  const searchCategories = [...new Set(categoryIndex.map((entry) => entry.tag))];

  const outcomes = await Promise.all(
    tiles.map((center) => searchTileWithSubdivision(client, center, tileRadiusMeters, searchCategories, 0))
  );

  // Tiles overlap by design (see generateCoverageGrid), and a saturated tile
  // subdivided into sub-circles (above) can also repeat a place -- collapse
  // by Geoapify's place ID before the per-place pipeline below runs.
  const rawPlacesById = new Map<string, GeoapifyPlace>();
  for (const { results } of outcomes) {
    for (const place of results) rawPlacesById.set(place.placeId, place);
  }

  let skippedOutOfBoundary = 0;
  let skippedNoName = 0;
  const unmappedTypes: { name: string; types: string[] }[] = [];
  const places: PlaceSearchCandidate[] = [];

  for (const place of rawPlacesById.values()) {
    const location = place.location;
    if (!isPointInPolygon(location, polygon)) {
      skippedOutOfBoundary++;
      continue;
    }
    if (!place.name) {
      skippedNoName++;
      continue;
    }

    const name = place.name;
    const category = matchCategory({ categories: place.categories }, categoryIndex) ?? null;
    // Flagged every run a venue's category is still unmapped, not just the
    // run that first inserted it -- otherwise re-syncing a previously-seen,
    // still-uncategorized venue silently drops off this report.
    if (!category) unmappedTypes.push({ name, types: place.categories });

    places.push({ raw: place, name, location, category });
  }

  return {
    tilesQueried: tiles.length,
    apiCallsMade: outcomes.reduce((sum, o) => sum + o.apiCallsMade, 0),
    callsAtResultCap: outcomes.reduce((sum, o) => sum + o.callsAtResultCap, 0),
    skippedClosedPermanently: 0,
    skippedOutOfBoundary,
    skippedNoName,
    unmappedTypes,
    places,
  };
}

