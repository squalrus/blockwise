import { buildGeoapifyCategoryIndex, matchCategory, type CategoryRecord } from "./categorize";
import type { GeoapifyPlace, GeoapifyTextSearchClient } from "./geoapifyClient";
import { isPointInPolygon, type GeoJsonPolygon, type LatLng } from "./geo";

export interface PlacesInvestigationCandidate {
  raw: GeoapifyPlace;
  name: string;
  address: string;
  lat: number;
  lng: number;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  // Name of the existing venue/POI already keyed to this exact Geoapify
  // place, if any -- means Geoapify has it, and so does this app, just not
  // under the name/spelling the admin searched for.
  alreadyKnownAs: string | null;
  // Null when the neighborhood has no saved boundary to test against.
  insideBoundary: boolean | null;
}

// Diagnostic single-venue Places lookup (BACKLOG.md Ref 96): given a
// free-text name/address an admin is investigating, returns every geocode
// match annotated with the two most common reasons a venue looks "missing"
// despite Geoapify actually knowing about it -- it's outside the
// neighborhood's boundary polygon (so the boundary-scoped sync/review flow
// never surfaces it), or it's already on record under a different name (so
// it isn't actually missing, just not found by the name searched).
export async function investigateMissingLocation(
  query: string,
  neighborhoodCenter: LatLng,
  boundary: GeoJsonPolygon | null,
  client: GeoapifyTextSearchClient,
  categories: CategoryRecord[],
  existingLocations: { geoapifyPlaceId: string | null; name: string }[]
): Promise<PlacesInvestigationCandidate[]> {
  const results = await client.searchText({
    text: query,
    bias: neighborhoodCenter,
  });

  const categoryIndex = buildGeoapifyCategoryIndex(categories);

  return results.map((place) => {
    const location = place.location;
    const category = matchCategory({ categories: place.categories }, categoryIndex) ?? null;
    const existing = existingLocations.find((l) => l.geoapifyPlaceId === place.placeId);

    return {
      raw: place,
      name: place.name ?? place.formattedAddress,
      address: place.formattedAddress,
      lat: location.lat,
      lng: location.lng,
      suggestedCategoryId: category?.id ?? null,
      suggestedCategoryName: category?.name ?? null,
      alreadyKnownAs: existing?.name ?? null,
      insideBoundary: boundary ? isPointInPolygon(location, boundary) : null,
    };
  });
}
