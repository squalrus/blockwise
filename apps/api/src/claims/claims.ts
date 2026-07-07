import type {
  BusinessClaim,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  SocialLinks,
} from "@blockwise/types";
import type { ClaimRecord, ClaimRepository } from "./repository";

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

export async function listClaims(
  repository: ClaimRepository,
  status?: BusinessClaimStatus
): Promise<BusinessClaim[]> {
  const claims = await repository.listClaims(status);
  return claims.map(toBusinessClaim);
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
