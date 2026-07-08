export interface NeighborhoodMemberRecord {
  id: string;
  userId: string;
  neighborhoodId: string;
  isPrimary: boolean;
  createdAt: string;
}

// Neighborhood-joined listing for the "My account" page (BACKLOG.md
// "Neighborhoods on landing page and user profile") -- the raw membership
// row above has no neighborhood name/city/state.
export interface NeighborhoodMembershipSummary {
  neighborhoodId: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  isPrimary: boolean;
}

// Abstracts persistence so joinNeighborhood/leaveNeighborhood/setHomeNeighborhood
// (neighborhoodMembers.ts) can be tested against an in-memory fake, mirroring
// favorites/repository.ts.
export interface NeighborhoodMemberRepository {
  neighborhoodExists(neighborhoodId: string): Promise<boolean>;
  getMembership(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord | null>;
  createMembership(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord>;
  deleteMembership(userId: string, neighborhoodId: string): Promise<void>;
  listMembershipsForUser(userId: string): Promise<NeighborhoodMembershipSummary[]>;
  // Neighborhood profile stats (BACKLOG.md Ref 58).
  countMembersForNeighborhood(neighborhoodId: string): Promise<number>;
  // Clears is_primary on every other membership row for this user, then sets
  // it on neighborhoodId's -- the partial unique index (migration
  // 20260706100000) only allows one true per user, so this must run as two
  // steps rather than a single update.
  setPrimary(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord>;
}
