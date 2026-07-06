export interface FavoriteRecord {
  id: string;
  userId: string;
  venueId: string;
  createdAt: string;
}

// Abstracts persistence so addFavorite/removeFavorite (favorite.ts) can be
// tested against an in-memory fake, mirroring checkins/repository.ts.
export interface FavoriteRepository {
  venueExists(venueId: string): Promise<boolean>;
  // Upserts by anonymous_device_id -- README §14.2: every device gets a User
  // row from first launch, created lazily on its first favorite/check-in.
  getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string>;
  getFavorite(userId: string, venueId: string): Promise<FavoriteRecord | null>;
  createFavorite(userId: string, venueId: string): Promise<FavoriteRecord>;
  deleteFavorite(userId: string, venueId: string): Promise<void>;
}
