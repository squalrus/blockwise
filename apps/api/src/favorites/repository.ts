export interface FavoriteRecord {
  id: string;
  userId: string;
  venueId: string;
  createdAt: string;
}

export interface FavoriteVenue {
  venueId: string;
  name: string;
  address: string;
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
  // Backs the "My account" page's favorites section (BACKLOG.md) -- venue-
  // joined listing for a signed-in user, mirroring claims/repository.ts's
  // listClaimedVenuesForUser.
  listFavoriteVenuesForUser(userId: string): Promise<FavoriteVenue[]>;
  // Backs the business owner venue dashboard's "follower count" (BACKLOG.md)
  // -- there's no separate "follow" table, favoriting a venue is the follow
  // relationship.
  countFavoritesForVenue(venueId: string): Promise<number>;
}
