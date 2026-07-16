import type {
  BusinessClaim,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  BusinessClaimWithVenue,
  SocialLinks,
} from "@blockwise/types";
import { isValidFeedUrl } from "../events/icalFeed";
import type { ClaimRecord, ClaimRepository, ClaimWithVenueRecord } from "./repository";

function toBusinessClaim(record: ClaimRecord): BusinessClaim {
  return {
    id: record.id,
    venue_id: record.venueId,
    contact_name: record.contactName,
    contact_method: record.contactMethod,
    contact_value: record.contactValue,
    note: record.note,
    status: record.status,
    created_at: record.createdAt,
    reviewed_at: record.reviewedAt,
    reviewed_note: record.reviewedNote,
    claimed_by_user_id: record.claimedByUserId,
    social_links: record.socialLinks,
  };
}

function toBusinessClaimWithVenue(record: ClaimWithVenueRecord): BusinessClaimWithVenue {
  return { ...toBusinessClaim(record), venue_name: record.venueName, venue_address: record.venueAddress };
}

export interface SubmitClaimInput {
  contactName: string;
  contactMethod: BusinessClaimContactMethod;
  contactValue: string;
  note?: string;
  // Set when the submitter is authenticated as a business account (see
  // auth/requireAuthUser.ts's attachOptionalAuthUser) -- omitted/null keeps
  // the existing anonymous submission path working unchanged.
  claimedByUserId?: string | null;
}

export type SubmitClaimResult =
  | { status: "created"; claim: BusinessClaim }
  | { status: "not_found" }
  | { status: "already_claimed" };

// README §5: claiming requires the venue to not already be claimed. Multiple
// pending claims for the same unclaimed venue are still allowed through (e.g.
// two people from the same business submitting independently) -- the admin
// reviewing them sorts that out rather than the API guessing which is real.
export async function submitClaim(
  venueId: string,
  input: SubmitClaimInput,
  repository: ClaimRepository
): Promise<SubmitClaimResult> {
  const venue = await repository.getVenue(venueId);
  if (!venue) return { status: "not_found" };
  if (venue.claimedByBusiness) return { status: "already_claimed" };

  const claim = await repository.createClaim({
    venueId,
    contactName: input.contactName,
    contactMethod: input.contactMethod,
    contactValue: input.contactValue,
    note: input.note ?? null,
    claimedByUserId: input.claimedByUserId ?? null,
  });
  return { status: "created", claim: toBusinessClaim(claim) };
}

export async function listClaimsForNeighborhood(
  neighborhoodId: string,
  repository: ClaimRepository,
  status?: BusinessClaimStatus
): Promise<BusinessClaimWithVenue[]> {
  const claims = await repository.listClaimsForNeighborhood(neighborhoodId, status);
  return claims.map(toBusinessClaimWithVenue);
}

export type ReviewClaimResult =
  | { status: "updated"; claim: BusinessClaim }
  | { status: "not_found" }
  | { status: "already_reviewed" };

// Only a claim still in "pending" can be approved/rejected -- prevents a
// double-submit (e.g. two admin tabs open) from re-approving an already
// decided claim or re-flipping claimed_by_business.
export async function reviewClaim(
  claimId: string,
  decision: "approve" | "reject",
  reviewedNote: string | null,
  repository: ClaimRepository
): Promise<ReviewClaimResult> {
  const claim = await repository.getClaim(claimId);
  if (!claim) return { status: "not_found" };
  if (claim.status !== "pending") return { status: "already_reviewed" };

  const updated =
    decision === "approve"
      ? await repository.approveClaim(claimId, reviewedNote)
      : await repository.rejectClaim(claimId, reviewedNote);

  return { status: "updated", claim: toBusinessClaim(updated) };
}

