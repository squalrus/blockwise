import type { BusinessClaimContactMethod, BusinessClaimStatus } from "@blockwise/types";

export interface VenueClaimStatus {
  id: string;
  claimedByBusiness: boolean;
}

export interface ClaimRecord {
  id: string;
  venueId: string;
  contactName: string;
  contactMethod: BusinessClaimContactMethod;
  contactValue: string;
  note: string | null;
  status: BusinessClaimStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedNote: string | null;
  claimedByUserId: string | null;
}

export interface CreateClaimInput {
  venueId: string;
  contactName: string;
  contactMethod: BusinessClaimContactMethod;
  contactValue: string;
  note: string | null;
  // Set when the submitter was authenticated as a business account at claim
  // time (see auth/requireAuthUser.ts's attachOptionalAuthUser) -- null for
  // the still-supported anonymous submission path.
  claimedByUserId: string | null;
}

export interface ClaimedVenue {
  venueId: string;
  name: string;
  address: string;
}

// Abstracts persistence so the review/approval logic (claims.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
export interface ClaimRepository {
  getVenue(venueId: string): Promise<VenueClaimStatus | null>;
  createClaim(input: CreateClaimInput): Promise<ClaimRecord>;
  listClaims(status?: BusinessClaimStatus): Promise<ClaimRecord[]>;
  getClaim(claimId: string): Promise<ClaimRecord | null>;
  // Both apply the claim's own status/reviewed_at update and, for approve,
  // flip venue.claimed_by_business -- see supabaseRepository.ts for why this
  // isn't wrapped in a single DB transaction at this project's scale.
  approveClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord>;
  rejectClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord>;
  // Backs the business portal's "your claimed venues" view (BACKLOG "Real
  // user authentication" notes) -- approved claims a business account
  // submitted itself.
  listClaimedVenuesForUser(userId: string): Promise<ClaimedVenue[]>;
}
