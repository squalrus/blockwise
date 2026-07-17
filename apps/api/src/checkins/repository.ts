import type { MushroomCustomization, MushroomSnapshot } from "@blockwise/types";

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
  mushroomSnapshot: MushroomSnapshot | null;
}

export interface CreateCheckinInput {
  userId: string;
  venueId: string;
  deviceLat: number;
  deviceLng: number;
  mushroomSnapshot: MushroomSnapshot | null;
}

export interface CheckinVenue {
  venueId: string;
  name: string;
  address: string;
  checkedInAt: string;
}

// Abstracts persistence so the geofence/cooldown decision (checkin.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
// Business and POI check-ins are the same operation against the same table
// since the venue/poi merge (BACKLOG.md "POIs and venues managed almost the
// same") -- one id space, no kind discriminant needed at this layer.
export interface CheckinRepository {
  getLocation(locationId: string): Promise<LocationCoords | null>;
  // The checking-in user's saved customizer choice (BACKLOG.md Ref 75), if
  // any -- performCheckin resolves it through snapshotMushroomForUser before
  // calling createCheckin, so a stamped "fingerprint" (BACKLOG.md "Mushroom
  // fingerprint stamps") reflects a saved override rather than always the
  // hash-derived default.
  getMushroomCustomization(userId: string): Promise<MushroomCustomization | null>;
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
  // BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins" --
  // the most recent distinct check-in-ers' stamped looks across the whole
  // neighborhood, for the neighborhood profile's mosaic, mirroring
  // LocationRepository.getLocationDetail's venue-scoped equivalent.
  listRecentCheckinSnapshotsForNeighborhood(neighborhoodId: string, limit: number): Promise<MushroomSnapshot[]>;
}
