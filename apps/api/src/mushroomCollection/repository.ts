export type MushroomCollectionSourceType = "checkin" | "connection" | "neighborhood";

// GET /me/collection listing (BACKLOG.md Ref 98/101) -- source-joined so the
// caller doesn't need a second lookup for the venue name / neighbor's
// display name / neighborhood name. mushroomConfigForSpecies/
// mushroomSpeciesName (derived from sourceId, not stored) fill in the
// look/flavor-name in collection.ts.
export interface MushroomCollectionListItem {
  id: string;
  sourceType: MushroomCollectionSourceType;
  sourceId: string;
  sourceName: string;
  // The route param for sourceType "connection" (the neighbor's username,
  // for /profile/[username]) or "neighborhood" (its slug, for
  // /neighborhoods/[slug]). Null for "checkin" (sourceId is already the
  // venue's own id/route in that case).
  sourceSlug: string | null;
  quantity: number;
  firstCollectedAt: string;
  // Null until the user taps to flip the tile over on the Collection tab
  // (POST /me/collection/:id/reveal) -- every row starts null here,
  // including ones that existed before the reveal mechanic shipped
  // (migration 20260818050000 added the column with no backfill step), so
  // existing accounts get to flip through their whole collection too.
  revealedAt: string | null;
}

// Abstracts persistence so recordVenueCollection/recordConnectionCollection/
// recordNeighborhoodCollection (called directly from app.ts's
// checkin/connection-accept/join handlers) can be tested against an
// in-memory fake, mirroring favorites/repository.ts. Recording is
// idempotent-by-increment (first call inserts at quantity 1, later calls
// bump quantity) rather than create-or-ignore, since a repeat
// visit/reconnect/rejoin is meant to count.
export interface MushroomCollectionRepository {
  // Returns true only when this call created a brand-new row (a new
  // species) rather than incrementing an existing one -- callers use this
  // to gate collection_milestone badge evaluation, which only needs
  // (re-)checking when the total count could have grown.
  recordVenueCollection(userId: string, venueId: string): Promise<boolean>;
  recordConnectionCollection(userId: string, connectionUserId: string): Promise<boolean>;
  // BACKLOG.md Ref 101: a neighborhood's own species, collected by joining
  // it -- mirrors the venue/connection cases above, called from
  // POST /neighborhoods/:id/join.
  recordNeighborhoodCollection(userId: string, neighborhoodId: string): Promise<boolean>;
  listCollectionForUser(userId: string): Promise<MushroomCollectionListItem[]>;
  // Total distinct species count (venue + connection + neighborhood
  // combined) -- the public profile's Collection tile and the
  // collection_milestone badge rule's progress metric, mirroring
  // ConnectionRepository's countAcceptedConnectionsForUser.
  countCollectionForUser(userId: string): Promise<number>;
  // Marks one collection entry revealed (idempotent -- a second reveal of
  // an already-revealed row is a no-op, returning it unchanged). Scoped to
  // userId so a caller can't reveal (or even discover the existence of)
  // another account's row. Null means no such row for this user.
  revealCollectionItem(userId: string, id: string): Promise<MushroomCollectionListItem | null>;
}
