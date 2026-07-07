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
}
