export interface NeighborhoodAdminSummaryRecord {
  neighborhoodId: string;
  name: string;
  slug: string;
}

// Abstracts persistence so requireAdmin can be tested against an in-memory
// fake, mirroring categoryMapping/repository.ts.
export interface NeighborhoodAdminRepository {
  isNeighborhoodAdmin(userId: string): Promise<boolean>;
  // Scoped to one neighborhood specifically -- used by requireNeighborhoodAdmin
  // to gate the neighborhood profile pages authoring routes (BACKLOG.md) to
  // that neighborhood's own admins, unlike isNeighborhoodAdmin above which
  // only proves "admin of at least one neighborhood".
  isNeighborhoodAdminFor(userId: string, neighborhoodId: string): Promise<boolean>;
  listNeighborhoodsForAdmin(userId: string): Promise<NeighborhoodAdminSummaryRecord[]>;
  // Admin portal create-neighborhood flow (BACKLOG.md Ref 8): a brand-new
  // neighborhood has no admins yet, so whoever creates it (already proven to
  // be an admin of *some* neighborhood, via requireAdmin) is granted admin of
  // this one too -- otherwise neighborhoodAdminGate would lock everyone,
  // including its creator, out of managing it afterward.
  addNeighborhoodAdmin(userId: string, neighborhoodId: string): Promise<void>;
}

// A rung above "admin of at least one neighborhood" (BACKLOG.md) -- bypasses
// the 24h "Reimport Locations" cooldown and, for now, is the only role that
// can create a brand-new neighborhood at all. Its own table/gate rather than
// folded into NeighborhoodAdminRepository since it's a global, not
// neighborhood-scoped, grant.
export interface SuperAdminRepository {
  isSuperAdmin(userId: string): Promise<boolean>;
}
