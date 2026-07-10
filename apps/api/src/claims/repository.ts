import type { BusinessClaimContactMethod, BusinessClaimStatus, SocialLinks } from "@blockwise/types";

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
  socialLinks: SocialLinks;
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

export interface ClaimWithVenueRecord extends ClaimRecord {
  venueName: string;
  venueAddress: string;
}

// Abstracts persistence so the review/approval logic (claims.ts) can be
// tested against an in-memory fake, mirroring venues/detailRepository.ts.
export interface ClaimRepository {
  getVenue(venueId: string): Promise<VenueClaimStatus | null>;
  createClaim(input: CreateClaimInput): Promise<ClaimRecord>;
  // Neighborhood-scoped counterpart of the old global listClaims -- joins
  // through venue to filter by neighborhood_id, per the "combine claims +
  // venues into neighborhood admin" refactor (BACKLOG/docs/url-map.md).
  listClaimsForNeighborhood(
    neighborhoodId: string,
    status?: BusinessClaimStatus
  ): Promise<ClaimWithVenueRecord[]>;
  // Backs reviewClaimForNeighborhood's ownership check -- null if the claim
  // doesn't exist, so a cross-neighborhood claim id and a missing one both
  // resolve to the same not_found result without leaking which case it was.
  getClaimVenueNeighborhoodId(claimId: string): Promise<string | null>;
  getClaim(claimId: string): Promise<ClaimRecord | null>;
  // Both apply the claim's own status/reviewed_at update and, for approve,
  // flip venue.claimed_by_business -- see supabaseRepository.ts for why this
  // isn't wrapped in a single DB transaction at this project's scale.
  approveClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord>;
  rejectClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord>;
  // Un-approves an already-approved claim (BACKLOG.md "POIs and venues
  // managed almost the same") -- the only way to flip claimed_by_business
  // back to false, e.g. to unblock switching a claimed business to POI kind.
  // Marks the claim rejected (mirrors rejectClaim's own status transition)
  // rather than introducing a fourth BusinessClaimStatus value.
  revokeClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord>;
  // Backs the business portal's "your claimed venues" view (BACKLOG "Real
  // user authentication" notes) -- approved claims a business account
  // submitted itself.
  listClaimedVenuesForUser(userId: string): Promise<ClaimedVenue[]>;
  // Venue-scoped ownership check backing requireVenueOwner (BACKLOG.md
  // "Business owner venue dashboard") -- narrower than
  // listClaimedVenuesForUser, which is for listing every venue a business
  // owns rather than checking one in particular.
  isVenueClaimedByUser(userId: string, venueId: string): Promise<boolean>;
  // Instagram links and social media integration (BACKLOG.md Ref 30) --
  // scoped to the venue's approved claim (venueOwnerGate already proves one
  // exists before either of these is called), not a specific claim id, since
  // the business owner dashboard only knows the venue it's editing.
  getApprovedClaimSocialLinks(venueId: string): Promise<SocialLinks>;
  updateApprovedClaimSocialLinks(venueId: string, socialLinks: SocialLinks): Promise<SocialLinks>;
}
