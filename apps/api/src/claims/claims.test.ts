import { describe, expect, it } from "vitest";
import type { SocialLinks } from "@blockwise/types";
import {
  getVenueSocialLinks,
  listClaimsForNeighborhood,
  reviewClaim,
  reviewClaimForNeighborhood,
  revokeApprovedClaim,
  revokeApprovedClaimForNeighborhood,
  submitClaim,
  updateVenueSocialLinks,
} from "./claims";
import type {
  ClaimedVenue,
  ClaimRecord,
  ClaimRepository,
  ClaimWithVenueRecord,
  CreateClaimInput,
  VenueClaimStatus,
} from "./repository";

interface VenueFixture {
  claimedByBusiness: boolean;
  neighborhoodId: string;
  name: string;
  address: string;
}

function venue(overrides: Partial<VenueFixture> = {}): VenueFixture {
  return {
    claimedByBusiness: false,
    neighborhoodId: "neighborhood-1",
    name: "Venue",
    address: "123 Main St",
    ...overrides,
  };
}

// In-memory fake, mirroring the pattern used for VenueDetailRepository tests.
class FakeClaimRepository implements ClaimRepository {
  claims: ClaimRecord[] = [];
  private nextId = 1;

  constructor(private readonly venues: Map<string, VenueFixture>) {}

  async getVenue(venueId: string): Promise<VenueClaimStatus | null> {
    const v = this.venues.get(venueId);
    if (!v) return null;
    return { id: venueId, claimedByBusiness: v.claimedByBusiness };
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

  async listClaimsForNeighborhood(
    neighborhoodId: string,
    status?: ClaimRecord["status"]
  ): Promise<ClaimWithVenueRecord[]> {
    return this.claims
      .filter((c) => this.venues.get(c.venueId)?.neighborhoodId === neighborhoodId)
      .filter((c) => (status ? c.status === status : true))
      .map((c) => {
        const v = this.venues.get(c.venueId)!;
        return { ...c, venueName: v.name, venueAddress: v.address };
      });
  }

  async getClaimVenueNeighborhoodId(claimId: string): Promise<string | null> {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) return null;
    return this.venues.get(claim.venueId)?.neighborhoodId ?? null;
  }

  async getClaim(claimId: string): Promise<ClaimRecord | null> {
    return this.claims.find((c) => c.id === claimId) ?? null;
  }

  async approveClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const claim = this.claims.find((c) => c.id === claimId)!;
    claim.status = "approved";
    claim.reviewedAt = new Date().toISOString();
    claim.reviewedNote = reviewedNote;
    const v = this.venues.get(claim.venueId);
    if (v) v.claimedByBusiness = true;
    return claim;
  }

  async rejectClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const claim = this.claims.find((c) => c.id === claimId)!;
    claim.status = "rejected";
    claim.reviewedAt = new Date().toISOString();
    claim.reviewedNote = reviewedNote;
    return claim;
  }

  async revokeClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const claim = this.claims.find((c) => c.id === claimId)!;
    claim.status = "rejected";
    claim.reviewedAt = new Date().toISOString();
    claim.reviewedNote = reviewedNote;
    const v = this.venues.get(claim.venueId);
    if (v) v.claimedByBusiness = false;
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
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ claimedByBusiness: true })]]));
    const result = await submitClaim("venue-1", CONTACT, repo);
    expect(result).toEqual({ status: "already_claimed" });
  });

  it("creates a pending claim for an unclaimed venue", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
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
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const result = await reviewClaim("missing-claim", "approve", null, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("approving a claim flips the venue's claimed_by_business flag", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
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
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await reviewClaim(created.claim.id, "reject", null, repo);
    expect(result.status).toBe("updated");
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(false);
  });

  it("refuses to re-review a claim that's already been decided", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    await reviewClaim(created.claim.id, "approve", null, repo);
    const second = await reviewClaim(created.claim.id, "reject", null, repo);
    expect(second).toEqual({ status: "already_reviewed" });
  });
});

