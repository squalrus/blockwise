import type { RecentVisitorMushroom, TopVisitor } from "@blockwise/types";

export interface LocationCoords {
  id: string;
  lat: number;
  lng: number;
}

export interface CheckinRecord {
  id: string;
  userId: string;
  venueId: string;
  deviceLat: number;
  deviceLng: number;
  checkedInAt: string;
}

export interface CreateCheckinInput {
  userId: string;
  venueId: string;
  deviceLat: number;
  deviceLng: number;
}

export interface CheckinVenue {
  venueId: string;
  name: string;
  address: string;
  checkedInAt: string;
}

export interface NeighborhoodVisitorMosaic {
  mushrooms: RecentVisitorMushroom[];
  // Up to the top 3 named visitors by visitCount, for the "Top Caps" badge
  // cluster next to the mosaic -- empty if there are no public, named
  // visitors within the window.
  topVisitors: TopVisitor[];
}

// Abstracts persistence so the geofence/cooldown decision (checkin.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
// Business and POI check-ins are the same operation against the same table
// since the venue/poi merge (BACKLOG.md "POIs and venues managed almost the
// same") -- one id space, no kind discriminant needed at this layer.
export interface CheckinRepository {
  getLocation(locationId: string): Promise<LocationCoords | null>;
  // Most recent check-in against this specific location, for the 4-hour
  // per-target cooldown.
  getLastCheckinForLocation(userId: string, locationId: string): Promise<CheckinRecord | null>;
  // Most recent check-in anywhere, for the global cross-venue cooldown that
  // stops a user from instantly satisfying a multi-venue challenge (e.g.
  // "5 coffee shops") by rapid-tapping through nearby venues.
  getLastCheckinAnywhere(userId: string): Promise<CheckinRecord | null>;
  createCheckin(input: CreateCheckinInput): Promise<CheckinRecord>;
  // Backs the "My account" page's check-in history section (BACKLOG.md) --
  // venue-joined listing for a signed-in user, mirroring
  // favorites/repository.ts's listFavoriteVenuesForUser.
  listCheckinsForUser(userId: string): Promise<CheckinVenue[]>;
  // Backs the business owner venue dashboard's "check-in count" (BACKLOG.md)
  // and the POI detail page's stat card (BACKLOG.md Ref 58) -- same query
  // against either kind now that both live in the same table.
  countCheckinsForLocation(locationId: string): Promise<number>;
  // Neighborhood profile stats (BACKLOG.md Ref 58).
  countCheckinsForNeighborhood(neighborhoodId: string): Promise<number>;
  // BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" --
  // distinct visitors across the whole neighborhood within the rolling
  // window, each with their current live mushroom and visit count, for the
  // neighborhood profile's mosaic. Mirrors
  // LocationRepository.getLocationDetail's venue-scoped equivalent.
  listRecentVisitorMushroomsForNeighborhood(
    neighborhoodId: string,
    limit: number
  ): Promise<NeighborhoodVisitorMosaic>;
}
