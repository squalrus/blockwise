export interface NeighborhoodRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
}

// Abstracts persistence so getNeighborhoodBySlug/updateNeighborhoodDescription
// (neighborhoods.ts) can be tested against an in-memory fake, mirroring
// events/repository.ts.
export interface NeighborhoodRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null>;
  updateDescription(id: string, description: string): Promise<NeighborhoodRecord>;
}
