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
  listPoisForNeighborhood(neighborhoodId: string): Promise<PoiRecord[]>;
}
