import type { Poi } from "@blockwise/types";
import type { PoiRecord, PoiRepository } from "./repository";

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
  repository: PoiRepository
): Promise<Poi[]> {
  const records = await repository.listPoisForNeighborhood(neighborhoodId);
  return records.map(toPoi);
}
