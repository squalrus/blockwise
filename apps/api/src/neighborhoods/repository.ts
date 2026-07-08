import type { GeoJsonPolygon, SocialLinks } from "@blockwise/types";

export interface NeighborhoodRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  social_links: SocialLinks;
}

export interface NeighborhoodBoundaryRecord {
  boundaryGeojson: GeoJsonPolygon | null;
  centerLat: number;
  centerLng: number;
}

export interface CreateNeighborhoodInput {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundaryGeojson: GeoJsonPolygon;
}

export interface CreatedNeighborhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: string;
  boundaryGeojson: GeoJsonPolygon;
  centerLat: number;
  centerLng: number;
}

// Admin portal create-neighborhood form (BACKLOG.md Ref 8) hitting the
// `neighborhood.slug` unique constraint -- mirrors UsernameTakenError
// (auth/repository.ts) for the same "translate a DB uniqueness violation
// into a typed error the route can catch" pattern.
export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`Neighborhood slug "${slug}" is already taken`);
    this.name = "SlugTakenError";
  }
}

// Abstracts persistence so getNeighborhoodBySlug/updateNeighborhoodDescription
// (neighborhoods.ts) can be tested against an in-memory fake, mirroring
// events/repository.ts.
export interface NeighborhoodRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null>;
  updateDescription(id: string, description: string): Promise<NeighborhoodRecord>;
  updateSocialLinks(id: string, socialLinks: SocialLinks): Promise<NeighborhoodRecord>;
  // Landing page (BACKLOG.md "Neighborhoods on landing page and user
  // profile") -- every neighborhood in the network, for the "all
  // neighborhoods" browse/join list. Not filtered by status: nothing else in
  // the app gates on neighborhood.status today, and the seeded Phinneywood
  // row is still 'onboarding' despite being fully live (venues, check-ins,
  // business claims, its own public profile page) -- filtering it out here
  // would hide the only neighborhood that exists.
  listAll(): Promise<NeighborhoodRecord[]>;
  // Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6).
  getBoundary(id: string): Promise<NeighborhoodBoundaryRecord | null>;
  updateBoundary(id: string, boundaryGeojson: GeoJsonPolygon): Promise<NeighborhoodBoundaryRecord>;
  createNeighborhood(input: CreateNeighborhoodInput): Promise<CreatedNeighborhood>;
}
