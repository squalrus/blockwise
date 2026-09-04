import type { GeoJsonPolygon, VenueStatus } from "@blockwise/types";
import { findDuplicate, nameSimilarity } from "../places/dedup";
import type { GeoapifyPlace, GeoapifyPlaceDetailsClient, GeoapifyPlacesClient } from "../places/geoapifyClient";
import { isPointInPolygon } from "../places/geo";
import type { PlacesRepository } from "../places/repository";
import { searchPlacesInPolygon, type PlaceSearchCandidate } from "../places/sync";
import {
  createLocation,
  reassignLocationIdentityForNeighborhood,
  refreshLocationBasicInfo,
  updateLocationStatusForNeighborhood,
} from "./locations";
import { LocationIdentityConflictError } from "./repository";
import type { LocationRecord, LocationRepository } from "./repository";

// "Reimport Locations" cooldown (BACKLOG.md) -- once every 24h per
// neighborhood, since each run costs a real (and rate-limited, see
// places/sync.ts's subdivideCircle comment) Places query. Enforced
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
  geoapifyPlaceId: string;
  osmType: string | null;
  osmId: number | null;
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

// A fresh Geoapify result that fuzzy-matched an existing location
// (dedup.ts's name+location check) closely enough to flag for a human
// decision, but whose identity (osm_type+osm_id, falling back to
// geoapify_place_id) didn't exactly match the stored one -- e.g. a business
// renamed in OSM at its same physical spot (BACKLOG.md Ref 114's
// live-verified "Kipos Greek" -> "Kipos" case), or Geoapify's own place_id
// churn (also live-verified: the same physical place returns a different
// place_id from different Geoapify endpoints, which is exactly why
// osm_type+osm_id -- not geoapify_place_id -- is the real identity check
// above). confidencePercent (nameSimilarity, 0-100) is surfaced so an admin
// can tell a genuine rename apart from a coincidental nearby match rather
// than an automatic rewrite that a wrong fuzzy match could silently corrupt.
export interface PossibleLocationMatch {
  locationId: string;
  existingName: string;
  existingAddress: string | null;
  // Surfaced so an admin can tell a hidden (manually curated out of the
  // normal Locations tab) location apart from an active one before
  // approving a reidentification -- a hidden row's identity is just as
  // real, but worth a glance since it's easy to forget it exists.
  existingStatus: VenueStatus;
  geoapifyPlaceId: string;
  osmType: string | null;
  osmId: number | null;
  matchedName: string;
  matchedAddress: string;
  lat: number;
  lng: number;
  confidencePercent: number;
}

export interface LocationReviewReport {
  tilesQueried: number;
  apiCallsMade: number;
  callsAtResultCap: number;
  newCandidates: NewLocationCandidate[];
  proposedRemovals: ProposedRemoval[];
  possibleMatches: PossibleLocationMatch[];
  // Names of already-known, identity-matched locations whose cached
  // geoapify_place_id/osm ref and/or basic info (name/lat/lng/address/
  // category) got refreshed from this run's fresh Geoapify data -- see
  // refreshMatchedLocation's comment. Surfaced so an admin (or a future
  // scheduled-Import summary) can see what changed without diffing the
  // Locations tab themselves.
  refreshed: string[];
}

// Import's per-match refresh (user-requested follow-up to the osm_type/
// osm_id fix, "could we also run the same refresh across the locations" on
// import): keeps an already-matched location's enrichment-fetch cache
// (geoapify_place_id) fresh unconditionally -- a stale one silently breaks
// enrichment even though the identity match above already succeeded on the
// real osm_type/osm_id, exactly the scenario the user asked to guard
// against. Also opportunistically backfills osm_type/osm_id for a location
// that only ever matched by the geoapify_place_id fallback (mirrors
// backfillOsmIdentity.ts's one-time job, but running continuously as part of
// routine Import). Basic info (name/lat/lng/address/category) is refreshed
// only for kind "business" -- a POI's identity-linked row is left untouched
// by this unattended, scheduled path (unlike a deliberate one-off Reassign,
// see reassignLocationIdentityForNeighborhood's comment), since a POI is far
// more likely to carry deliberate manual curation (PoiForm) that a
// same-osm-identity match has no way to tell apart from stale source data.
async function refreshMatchedLocation(
  existingMatch: LocationRecord,
  place: PlaceSearchCandidate,
  locationRepository: LocationRepository,
  refreshed: string[]
): Promise<void> {
  // Snapshotted up front -- refreshLocationBasicInfo may rename this exact
  // record (some repository implementations, including the in-memory test
  // fake, mutate the passed object in place), so reading existingMatch.name
  // afterward would report the location by its *new* name instead of the
  // one it was actually matched on.
  const matchedName = existingMatch.name;
  const freshGeoapifyPlaceId = place.raw.placeId;
  const freshOsmType = place.raw.osmType ?? null;
  const freshOsmId = place.raw.osmId ?? null;
  let identityChanged = false;

  if (
    existingMatch.geoapifyPlaceId !== freshGeoapifyPlaceId ||
    (existingMatch.osmType ?? null) !== freshOsmType ||
    (existingMatch.osmId ?? null) !== freshOsmId
  ) {
    try {
      await locationRepository.updateLocationIdentity(existingMatch.id, {
        geoapifyPlaceId: freshGeoapifyPlaceId,
        osmType: freshOsmType,
        osmId: freshOsmId,
      });
      identityChanged = true;
    } catch (err) {
      if (!(err instanceof LocationIdentityConflictError)) throw err;
      // Some other location in this neighborhood already holds this exact
      // osm identity -- a preexisting duplicate (same story as
      // backfillOsmIdentity.ts's per-row 23505 handling), needing a human to
      // reconcile, not something an unattended Import run should guess at.
      console.error(
        `reviewNeighborhoodLocations: "${existingMatch.name}" and another location both resolve to ${err.osmType}/${err.osmId} -- left unchanged`
      );
    }
  }

  let basicInfoChanged = false;
  if (existingMatch.kind === "business") {
    basicInfoChanged = await refreshLocationBasicInfo(
      existingMatch,
      {
        name: place.name,
        lat: place.location.lat,
        lng: place.location.lng,
        address: place.raw.formattedAddress,
        categoryId: place.category?.id ?? null,
      },
      locationRepository
    );
  }

  if (identityChanged || basicInfoChanged) refreshed.push(matchedName);
}