// Neighborhood-scoped counterpart of reviewClaim -- rejects (as not_found,
// same as a missing claim, so it doesn't leak whether the id exists in a
// different neighborhood) before delegating to the existing review logic.
export async function reviewClaimForNeighborhood(
  neighborhoodId: string,
  claimId: string,
  decision: "approve" | "reject",
  reviewedNote: string | null,
  repository: ClaimRepository
): Promise<ReviewClaimResult> {
  const ownerNeighborhoodId = await repository.getClaimVenueNeighborhoodId(claimId);
  if (ownerNeighborhoodId !== neighborhoodId) return { status: "not_found" };
  return reviewClaim(claimId, decision, reviewedNote, repository);
}

export type RevokeClaimResult =
  | { status: "revoked"; claim: BusinessClaim }
  | { status: "not_found" }
  | { status: "not_approved" };

// Un-approves an already-approved claim (BACKLOG.md "POIs and venues managed
// almost the same") -- reviewClaim only handles pending claims, so this is
// the only way to flip claimed_by_business back to false, e.g. to unblock
// switching a claimed business to POI kind (never allowed while claimed).
export async function revokeApprovedClaim(
  claimId: string,
  reviewedNote: string | null,
  repository: ClaimRepository
): Promise<RevokeClaimResult> {
  const claim = await repository.getClaim(claimId);
  if (!claim) return { status: "not_found" };
  if (claim.status !== "approved") return { status: "not_approved" };

  const updated = await repository.revokeClaim(claimId, reviewedNote);
  return { status: "revoked", claim: toBusinessClaim(updated) };
}

// Neighborhood-scoped counterpart of revokeApprovedClaim, mirroring
// reviewClaimForNeighborhood's ownership check.
export async function revokeApprovedClaimForNeighborhood(
  neighborhoodId: string,
  claimId: string,
  reviewedNote: string | null,
  repository: ClaimRepository
): Promise<RevokeClaimResult> {
  const ownerNeighborhoodId = await repository.getClaimVenueNeighborhoodId(claimId);
  if (ownerNeighborhoodId !== neighborhoodId) return { status: "not_found" };
  return revokeApprovedClaim(claimId, reviewedNote, repository);
}

// venueOwnerGate already proves the caller holds an approved claim on this
// venue before either of these run, so no not_found/ownership branching is
// needed here the way updateNeighborhoodSocialLinks needs it.
export async function getVenueSocialLinks(
  venueId: string,
  repository: ClaimRepository
): Promise<SocialLinks> {
  return repository.getApprovedClaimSocialLinks(venueId);
}

export async function updateVenueSocialLinks(
  venueId: string,
  socialLinks: SocialLinks,
  repository: ClaimRepository
): Promise<SocialLinks> {
  return repository.updateApprovedClaimSocialLinks(venueId, socialLinks);
}

// BACKLOG.md Ref 30 (iCal/webcal event feed import) -- same venueOwnerGate
// precondition as getVenueSocialLinks/updateVenueSocialLinks above, so no
// not_found branching here either.
export async function getVenueIcalFeed(
  venueId: string,
  repository: ClaimRepository
): Promise<{ icalFeedUrl: string | null; icalSyncedAt: string | null }> {
  return repository.getApprovedClaimIcalFeed(venueId);
}

export type UpdateVenueIcalFeedUrlResult =
  | { status: "invalid_url" }
  | { status: "updated"; icalFeedUrl: string | null };

// Empty string clears the feed (stored as null), mirroring
// updateNeighborhoodIcalFeedUrl's "empty is valid" handling.
export async function updateVenueIcalFeedUrl(
  venueId: string,
  icalFeedUrl: string,
  repository: ClaimRepository
): Promise<UpdateVenueIcalFeedUrlResult> {
  const trimmed = icalFeedUrl.trim();
  if (trimmed && !isValidFeedUrl(trimmed)) return { status: "invalid_url" };

  const saved = await repository.updateApprovedClaimIcalFeedUrl(venueId, trimmed || null);
  return { status: "updated", icalFeedUrl: saved };
}