describe("listClaimsForNeighborhood", () => {
  it("only returns claims whose venue belongs to the given neighborhood, filtered by status", async () => {
    const repo = new FakeClaimRepository(
      new Map([
        ["venue-1", venue({ neighborhoodId: "neighborhood-1", name: "Venue One", address: "1 First St" })],
        ["venue-2", venue({ neighborhoodId: "neighborhood-1" })],
        ["venue-3", venue({ neighborhoodId: "neighborhood-2" })],
      ])
    );
    const first = await submitClaim("venue-1", CONTACT, repo);
    await submitClaim("venue-2", CONTACT, repo);
    await submitClaim("venue-3", CONTACT, repo);
    if (first.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(first.claim.id, "approve", null, repo);

    const pending = await listClaimsForNeighborhood("neighborhood-1", repo, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].venue_id).toBe("venue-2");

    const all = await listClaimsForNeighborhood("neighborhood-1", repo);
    expect(all).toHaveLength(2);
    expect(all.find((c) => c.venue_id === "venue-1")).toMatchObject({
      venue_name: "Venue One",
      venue_address: "1 First St",
    });

    const other = await listClaimsForNeighborhood("neighborhood-2", repo);
    expect(other).toHaveLength(1);
    expect(other[0].venue_id).toBe("venue-3");
  });
});

describe("reviewClaimForNeighborhood", () => {
  it("returns not_found when the claim's venue belongs to a different neighborhood", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ neighborhoodId: "neighborhood-1" })]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await reviewClaimForNeighborhood("neighborhood-2", created.claim.id, "approve", null, repo);
    expect(result).toEqual({ status: "not_found" });
    expect((await repo.getClaim(created.claim.id))?.status).toBe("pending");
  });

  it("returns not_found for a genuinely missing claim id", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ neighborhoodId: "neighborhood-1" })]]));
    const result = await reviewClaimForNeighborhood("neighborhood-1", "missing-claim", "approve", null, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("delegates to the normal review flow when the neighborhood matches", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ neighborhoodId: "neighborhood-1" })]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await reviewClaimForNeighborhood(
      "neighborhood-1",
      created.claim.id,
      "approve",
      "looks good",
      repo
    );
    expect(result.status).toBe("updated");
    if (result.status === "updated") expect(result.claim.reviewed_note).toBe("looks good");

    const second = await reviewClaimForNeighborhood("neighborhood-1", created.claim.id, "reject", null, repo);
    expect(second).toEqual({ status: "already_reviewed" });
  });
});

describe("revokeApprovedClaim", () => {
  it("returns not_found for an unknown claim", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const result = await revokeApprovedClaim("missing-claim", null, repo);
    expect(result).toEqual({ status: "not_found" });
  });

  it("refuses to revoke a claim that isn't approved yet", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");

    const result = await revokeApprovedClaim(created.claim.id, null, repo);
    expect(result).toEqual({ status: "not_approved" });
  });

  // The whole reason this exists (BACKLOG.md "POIs and venues managed
  // almost the same") -- reviewClaim can never un-approve a claim, so this
  // is the only path back to claimed_by_business = false, e.g. to unblock
  // switching that business to POI kind.
  it("flips claimed_by_business back to false and marks the claim rejected", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(created.claim.id, "approve", null, repo);
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(true);

    const result = await revokeApprovedClaim(created.claim.id, "no longer valid", repo);
    expect(result.status).toBe("revoked");
    if (result.status === "revoked") {
      expect(result.claim.status).toBe("rejected");
      expect(result.claim.reviewed_note).toBe("no longer valid");
    }
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(false);
  });
});

describe("revokeApprovedClaimForNeighborhood", () => {
  it("returns not_found when the claim's venue belongs to a different neighborhood", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ neighborhoodId: "neighborhood-1" })]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(created.claim.id, "approve", null, repo);

    const result = await revokeApprovedClaimForNeighborhood("neighborhood-2", created.claim.id, null, repo);
    expect(result).toEqual({ status: "not_found" });
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(true);
  });

  it("delegates to the normal revoke flow when the neighborhood matches", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue({ neighborhoodId: "neighborhood-1" })]]));
    const created = await submitClaim("venue-1", CONTACT, repo);
    if (created.status !== "created") throw new Error("expected claim to be created");
    await reviewClaim(created.claim.id, "approve", null, repo);

    const result = await revokeApprovedClaimForNeighborhood("neighborhood-1", created.claim.id, null, repo);
    expect(result.status).toBe("revoked");
    expect((await repo.getVenue("venue-1"))?.claimedByBusiness).toBe(false);
  });
});

describe("venue social links", () => {
  it("defaults to empty and can be updated for an approved claim", async () => {
    const repo = new FakeClaimRepository(new Map([["venue-1", venue()]]));
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
