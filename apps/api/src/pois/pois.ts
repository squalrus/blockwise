import type { Poi, VenueStatus } from "@blockwise/types";
import type { PoiRecord, PoiRepository, UpdatePoiInput } from "./repository";

function toPoi(record: PoiRecord): Poi {
  return {
    id: record.id,
    neighborhood_id: record.neighborhoodId,
    name: record.name,
    description: record.description,
    type: record.type,
    lat: record.lat,
    lng: record.lng,
    google_place_id: record.googlePlaceId,
    address: record.address,
    status: record.status,
    created_at: record.createdAt,
  };
}

export interface CreateNeighborhoodPoiInput {
  name: string;
  description?: string;
  type: string;
  lat: number;
  lng: number;
  // Set when a POI traces back to a Google Places entity, e.g. "convert
  // venue to POI" (BACKLOG.md Ref 11) carrying the venue's own
  // google_place_id/address over -- absent for the standalone manual-add flow.
  googlePlaceId?: string | null;
  address?: string;
}

export async function createNeighborhoodPoi(
  neighborhoodId: string,
  input: CreateNeighborhoodPoiInput,
  repository: PoiRepository
): Promise<Poi> {
  const record = await repository.createPoiForNeighborhood({
    neighborhoodId,
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    lat: input.lat,
    lng: input.lng,
    googlePlaceId: input.googlePlaceId ?? null,
    address: input.address ?? null,
  });
  return toPoi(record);
}

export async function listPoisForNeighborhood(
  neighborhoodId: string,
  repository: PoiRepository,
  search?: string
): Promise<Poi[]> {
  const records = await repository.listPoisForNeighborhood(neighborhoodId, search);
  return records.map(toPoi);
}

export type GetPoiResult = { status: "found"; poi: Poi } | { status: "not_found" };

// Neighborhood-scoped ownership check, mirroring
// reassignVenueCategoryForNeighborhood -- rejects (as not_found, same as a
// genuinely missing POI) before returning it, so a cross-neighborhood POI id
// can't be read from a different neighborhood's admin tab.
export async function getPoiForNeighborhood(
  neighborhoodId: string,
  poiId: string,
  repository: PoiRepository
): Promise<GetPoiResult> {
  const poiNeighborhoodId = await repository.getPoiNeighborhoodId(poiId);
  if (poiNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const record = await repository.getPoiById(poiId);
  if (!record) return { status: "not_found" };
  return { status: "found", poi: toPoi(record) };
}

export type UpdatePoiResult = { status: "updated"; poi: Poi } | { status: "not_found" };

export async function updatePoiForNeighborhood(
  neighborhoodId: string,
  poiId: string,
  input: UpdatePoiInput,
  repository: PoiRepository
): Promise<UpdatePoiResult> {
  const poiNeighborhoodId = await repository.getPoiNeighborhoodId(poiId);
  if (poiNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const updated = await repository.updatePoi(poiId, input);
  return { status: "updated", poi: toPoi(updated) };
}

export type UpdatePoiStatusResult = { status: "updated"; poi: Poi } | { status: "not_found" };

// POI hide/restore (BACKLOG.md Ref 29), mirroring
// updateVenueStatusForNeighborhood -- same cross-neighborhood ownership check.
export async function updatePoiStatusForNeighborhood(
  neighborhoodId: string,
  poiId: string,
  newStatus: VenueStatus,
  repository: PoiRepository
): Promise<UpdatePoiStatusResult> {
  const poiNeighborhoodId = await repository.getPoiNeighborhoodId(poiId);
  if (poiNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  const updated = await repository.setPoiStatus(poiId, newStatus);
  return { status: "updated", poi: toPoi(updated) };
}

export type DeletePoiResult =
  | { status: "deleted" }
  | { status: "not_found" }
  | { status: "has_dependent_activity" };

// Hard delete, unlike venue's hide-only approach -- safe here because,
// unlike venue, a POI with no checkin/point_event/challenge row attached has
// no other FK pointing at it (no favorite/business_claim analog for POIs).
// Blocks the delete outright (rather than letting the DB's "on delete
// cascade" silently wipe that history) whenever any dependent row exists;
// the caller should hide instead in that case.
export async function deletePoiForNeighborhood(
  neighborhoodId: string,
  poiId: string,
  repository: PoiRepository
): Promise<DeletePoiResult> {
  const poiNeighborhoodId = await repository.getPoiNeighborhoodId(poiId);
  if (poiNeighborhoodId !== neighborhoodId) return { status: "not_found" };

  if (await repository.hasDependentActivity(poiId)) {
    return { status: "has_dependent_activity" };
  }

  await repository.deletePoi(poiId);
  return { status: "deleted" };
}
