// Abstracts persistence so requireAdmin can be tested against an in-memory
// fake, mirroring categoryMapping/repository.ts.
export interface NeighborhoodAdminRepository {
  isNeighborhoodAdmin(userId: string): Promise<boolean>;
}
