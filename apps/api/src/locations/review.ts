import type { GeoJsonPolygon } from "@blockwise/types";
import type { GooglePlacesClient } from "../places/client";
import { findDuplicate } from "../places/dedup";
import { isPointInPolygon } from "../places/geo";
import type { PlacesRepository } from "../places/repository";
import { searchPlacesInPolygon } from "../places/sync";
import { createLocation, updateLocationStatusForNeighborhood } from "./locations";
import type { LocationRepository } from "./repository";

// "Reimport Locations" cooldown (BACKLOG.md) -- once every 24h per
// neighborhood, since each run costs a real (and rate-limited, see
// places/sync.ts's subdivideCircle comment) Google Places query. Enforced
// here as a pure, testable function of (lastReviewedAt, now) rather than
// inline in the route, so the exact boundary condition is unit-testable
// without a real clock or a real neighborhood repository.
export const LOCATIONS_REVIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface LocationsReviewCooldownStatus {
  lastReviewedAt: string | null;
  nextAllowedAt: string | null;
  canRun: boolean;
}

// bypassCooldown (BACKLOG.md "super admin") lets a super admin always run,
// regardless of lastReviewedAt -- still returns the real lastReviewedAt/
// nextAllowedAt (not nulled out) so a super admin's UI can still show when
// the neighborhood was last actually reviewed, just without disabling the
// button over it.
export function getLocationsReviewCooldownStatus(
  lastReviewedAt: string | null,
  now: Date = new Date(),
  bypassCooldown = false
): LocationsReviewCooldownStatus {
  if (!lastReviewedAt) {
    return { lastReviewedAt: null, nextAllowedAt: null, canRun: true };
  }

  const nextAllowedAt = new Date(new Date(lastReviewedAt).getTime() + LOCATIONS_REVIEW_COOLDOWN_MS);
  return {
    lastReviewedAt,
    nextAllowedAt: nextAllowedAt.toISOString(),
    canRun: bypassCooldown || now >= nextAllowedAt,
  };
}

export interface NewLocationCandidate {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
}

export interface ProposedRemoval {
  id: string;
  name: string;
  address: string | null;
}

export interface LocationReviewReport {
  tilesQueried: number;
  apiCallsMade: number;
  callsAtResultCap: number;
  newCandidates: NewLocationCandidate[];
  proposedRemovals: ProposedRemoval[];
}

// Bulk Places review (BACKLOG.md Ref 29) + boundary reconciliation
// (BACKLOG.md Ref 54): reuses the same tiling/search/boundary-filter/
// categorize pipeline as the real sync and the boundary dry-run preview
// (searchPlacesInPolygon), then excludes anything already known -- first by
// google_place_id (a location converted from the other kind, or a location
// from a prior sync/review run), then by the same name+location heuristic
// the real sync uses against venues (places/dedup.ts's findDuplicate) so a
// near-duplicate isn't re-surfaced just because it lacks a matching place
// id. What's left is genuinely new. Separately, every *active* location
// still on record is checked against the same (current, saved) boundary --
// anything now outside it is a proposed removal, surfaced for explicit
// admin approval rather than silently staying attached (today's behavior)
// or silently auto-hiding.
export async function reviewNeighborhoodLocations(
  neighborhoodId: string,
  polygon: GeoJsonPolygon,
  client: GooglePlacesClient,
  placesRepository: PlacesRepository,
  locationRepository: LocationRepository
): Promise<LocationReviewReport> {
  const [categories, existingLocations] = await Promise.all([
    placesRepository.listCategories(),
    locationRepository.listLocationsForNeighborhood(neighborhoodId),
  ]);

  const search = await searchPlacesInPolygon(polygon, client, categories);

  const proposedRemovals: ProposedRemoval[] = [];
  for (const location of existingLocations) {
    if (location.status !== "active") continue;
    // Legacy rows that predate lat/lng (BACKLOG.md Ref 51) can't be tested
    // against the polygon -- left alone rather than guessed at.
    if (location.lat === null || location.lng === null) continue;
    if (isPointInPolygon({ lat: location.lat, lng: location.lng }, polygon)) continue;
    proposedRemovals.push({ id: location.id, name: location.name, address: location.address });
  }

  // Grows as candidates are accepted below, mirroring syncNeighborhoodPlaces
  // (sync.ts) -- catches two near-duplicate places returned in the *same*
  // review run (Google itself sometimes lists one place twice under
  // different place IDs), not just duplicates against rows already in the DB.
  const dedupList = existingLocations
    // Only locations with real coordinates can be checked for a
    // near-duplicate location match -- a handful of legacy rows predate
    // lat/lng (BACKLOG.md Ref 51) and are simply skipped here, same as
    // they're skipped from boundary-membership checks above.
    .filter((l): l is typeof l & { lat: number; lng: number } => l.lat !== null && l.lng !== null)
    .map((l) => ({ name: l.name, location: { lat: l.lat, lng: l.lng } }));

  const newCandidates: NewLocationCandidate[] = [];
  for (const place of search.places) {
    const alreadyKnown = existingLocations.some((l) => l.googlePlaceId === place.raw.id);
    if (alreadyKnown) continue;

    const dedupCandidate = { name: place.name, location: place.location };
    if (findDuplicate(dedupCandidate, dedupList)) continue;
    dedupList.push(dedupCandidate);

    newCandidates.push({
      googlePlaceId: place.raw.id,
      name: place.name,
      lat: place.location.lat,
      lng: place.location.lng,
      address: place.raw.formattedAddress,
      suggestedCategoryId: place.category?.id ?? null,
      suggestedCategoryName: place.category?.name ?? null,
    });
  }

  return {
    tilesQueried: search.tilesQueried,
    apiCallsMade: search.apiCallsMade,
    callsAtResultCap: search.callsAtResultCap,
    newCandidates,
    proposedRemovals,
  };
}

