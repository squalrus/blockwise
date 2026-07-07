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
  // Landing page (BACKLOG.md "Neighborhoods on landing page and user
  // profile") -- every neighborhood in the network, for the "all
  // neighborhoods" browse/join list. Not filtered by status: nothing else in
  // the app gates on neighborhood.status today, and the seeded Phinneywood
  // row is still 'onboarding' despite being fully live (venues, check-ins,
  // business claims, its own public profile page) -- filtering it out here
  // would hide the only neighborhood that exists.
  listAll(): Promise<NeighborhoodRecord[]>;
}
