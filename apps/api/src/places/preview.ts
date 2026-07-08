import type { CategoryRecord } from "./categorize";
import type { GooglePlacesClient } from "./client";
import type { GeoJsonPolygon } from "./geo";
import { searchPlacesInPolygon } from "./sync";

export interface BoundaryPreviewCandidate {
  name: string;
  lat: number;
  lng: number;
  address: string;
  categoryName: string | null;
}

export interface BoundaryPreviewReport {
  tilesQueried: number;
  apiCallsMade: number;
  callsAtResultCap: number;
  candidates: BoundaryPreviewCandidate[];
}

// Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6): "run
// a dry-run Google Places query against the drawn polygon and plot the
// resulting venues as markers ... before triggering the real sync." Reuses
// the same tiling/search/boundary-filter/categorize pipeline as the real
// sync (searchPlacesInPolygon), just stops short of dedup-against-existing
// and upsertVenue -- there's nothing to dedupe against yet for a boundary
// that isn't saved, and a preview of a re-edited boundary shouldn't need a
// live DB round-trip either.
export async function previewNeighborhoodBoundary(
  polygon: GeoJsonPolygon,
  client: GooglePlacesClient,
  categories: CategoryRecord[],
  tileRadiusMeters?: number
): Promise<BoundaryPreviewReport> {
  const search = await searchPlacesInPolygon(polygon, client, categories, tileRadiusMeters);

  return {
    tilesQueried: search.tilesQueried,
    apiCallsMade: search.apiCallsMade,
    callsAtResultCap: search.callsAtResultCap,
    candidates: search.places.map((place) => ({
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng,
      address: place.raw.formattedAddress,
      categoryName: place.category?.name ?? null,
    })),
  };
}