export type LocationClassification = "business" | "poi" | "omit";

export interface LocationReviewClassificationInput {
  googlePlaceId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  classification: LocationClassification;
  // Required when classification is "business".
  categoryId?: string;
}

export interface LocationRemovalApproval {
  id: string;
}

export interface CommitLocationReviewResult {
  createdBusinesses: string[];
  createdPois: string[];
  omitted: string[];
  removed: string[];
  failed: { name: string; error: string }[];
}

// Applies the admin's bulk classification and removal decisions. Each item
// is applied independently (a per-item try/catch, not one DB transaction)
// since this is a bulk admin action over many unrelated rows -- one bad row
// (e.g. a missing category_id) shouldn't abort the rest of the batch.
//
// "omit" is persisted, not skipped (BACKLOG.md "Reimport Locations"): a
// hidden POI row keyed by google_place_id, so it reads as already-known on
// the next review run instead of resurfacing as a new candidate forever --
// the whole point of a rate-limited reimport is that repeat runs get
// cheaper (fewer undecided candidates) over time.
//
// Removals set status to "removed", not "hidden" -- distinct from the
// existing hide/restore mechanism (venue.status = "hidden", BACKLOG.md Ref
// 11/29): a boundary removal is a system determination that the location is
// no longer geographically part of the neighborhood at all, not an admin's
// manual curation choice, so it's excluded from the Locations tab even with
// "Show hidden" on. Never a delete either way, so existing
// checkin/favorite/point_event history survives, per the explicit ask
// behind the boundary re-map wizard (Ref 54).
export async function commitLocationReview(
  neighborhoodId: string,
  classifications: LocationReviewClassificationInput[],
  removals: LocationRemovalApproval[],
  placesRepository: PlacesRepository,
  locationRepository: LocationRepository
): Promise<CommitLocationReviewResult> {
  const result: CommitLocationReviewResult = {
    createdBusinesses: [],
    createdPois: [],
    omitted: [],
    removed: [],
    failed: [],
  };

  for (const removal of removals) {
    try {
      const outcome = await updateLocationStatusForNeighborhood(
        neighborhoodId,
        removal.id,
        "removed",
        locationRepository
      );
      if (outcome.status === "not_found") throw new Error("Location not found");
      result.removed.push(outcome.location.name);
    } catch (err) {
      result.failed.push({
        name: removal.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  for (const item of classifications) {
    try {
      switch (item.classification) {
        case "omit": {
          await createLocation(
            neighborhoodId,
            {
              kind: "poi",
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              googlePlaceId: item.googlePlaceId,
              address: item.address,
              status: "hidden",
            },
            locationRepository
          );
          result.omitted.push(item.name);
          break;
        }

        case "business": {
          if (!item.categoryId) throw new Error("category_id is required to classify as a business");
          // The sync pipeline's own venue upsert (places/sync.ts) -- reused
          // as-is rather than routing through createLocation, since this is
          // the same "known Google Place, sync into venue" operation the
          // scheduled sync job already performs. New rows default to kind
          // "business" at the DB level.
          await placesRepository.upsertVenue({
            googlePlaceId: item.googlePlaceId,
            name: item.name,
            categoryId: item.categoryId,
            lat: item.lat,
            lng: item.lng,
            address: item.address,
            neighborhoodId,
          });
          result.createdBusinesses.push(item.name);
          break;
        }

        case "poi": {
          await createLocation(
            neighborhoodId,
            {
              kind: "poi",
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              googlePlaceId: item.googlePlaceId,
              address: item.address,
            },
            locationRepository
          );
          result.createdPois.push(item.name);
          break;
        }
      }
    } catch (err) {
      result.failed.push({
        name: item.name,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return result;
}
