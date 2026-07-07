export interface PoiRecord {
  id: string;
  venueId: string | null;
  neighborhoodId: string | null;
  name: string;
  description: string | null;
  type: string;
}

export interface CreateNeighborhoodPoiInput {
  neighborhoodId: string;
  name: string;
  description: string | null;
  type: string;
}

// Abstracts persistence so createNeighborhoodPoi/listPoisForNeighborhood
// (pois.ts) can be tested against an in-memory fake, mirroring
// events/repository.ts. Venue-owned POIs are still read via
// venues/detailRepository.ts (no writer exists for those -- they only ever
// come from the sync pipeline, README §1.4).
export interface PoiRepository {
  createPoiForNeighborhood(input: CreateNeighborhoodPoiInput): Promise<PoiRecord>;
  listPoisForNeighborhood(neighborhoodId: string): Promise<PoiRecord[]>;
}
