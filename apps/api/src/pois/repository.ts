import type { VenueStatus } from "@blockwise/types";

export interface PoiRecord {
  id: string;
  neighborhoodId: string;
  name: string;
  description: string | null;
  type: string;
  lat: number | null;
  lng: number | null;
  googlePlaceId: string | null;
  address: string | null;
  status: VenueStatus;
  createdAt: string;
}

export interface CreateNeighborhoodPoiInput {
  neighborhoodId: string;
  name: string;
  description: string | null;
  type: string;
  lat: number;
  lng: number;
  googlePlaceId: string | null;
  address: string | null;
}

export interface UpdatePoiInput {
  name?: string;
  description?: string;
  type?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface PoiLocation {
  id: string;
  lat: number;
  lng: number;
  neighborhoodId: string;
}

// Abstracts persistence so createNeighborhoodPoi/listPoisForNeighborhood
// (pois.ts) can be tested against an in-memory fake, mirroring
// events/repository.ts. POI is always neighborhood-owned (BACKLOG.md Ref 6 --
// the earlier venue-owned option never had a writer, so it was dropped).
export interface PoiRepository {
  createPoiForNeighborhood(input: CreateNeighborhoodPoiInput): Promise<PoiRecord>;
  listPoisForNeighborhood(neighborhoodId: string, search?: string): Promise<PoiRecord[]>;
  getPoiById(poiId: string): Promise<PoiRecord | null>;
  // Backs updatePoiForNeighborhood/deletePoiForNeighborhood's ownership check
  // -- null if the POI doesn't exist, mirroring
  // CategoryMappingRepository.getVenueNeighborhoodId.
  getPoiNeighborhoodId(poiId: string): Promise<string | null>;
  updatePoi(poiId: string, input: UpdatePoiInput): Promise<PoiRecord>;
  setPoiStatus(poiId: string, status: VenueStatus): Promise<PoiRecord>;
  // True if this POI has any check-in, point, or challenge history --
  // checkin.poi_id/point_event.poi_id/challenge.poi_id all cascade-delete, so
  // a hard delete would silently wipe that history rather than fail; callers
  // must check this before deletePoi and hide instead when true.
  hasDependentActivity(poiId: string): Promise<boolean>;
  deletePoi(poiId: string): Promise<void>;
}
