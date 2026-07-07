export interface VenueLocation {
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

// Abstracts persistence so the geofence/cooldown decision (checkin.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
export interface CheckinRepository {
  getVenueLocation(venueId: string): Promise<VenueLocation | null>;
  // Upserts by anonymous_device_id -- README §14.2: every device gets a User
  // row from first launch, created lazily on its first check-in attempt.
  getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string>;
  getLastCheckin(userId: string, venueId: string): Promise<CheckinRecord | null>;
  createCheckin(input: CreateCheckinInput): Promise<CheckinRecord>;
  // Backs the "My account" page's check-in history section (BACKLOG.md) --
  // venue-joined listing for a signed-in user, mirroring
  // favorites/repository.ts's listFavoriteVenuesForUser.
  listCheckinsForUser(userId: string): Promise<CheckinVenue[]>;
  // Backs the business owner venue dashboard's "check-in count" (BACKLOG.md).
  countCheckinsForVenue(venueId: string): Promise<number>;
}
