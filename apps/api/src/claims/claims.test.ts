import { describe, expect, it } from "vitest";
import type { SocialLinks } from "@blockwise/types";
import {
  getVenueSocialLinks,
  listClaims,
  reviewClaim,
  submitClaim,
  updateVenueSocialLinks,
} from "./claims";
import type {
  ClaimedVenue,
  ClaimRecord,
  ClaimRepository,
  CreateClaimInput,
  VenueClaimStatus,
} from "./repository";

// In-memory fake, mirroring the pattern used for VenueDetailRepository tests.
class FakeClaimRepository implements ClaimRepository {
  claims: ClaimRecord[] = [];
  private nextId = 1;

  constructor(private readonly venues: Map<string, boolean>) {}

  async getVenue(venueId: string): Promise<VenueClaimStatus | null> {
    if (!this.venues.has(venueId)) return null;
    return { id: venueId, claimedByBusiness: this.venues.get(venueId)! };
  }

  async createClaim(input: CreateClaimInput): Promise<ClaimRecord> {
    const record: ClaimRecord = {
      id: `claim-${this.nextId++}`,
      venueId: input.venueId,
      contactName: input.contactName,
      contactMethod: input.contactMethod,
      contactValue: input.contactValue,
      note: input.note,
      status: "pending",
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedNote: null,
      claimedByUserId: input.claimedByUserId,
      socialLinks: {},
    };
    this.claims.push(record);
    return record;
  }

  async listClaimedVenuesForUser(_userId: string): Promise<ClaimedVenue[]> {
    return [];
  }

  async isVenueClaimedByUser(userId: string, venueId: string): Promise<boolean> {
    return this.claims.some(
      (c) => c.claimedByUserId === userId && c.venueId === venueId && c.status === "approved"
    );
  }

  async listClaims(status?: ClaimRecord["status"]): Promise<ClaimRecord[]> {
    return status ? this.claims.filter((c) => c.status === status) : this.claims;
  }

  async getClaim(claimId: string): Promise<ClaimRecord | null> {
    return this.claims.find((c) => c.id === claimId) ?? null;
  }

  async approveClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const claim = this.claims.find((c) => c.id === claimId)!;
    claim.status = "approved";
    claim.reviewedAt = new Date().toISOString();
    claim.reviewedNote = reviewedNote;
    this.venues.set(claim.venueId, true);
    return claim;
  }

  async rejectClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const claim = this.claims.find((c) => c.id === claimId)!;
    claim.status = "rejected";
    claim.reviewedAt = new Date().toISOString();
    claim.reviewedNote = reviewedNote;
    return claim;
  }

  async getApprovedClaimSocialLinks(venueId: string): Promise<SocialLinks> {
    const claim = this.claims.find((c) => c.venueId === venueId && c.status === "approved");
    return claim?.socialLinks ?? {};
  }

  async updateApprovedClaimSocialLinks(venueId: string, socialLinks: SocialLinks): Promise<SocialLinks> {
    const claim = this.claims.find((c) => c.venueId === venueId && c.status === "approved");
    if (!claim) throw new Error("no approved claim for venue");
    claim.socialLinks = socialLinks;
    return claim.socialLinks;
  }
}

const CONTACT = { contactName: "Jane Doe", contactMethod: "email" as const, contactValue: "jane@example.com" };

describe("submitClaim", () => {
  it("returns not_found for an unknown venue", async () => {
    const repo = new FakeClaimRepository(new Map());
    const result = await submitClaim("missing-venue", CONTACT, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("returns already_claimed when the venue is already claimed", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", true]]));
    const result = await submitClaim("venue-1", CONTACT, repo);
    expect(result).toEqual({ status: "already_claimed" });
  });

  it("creates a pending claim for an unclaimed venue", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const result = await submitClaim("venue-1", CONTACT, repo);
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.claim.status).toBe("pending");
      expect(result.claim.venue_id).toBe("venue-1");
    }
  });
});

describe("reviewClaim", () => {
  it("returns not_found for an unknown claim", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const result = await reviewClaim("missing-claim", "approve", null, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("approving a claim flips the venue's claimed_by_business flag", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await reviewClaim(created.claim.id, "approve", "verified via email", repo);
    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.claim.status).toBe("approved");
      expect(result.claim.reviewed_note).toBe("verified via email");
    }
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(true);
  });

  it("rejecting a claim leaves the venue unclaimed", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await reviewClaim(created.claim.id, "reject", null, repo);
    expect(result.status).toBe("updated");
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(false);
  });

  it("refuses to re-review a claim that's already been decided", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    await reviewClaim(created.claim.id, "approve", null, repo);
    const second = await reviewClaim(created.claim.id, "reject", null, repo);
    expect(second).toEqual({ status: "already_reviewed" });
  });
});

describe("listClaims", () => {
  it("filters by status when provided", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false], ["venue-2", false]]));
    const first = await submitClaim("venue-1", CONTACT, repo);
    await submitClaim("venue-2", CONTACT, repo);
    if (first.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(first.claim.id, "approve", null, repo);

    const pending = await listClaims(repo, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].venue_id).toBe("venue-2");
  });
});

describe("venue social links", () => {
  it("defaults to empty and can be updated for an approved claim", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", false]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(created.claim.id, "approve", null, repo);

    expect(await getVenueSocialLinks("venue-1", repo)).toEqual({});

    const updated = await updateVenueSocialLinks(
      "venue-1",
      { instagram: "https://instagram.com/example" },
      repo
    );
    expect(updated).toEqual({ instagram: "https://instagram.com/example" });
    expect(await getVenueSocialLinks("venue-1", repo)).toEqual({
      instagram: "https://instagram.com/example",
    });
  });
});
