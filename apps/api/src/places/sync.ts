import { buildGoogleTypeIndex, matchCategory } from "./categorize";
import type { GooglePlacesClient, RawGooglePlace } from "./client";
import { findDuplicate } from "./dedup";
import { generateCoverageGrid, isPointInPolygon } from "./geo";
import type { PlacesRepository } from "./repository";

// Small enough that a dense commercial block is unlikely to exceed Nearby
// Search's 20-result cap within one tile (confirmed necessary in practice --
// a single circle covering all of Phinneywood hit that cap immediately).
const DEFAULT_TILE_RADIUS_METERS = 400;
const PLACES_API_RESULT_CAP = 20;
// Nearby Search also caps includedTypes at 50 per call (confirmed in
// practice once the taxonomy grew past it) -- chunk rather than trim the
// taxonomy, since more chunks only cost extra requests, not coverage.
const MAX_INCLUDED_TYPES_PER_REQUEST = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export interface SyncReport {
  tilesQueried: number;
  apiCallsMade: number;
  callsAtResultCap: number;
  inserted: string[];
  updated: string[];
  skippedOutOfBoundary: number;
  skippedClosedPermanently: number;
  skippedClaimed: string[];
  skippedDuplicates: { candidate: string; matchedExisting: string }[];
  unmappedTypes: { name: string; types: string[] }[];
}

function emptyReport(): SyncReport {
  return {
    tilesQueried: 0,
    apiCallsMade: 0,
    callsAtResultCap: 0,
    inserted: [],
    updated: [],
    skippedOutOfBoundary: 0,
    skippedClosedPermanently: 0,
    skippedClaimed: [],
    skippedDuplicates: [],
    unmappedTypes: [],
  };
}

// Runs the full ingestion pipeline (README §1.4 steps 1-3, 5) for one
// neighborhood: seed sync -> boundary filter -> dedup -> categorize ->
// upsert, respecting business-claimed venues as source-of-truth overrides.
// Enrichment (§1.4 step 4) is separate -- it happens on-demand from venue
// detail pages, not here.
export async function syncNeighborhoodPlaces(
  slug: string,
  client: GooglePlacesClient,
  repository: PlacesRepository,
  tileRadiusMeters = DEFAULT_TILE_RADIUS_METERS
): Promise<SyncReport> {
  const neighborhood = await repository.getNeighborhoodBySlug(slug);
  if (!neighborhood) throw new Error(`No neighborhood found for slug "${slug}"`);
  if (!neighborhood.boundaryGeojson) {
    throw new Error(
      `Neighborhood "${slug}" has no boundary_geojson set -- draw or seed a boundary before syncing`
    );
  }

  const polygon = neighborhood.boundaryGeojson;
  const tiles = generateCoverageGrid(polygon, tileRadiusMeters);

  const [categories, existingVenuesFromRepo] = await Promise.all([
    repository.listCategories(),
    repository.listVenuesByNeighborhood(neighborhood.id),
  ]);

  const categoryIndex = buildGoogleTypeIndex(categories);
  // Restricts the search server-side to Google types the taxonomy actually
  // maps -- an earlier unrestricted run pulled in schools, churches, and
  // apartment buildings alongside real businesses.
  const includedTypesChunks = chunk([...categoryIndex.keys()], MAX_INCLUDED_TYPES_PER_REQUEST);

  const requests = tiles.flatMap((center) =>
    includedTypesChunks.map((includedTypes) => ({ center, includedTypes }))
  );
  const callResults = await Promise.all(
    requests.map(({ center, includedTypes }) =>
      client.searchNearby({ center, radiusMeters: tileRadiusMeters, includedTypes })
    )
  );

  const report = emptyReport();
  report.tilesQueried = tiles.length;
  report.apiCallsMade = requests.length;
  report.callsAtResultCap = callResults.filter(
    (results) => results.length >= PLACES_API_RESULT_CAP
  ).length;

  // Tiles overlap by design (see generateCoverageGrid), and a tile split
  // across multiple type chunks can also repeat a place -- collapse by
  // Google's place ID before the per-place pipeline below runs.
  const rawPlacesById = new Map<string, RawGooglePlace>();
  for (const results of callResults) {
    for (const place of results) rawPlacesById.set(place.id, place);
  }
  const rawPlaces = [...rawPlacesById.values()];

  // Grows as new venues are inserted below, so two duplicate places returned
  // in the *same* sync run (Google itself sometimes lists one business twice
  // under different place IDs) are caught, not just duplicates against
  // venues from a prior run.
  const existingVenues = [...existingVenuesFromRepo];

  for (const place of rawPlaces) {
    if (place.businessStatus === "CLOSED_PERMANENTLY") {
      report.skippedClosedPermanently++;
      continue;
    }

    const location = { lat: place.location.latitude, lng: place.location.longitude };
    if (!isPointInPolygon(location, polygon)) {
      report.skippedOutOfBoundary++;
      continue;
    }

    const name = place.displayName.text;
    const category = matchCategory(
      { primaryType: place.primaryType, types: place.types },
      categoryIndex
    );
    // Flagged every run a venue's category is still unmapped, not just the
    // run that first inserted it -- otherwise re-syncing a previously-seen,
    // still-uncategorized venue silently drops off this report.
    if (!category) report.unmappedTypes.push({ name, types: place.types });

    const existingByPlaceId = existingVenues.find((v) => v.googlePlaceId === place.id);

    if (existingByPlaceId) {
      if (existingByPlaceId.claimedByBusiness) {
        // Business-submitted data overrides source data once claimed (§1.4 step 5).
        report.skippedClaimed.push(name);
        continue;
      }

      await repository.upsertVenue(
        toUpsertInput(place, name, location, category?.id ?? null, neighborhood.id)
      );
      report.updated.push(name);
      continue;
    }

    const duplicate = findDuplicate(
      { name, location },
      existingVenues.map((v) => ({ ...v, location: { lat: v.lat, lng: v.lng } }))
    );

    if (duplicate) {
      report.skippedDuplicates.push({ candidate: name, matchedExisting: duplicate.name });
      continue;
    }

    await repository.upsertVenue(
      toUpsertInput(place, name, location, category?.id ?? null, neighborhood.id)
    );
    report.inserted.push(name);
    existingVenues.push({
      id: place.id,
      googlePlaceId: place.id,
      name,
      lat: location.lat,
      lng: location.lng,
      claimedByBusiness: false,
    });
  }

  return report;
}

function toUpsertInput(
  place: RawGooglePlace,
  name: string,
  location: { lat: number; lng: number },
  categoryId: string | null,
  neighborhoodId: string
) {
  return {
    googlePlaceId: place.id,
    name,
    categoryId,
    lat: location.lat,
    lng: location.lng,
    address: place.formattedAddress,
    neighborhoodId,
  };
}
