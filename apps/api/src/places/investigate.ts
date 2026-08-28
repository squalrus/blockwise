import { buildGeoapifyCategoryIndex, matchCategory, type CategoryRecord } from "./categorize";
import type { PlacesTextSearchClient, RawGooglePlace } from "./client";
import { isPointInPolygon, type GeoJsonPolygon, type LatLng } from "./geo";

// See client.ts's PlacesTextSearchClient comment for why this biases rather
// than restricts, and why a 3km radius (wider than sync.ts's 400m tiles) is
// fine here -- a single admin-triggered lookup, not a boundary-wide sweep.
const INVESTIGATION_BIAS_RADIUS_METERS = 3000;

export interface PlacesInvestigationCandidate {
  raw: RawGooglePlace;
  name: string;
  address: string;
  lat: number;
  lng: number;
  businessStatus: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  // Name of the existing venue/POI already keyed to this exact Google place,
  // if any -- means Google has it, and so does this app, just not under the
  // name/spelling the admin searched for.
  alreadyKnownAs: string | null;
  // Null when the neighborhood has no saved boundary to test against.
  insideBoundary: boolean | null;
}

// Diagnostic single-venue Places lookup (BACKLOG.md Ref 96): given a
// free-text name/address an admin is investigating, returns every Places
// Text Search match annotated with the two most common reasons a venue looks
// "missing" despite Google actually knowing about it -- it's outside the
// neighborhood's boundary polygon (so the boundary-scoped sync/review flow
// never surfaces it), or it's already on record under a different name
// (so it isn't actually missing, just not found by the name searched).
export async function investigateMissingLocation(
  query: string,
  neighborhoodCenter: LatLng,
  boundary: GeoJsonPolygon | null,
  client: PlacesTextSearchClient,
  categories: CategoryRecord[],
  existingLocations: { googlePlaceId: string | null; name: string }[]
): Promise<PlacesInvestigationCandidate[]> {
  const results = await client.searchText({
    textQuery: query,
    locationBias: { center: neighborhoodCenter, radiusMeters: INVESTIGATION_BIAS_RADIUS_METERS },
  });

  const categoryIndex = buildGeoapifyCategoryIndex(categories);

  return results.map((place) => {
    const location = { lat: place.location.latitude, lng: place.location.longitude };
    // Google's flat type strings can never match a geoapify-tag index --
    // every result goes uncategorized until Phase 4 rewires this onto the
    // real Geoapify client (docs/geoapify-migration-plan.md).
    const category =
      matchCategory(
        { categories: place.primaryType ? [place.primaryType, ...place.types] : place.types },
        categoryIndex
      ) ?? null;
    const existing = existingLocations.find((l) => l.googlePlaceId === place.id);

    return {
      raw: place,
      name: place.displayName.text,
      address: place.formattedAddress,
      lat: location.lat,
      lng: location.lng,
      businessStatus: place.businessStatus ?? null,
      suggestedCategoryId: category?.id ?? null,
      suggestedCategoryName: category?.name ?? null,
      alreadyKnownAs: existing?.name ?? null,
      insideBoundary: boundary ? isPointInPolygon(location, boundary) : null,
    };
  });
}
