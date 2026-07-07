export interface VenueLocation {
  id: string;
  lat: number;
  lng: number;
}

export interface PoiLocation {
  id: string;
  lat: number;
  lng: number;
}

export type CheckinTarget = { kind: "venue"; id: string } | { kind: "poi"; id: string };

export interface CheckinRecord {
  id: string;
  userId: string;
  // Exactly one is set -- a check-in targets either a venue or a
  // neighborhood POI (BACKLOG.md Ref 6).
  venueId: string | null;
  poiId: string | null;
  deviceLat: number;
  deviceLng: number;
  checkedInAt: string;
}

export interface CreateCheckinInput {
  userId: string;
  venueId?: string;
  poiId?: string;
  deviceLat: number;
  deviceLng: number;
}

export interface CheckinVenue {
  venueId: string;
  name: string;
  address: string;
  checkedInAt: string;
}

// Abstracts persistence so the geofence/cooldown decision (checkin.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
export interface CheckinRepository {
  getVenueLocation(venueId: string): Promise<VenueLocation | null>;
  getPoiLocation(poiId: string): Promise<PoiLocation | null>;
  // Upserts by anonymous_device_id -- README §14.2: every device gets a User
  // row from first launch, created lazily on its first check-in attempt.
  getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string>;
  // Most recent check-in against this specific venue/POI, for the 4-hour
  // per-target cooldown.
  getLastCheckinForTarget(userId: string, target: CheckinTarget): Promise<CheckinRecord | null>;
  // Most recent check-in anywhere, for the global cross-venue cooldown that
  // stops a user from instantly satisfying a multi-venue challenge (e.g.
  // "5 coffee shops") by rapid-tapping through nearby venues.
  getLastCheckinAnywhere(userId: string): Promise<CheckinRecord | null>;
  createCheckin(input: CreateCheckinInput): Promise<CheckinRecord>;
  // Backs the "My account" page's check-in history section (BACKLOG.md) --
  // venue-joined listing for a signed-in user, mirroring
  // favorites/repository.ts's listFavoriteVenuesForUser.
  listCheckinsForUser(userId: string): Promise<CheckinVenue[]>;
  // Backs the business owner venue dashboard's "check-in count" (BACKLOG.md).
  countCheckinsForVenue(venueId: string): Promise<number>;
}
