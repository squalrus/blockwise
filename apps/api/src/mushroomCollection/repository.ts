export type MushroomCollectionSourceType = "checkin" | "connection";

// GET /me/collection listing (BACKLOG.md Ref 98) -- source-joined so the
// caller doesn't need a second lookup for the venue name / neighbor's
// display name. mushroomConfigForSpecies/mushroomSpeciesName (derived from
// sourceId, not stored) fill in the look/flavor-name in collection.ts.
export interface MushroomCollectionListItem {
  id: string;
  sourceType: MushroomCollectionSourceType;
  sourceId: string;
  sourceName: string;
  quantity: number;
  firstCollectedAt: string;
}

// Abstracts persistence so recordVenueCollection/recordConnectionCollection
// (collection.ts) can be tested against an in-memory fake, mirroring
// favorites/repository.ts. Recording is idempotent-by-increment (first call
// inserts at quantity 1, later calls bump quantity) rather than
// create-or-ignore, since a repeat visit/reconnect is meant to count.
export interface MushroomCollectionRepository {
  // Returns true only when this call created a brand-new row (a new
  // species) rather than incrementing an existing one -- callers use this
  // to gate collection_milestone badge evaluation, which only needs
  // (re-)checking when the total count could have grown.
  recordVenueCollection(userId: string, venueId: string): Promise<boolean>;
  recordConnectionCollection(userId: string, connectionUserId: string): Promise<boolean>;
  listCollectionForUser(userId: string): Promise<MushroomCollectionListItem[]>;
  // Total distinct species count (venue + connection combined) -- the
  // public profile's Collection tile and the collection_milestone badge
  // rule's progress metric, mirroring ConnectionRepository's
  // countAcceptedConnectionsForUser.
  countCollectionForUser(userId: string): Promise<number>;
}
