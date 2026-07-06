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

// Abstracts persistence so the geofence/cooldown decision (checkin.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
export interface CheckinRepository {
  getVenueLocation(venueId: string): Promise<VenueLocation | null>;
  // Upserts by anonymous_device_id -- README §14.2: every device gets a User
  // row from first launch, created lazily on its first check-in attempt.
  getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string>;
  getLastCheckin(userId: string, venueId: string): Promise<CheckinRecord | null>;
  createCheckin(input: CreateCheckinInput): Promise<CheckinRecord>;
}