// Identity match, in priority order: OpenStreetMap's own type+id pair (the
// actual stable identity -- see Venue.osm_type's comment in
// @blockwise/types), falling back to the cached geoapify_place_id for a
// location that doesn't have osm_type/osm_id populated yet.
function findExistingLocationByIdentity(place: GeoapifyPlace, existingLocations: LocationRecord[]): LocationRecord | undefined {
  const osmType = place.osmType ?? null;
  const osmId = place.osmId ?? null;
  if (osmType !== null) {
    const byOsmRef = existingLocations.find((l) => (l.osmType ?? null) === osmType && (l.osmId ?? null) === osmId);
    if (byOsmRef) return byOsmRef;
  }
  return existingLocations.find((l) => l.geoapifyPlaceId === place.placeId);
}

// Bulk Places review (BACKLOG.md Ref 29) + boundary reconciliation
// (BACKLOG.md Ref 54): reuses the same tiling/search/boundary-filter/
// categorize pipeline as the real sync and the boundary dry-run preview
// (searchPlacesInPolygon), then excludes anything already known -- first by
// osm_type+osm_id (the actual stable identity, see Venue.osm_type's comment
// in @blockwise/types), falling back to geoapify_place_id for a location
// that doesn't have osm data populated yet, then by the same name+location
// heuristic the real sync uses against venues (places/dedup.ts's
// findDuplicate) so a near-duplicate isn't re-surfaced just because neither
// identity matched (surfaced as a possible match, not silently dropped --
// see PossibleLocationMatch's comment). What's left is genuinely new.
// Separately, every non-removed location still on record (active or hidden
// -- hidden is a manual curation choice,
// not a geography one) is checked against the same (current, saved)
// boundary -- anything now outside it is a proposed removal, surfaced for
// explicit admin approval rather than silently staying attached (today's
// behavior) or silently auto-hiding.
export async function reviewNeighborhoodLocations(
  neighborhoodId: string,
  polygon: GeoJsonPolygon,
  client: GeoapifyPlacesClient,
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
    // Hidden locations are still boundary-checked -- an admin's manual
    // hide is a separate axis from geography (BACKLOG.md Ref 11/29), so a
    // hidden row can still be flagged once it's outside the neighborhood.
    // Already-removed rows are skipped since they've already gone through
    // this decision.
    if (location.status === "removed") continue;
    // Legacy rows that predate lat/lng (BACKLOG.md Ref 51) can't be tested
    // against the polygon -- left alone rather than guessed at.
    if (location.lat === null || location.lng === null) continue;
    if (isPointInPolygon({ lat: location.lat, lng: location.lng }, polygon)) continue;
    proposedRemovals.push({ id: location.id, name: location.name, address: location.address });
  }

  // Existing locations checkable for a near-duplicate match -- a handful of
  // legacy rows predate lat/lng (BACKLOG.md Ref 51) and are simply skipped
  // here, same as they're skipped from boundary-membership checks above.
  // Kept separate from sessionDedupList below so a match against THIS list
  // specifically (an already-known location under a possibly-stale Google
  // place ID) can be reported as a possible match rather than silently
  // dropped -- see PossibleLocationMatch's comment.
  const existingDedupList = existingLocations
    .filter((l): l is typeof l & { lat: number; lng: number } => l.lat !== null && l.lng !== null)
    .map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      status: l.status,
      location: { lat: l.lat, lng: l.lng },
    }));

  // Grows as new candidates are accepted below -- catches two near-duplicate
  // places returned in the *same* review run (a place sometimes listed twice
  // under different place IDs), not just duplicates against rows already in
  // the DB.
  const sessionDedupList = existingDedupList.map(({ name, location }) => ({ name, location }));

  const newCandidates: NewLocationCandidate[] = [];
  const possibleMatches: PossibleLocationMatch[] = [];
  const refreshed: string[] = [];
  for (const place of search.places) {
    const identityMatch = findExistingLocationByIdentity(place.raw, existingLocations);
    if (identityMatch) {
      await refreshMatchedLocation(identityMatch, place, locationRepository, refreshed);
      continue;
    }

    const dedupCandidate = { name: place.name, location: place.location };

    const existingMatch = findDuplicate(dedupCandidate, existingDedupList);
    if (existingMatch) {
      possibleMatches.push({
        locationId: existingMatch.id,
        existingName: existingMatch.name,
        existingAddress: existingMatch.address,
        existingStatus: existingMatch.status,
        geoapifyPlaceId: place.raw.placeId,
        osmType: place.raw.osmType ?? null,
        osmId: place.raw.osmId ?? null,
        matchedName: place.name,
        matchedAddress: place.raw.formattedAddress,
        lat: place.location.lat,
        lng: place.location.lng,
        confidencePercent: Math.round(nameSimilarity(place.name, existingMatch.name) * 100),
      });
      continue;
    }

    if (findDuplicate(dedupCandidate, sessionDedupList)) continue;
    sessionDedupList.push(dedupCandidate);

    newCandidates.push({
      geoapifyPlaceId: place.raw.placeId,
      osmType: place.raw.osmType ?? null,
      osmId: place.raw.osmId ?? null,
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
    possibleMatches,
    refreshed,
  };
}

export type LocationClassification = "business" | "poi" | "omit";

export interface LocationReviewClassificationInput {
  geoapifyPlaceId: string;
  osmType?: string | null;
  osmId?: number | null;
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

// An admin-approved PossibleLocationMatch -- see that interface's comment.
export interface LocationReidentification {
  locationId: string;
  geoapifyPlaceId: string;
  osmType?: string | null;
  osmId?: number | null;
}

export interface CommitLocationReviewResult {
  createdBusinesses: string[];
  createdPois: string[];
  omitted: string[];
  removed: string[];
  reidentified: string[];
  failed: { name: string; error: string }[];
}

// Applies the admin's bulk classification and removal decisions. Each item
// is applied independently (a per-item try/catch, not one DB transaction)
// since this is a bulk admin action over many unrelated rows -- one bad row
// (e.g. a missing category_id) shouldn't abort the rest of the batch.
//
// "omit" is persisted, not skipped (BACKLOG.md "Reimport Locations"): a
// hidden POI row keyed by osm_type+osm_id (falling back to geoapify_place_id
// when the candidate lacked OSM data), so it reads as already-known on the
// next review run instead of resurfacing as a new candidate forever -- the
// whole point of a rate-limited reimport is that repeat runs get cheaper
// (fewer undecided candidates) over time.
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
  locationRepository: LocationRepository,
  placesClient: GeoapifyPlaceDetailsClient,
  reidentifications: LocationReidentification[] = []
): Promise<CommitLocationReviewResult> {
  const result: CommitLocationReviewResult = {
    createdBusinesses: [],
    createdPois: [],
    omitted: [],
    removed: [],
    reidentified: [],
    failed: [],
  };

  // Only fetched when actually needed -- review/commit and investigate/add
  // both always call with an empty reidentifications array, so this avoids a
  // needless category-list round-trip on the far more common paths.
  const categories = reidentifications.length > 0 ? await placesRepository.listCategories() : [];

  for (const reidentification of reidentifications) {
    try {
      const outcome = await reassignLocationIdentityForNeighborhood(
        neighborhoodId,
        reidentification.locationId,
        {
          geoapifyPlaceId: reidentification.geoapifyPlaceId,
          osmType: reidentification.osmType,
          osmId: reidentification.osmId,
        },
        locationRepository,
        placesClient,
        categories
      );
      if (outcome.status === "not_found") throw new Error("Location not found");
      if (outcome.status === "conflict") {
        throw new Error(
          outcome.conflictingLocationName
            ? `Already attached to "${outcome.conflictingLocationName}" -- these look like duplicate locations`
            : "Already attached to another location in this neighborhood"
        );
      }
      result.reidentified.push(outcome.location.name);
    } catch (err) {
      result.failed.push({
        name: reidentification.locationId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

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
              geoapifyPlaceId: item.geoapifyPlaceId,
              osmType: item.osmType ?? undefined,
              osmId: item.osmId ?? undefined,
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
          // the same "known Geoapify Place, sync into venue" operation the
          // scheduled sync job already performs. New rows default to kind
          // "business" at the DB level. No existingVenueId -- every item
          // here already went through reviewNeighborhoodLocations's own
          // identity/dedup check, so this is always a genuinely new row.
          await placesRepository.upsertVenue({
            geoapifyPlaceId: item.geoapifyPlaceId,
            osmType: item.osmType ?? null,
            osmId: item.osmId ?? null,
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
              geoapifyPlaceId: item.geoapifyPlaceId,
              osmType: item.osmType ?? undefined,
              osmId: item.osmId ?? undefined,
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
