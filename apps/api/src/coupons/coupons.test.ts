import { describe, expect, it } from "vitest";
import type { MushroomCustomization } from "@blockwise/types";
import { CHECKIN_COOLDOWN_MS } from "../checkins/checkin";
import type { CheckinRecord, CheckinRepository, CheckinVenue, LocationCoords } from "../checkins/repository";
import {
  claimCoupon,
  createCoupon,
  listActiveCouponsForVenues,
  listVenueCouponsForViewer,
  redeemCouponClaim,
} from "./coupons";
import type { ClaimCouponResult, CouponClaimRecord, CouponRecord, CouponRepository, CreateCouponInput } from "./repository";

// In-memory fake mirroring claim_coupon()'s atomic check-and-decrement
// (supabase/migrations/20260720030000_venue_coupons.sql), so coupons.ts's
// claim/redeem logic can be exercised without a database.
class FakeCouponRepository implements CouponRepository {
  coupons: CouponRecord[] = [];
  claims: CouponClaimRecord[] = [];
  private nextCouponId = 1;
  private nextClaimId = 1;

  async createCoupon(input: CreateCouponInput): Promise<CouponRecord> {
    const record: CouponRecord = {
      id: `coupon-${this.nextCouponId++}`,
      venueId: input.venueId,
      title: input.title,
      description: input.description,
      terms: input.terms,
      quantity: input.quantity,
      quantityRemaining: input.quantity,
      startAt: input.startAt,
      endAt: input.endAt,
      createdAt: new Date().toISOString(),
    };
    this.coupons.push(record);
    return record;
  }

  async listCouponsForVenue(venueId: string): Promise<CouponRecord[]> {
    return this.coupons.filter((c) => c.venueId === venueId);
  }

  async listCouponsForVenues(venueIds: string[]): Promise<CouponRecord[]> {
    return this.coupons.filter((c) => venueIds.includes(c.venueId));
  }

  async getCoupon(couponId: string): Promise<CouponRecord | null> {
    return this.coupons.find((c) => c.id === couponId) ?? null;
  }

  async claimCoupon(couponId: string, userId: string): Promise<ClaimCouponResult> {
    const existing = this.claims.find((c) => c.couponId === couponId && c.userId === userId);
    if (existing) return { status: "already_claimed", claim: existing };

    const coupon = this.coupons.find((c) => c.id === couponId);
    if (!coupon || coupon.quantityRemaining <= 0) return { status: "unavailable" };

    coupon.quantityRemaining -= 1;
    const claim: CouponClaimRecord = {
      id: `claim-${this.nextClaimId++}`,
      couponId,
      userId,
      claimedAt: new Date().toISOString(),
      redeemedAt: null,
    };
    this.claims.push(claim);
    return { status: "claimed", claim };
  }

  async getClaimById(claimId: string): Promise<CouponClaimRecord | null> {
    return this.claims.find((c) => c.id === claimId) ?? null;
  }

  async redeemClaim(claimId: string, userId: string): Promise<CouponClaimRecord | null> {
    const claim = this.claims.find((c) => c.id === claimId && c.userId === userId && c.redeemedAt === null);
    if (!claim) return null;
    claim.redeemedAt = new Date().toISOString();
    return claim;
  }

  async listClaimsForCoupons(couponIds: string[], userId: string): Promise<CouponClaimRecord[]> {
    return this.claims.filter((c) => couponIds.includes(c.couponId) && c.userId === userId);
  }
}

// Minimal fake mirroring checkins/checkin.test.ts's FakeCheckinRepository --
// only the methods coupons.ts's eligibility/redeem-checkin logic actually
// calls are exercised meaningfully here.
class FakeCheckinRepository implements CheckinRepository {
  checkins: CheckinRecord[] = [];
  private nextId = 1;

  constructor(private readonly locations: LocationCoords[] = []) {}

  async getLocation(locationId: string): Promise<LocationCoords | null> {
    return this.locations.find((l) => l.id === locationId) ?? null;
  }

  async getMushroomCustomization(_userId: string): Promise<MushroomCustomization | null> {
    return null;
  }

  async getLastCheckinForLocation(userId: string, locationId: string): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter((c) => c.userId === userId && c.venueId === locationId);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))[0];
  }

  async getLastCheckinAnywhere(userId: string): Promise<CheckinRecord | null> {
    const matches = this.checkins.filter((c) => c.userId === userId);
    if (matches.length === 0) return null;
    return matches.sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt))[0];
  }

  async createCheckin(input: {
    userId: string;
    venueId: string;
    deviceLat: number;
    deviceLng: number;
    mushroomSnapshot: CheckinRecord["mushroomSnapshot"];
  }): Promise<CheckinRecord> {
    const record: CheckinRecord = {
      id: `checkin-${this.nextId++}`,
      userId: input.userId,
      venueId: input.venueId,
      deviceLat: input.deviceLat,
      deviceLng: input.deviceLng,
      checkedInAt: new Date().toISOString(),
      mushroomSnapshot: input.mushroomSnapshot,
    };
    this.checkins.push(record);
    return record;
  }

  async listCheckinsForUser(_userId: string): Promise<CheckinVenue[]> {
    return [];
  }

  async countCheckinsForLocation(_locationId: string): Promise<number> {
    return 0;
  }

  async countCheckinsForNeighborhood(): Promise<number> {
    return 0;
  }

  async listRecentCheckinSnapshotsForNeighborhood(): Promise<NonNullable<CheckinRecord["mushroomSnapshot"]>[]> {
    return [];
  }
}

// claimCoupon/couponStatus read the real clock (Date.now()) internally, so
// the active window here is computed relative to it too, rather than a
// fixed timestamp that would drift stale against whenever the suite runs.
const ACTIVE_WINDOW = {
  startAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};
const VENUE: LocationCoords = { id: "venue-1", lat: 47.6062, lng: -122.3321 };

function checkedInJustNow(userId: string, venueId: string, at = new Date().toISOString()): CheckinRecord {
  return { id: "checkin-seed", userId, venueId, deviceLat: 0, deviceLng: 0, checkedInAt: at, mushroomSnapshot: null };
}

describe("createCoupon", () => {
  it("rejects an end_at at or before start_at", async () => {
    const repo = new FakeCouponRepository();
    const result = await createCoupon(
      "venue-1",
      { title: "Free coffee", description: "1 free coffee", terms: null, quantity: 10, startAt: ACTIVE_WINDOW.endAt, endAt: ACTIVE_WINDOW.startAt },
      repo
    );
    expect(result).toEqual({ status: "invalid_time_range" });
  });

  it("creates a coupon with quantity_remaining seeded to quantity", async () => {
    const repo = new FakeCouponRepository();
    const result = await createCoupon(
      "venue-1",
      { title: "Free coffee", description: "1 free coffee", terms: null, quantity: 10, ...ACTIVE_WINDOW },
      repo
    );
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.coupon.quantity_remaining).toBe(10);
    }
  });
});

describe("claimCoupon", () => {
  async function seedActiveCoupon(couponRepo: FakeCouponRepository, quantity = 1) {
    return couponRepo.createCoupon({
      venueId: "venue-1",
      title: "Free coffee",
      description: "1 free coffee",
      terms: null,
      quantity,
      ...ACTIVE_WINDOW,
    });
  }

  it("requires a checkin within the cooldown window", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    const coupon = await seedActiveCoupon(couponRepo);

    const result = await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual({ status: "not_checked_in" });
  });

  it("grants a coupon to a user already checked in within the cooldown window (auto-grant)", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await seedActiveCoupon(couponRepo);

    const result = await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result.status).toBe("claimed");
  });

  it("refuses a checkin outside the cooldown window as insufficient", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(
      checkedInJustNow("user-1", "venue-1", new Date(Date.now() - CHECKIN_COOLDOWN_MS - 1000).toISOString())
    );
    const coupon = await seedActiveCoupon(couponRepo);

    const result = await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual({ status: "not_checked_in" });
  });

  it("returns not_active for a coupon that hasn't started yet", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await couponRepo.createCoupon({
      venueId: "venue-1",
      title: "Future deal",
      description: "...",
      terms: null,
      quantity: 5,
      startAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    const result = await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual({ status: "not_active" });
  });

  it("is idempotent for a user who already claimed", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await seedActiveCoupon(couponRepo, 5);

    await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    const second = await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(second.status).toBe("already_claimed");

    const fresh = await couponRepo.getCoupon(coupon.id);
    expect(fresh?.quantityRemaining).toBe(4);
  });

  it("returns unavailable once quantity is exhausted", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"), checkedInJustNow("user-2", "venue-1"));
    const coupon = await seedActiveCoupon(couponRepo, 1);

    await claimCoupon(coupon.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    const result = await claimCoupon(coupon.id, "user-2", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("redeemCouponClaim", () => {
  it("redeems an unredeemed claim and writes a checkin once the target cooldown has elapsed", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    const oldCheckin = checkedInJustNow("user-1", "venue-1", new Date(Date.now() - CHECKIN_COOLDOWN_MS - 1000).toISOString());
    checkinRepo.checkins.push(oldCheckin);
    const coupon = await couponRepo.createCoupon({ venueId: "venue-1", title: "T", description: "D", terms: null, quantity: 1, ...ACTIVE_WINDOW });
    const claimResult = await couponRepo.claimCoupon(coupon.id, "user-1");
    if (claimResult.status !== "claimed") throw new Error("expected claimed");

    const result = await redeemCouponClaim(claimResult.claim.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result.status).toBe("redeemed");
    if (result.status === "redeemed") expect(result.claim.redeemed_at).not.toBeNull();
    expect(checkinRepo.checkins).toHaveLength(2);
  });

  it("skips writing a duplicate checkin when the target cooldown is still active", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await couponRepo.createCoupon({ venueId: "venue-1", title: "T", description: "D", terms: null, quantity: 1, ...ACTIVE_WINDOW });
    const claimResult = await couponRepo.claimCoupon(coupon.id, "user-1");
    if (claimResult.status !== "claimed") throw new Error("expected claimed");

    await redeemCouponClaim(claimResult.claim.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(checkinRepo.checkins).toHaveLength(1);
  });

  it("returns already_redeemed with the stored timestamp on a repeat redemption attempt", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await couponRepo.createCoupon({ venueId: "venue-1", title: "T", description: "D", terms: null, quantity: 1, ...ACTIVE_WINDOW });
    const claimResult = await couponRepo.claimCoupon(coupon.id, "user-1");
    if (claimResult.status !== "claimed") throw new Error("expected claimed");

    const first = await redeemCouponClaim(claimResult.claim.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    const second = await redeemCouponClaim(claimResult.claim.id, "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(second.status).toBe("already_redeemed");
    if (first.status === "redeemed" && second.status === "already_redeemed") {
      expect(second.claim.redeemed_at).toBe(first.claim.redeemed_at);
    }
  });

  it("returns not_found for a claim belonging to a different user", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    const coupon = await couponRepo.createCoupon({ venueId: "venue-1", title: "T", description: "D", terms: null, quantity: 1, ...ACTIVE_WINDOW });
    const claimResult = await couponRepo.claimCoupon(coupon.id, "user-1");
    if (claimResult.status !== "claimed") throw new Error("expected claimed");

    const result = await redeemCouponClaim(claimResult.claim.id, "user-2", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("listVenueCouponsForViewer", () => {
  it("hides an ended coupon from a signed-out visitor", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    await couponRepo.createCoupon({
      venueId: "venue-1",
      title: "Past deal",
      description: "...",
      terms: null,
      quantity: 5,
      startAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    const result = await listVenueCouponsForViewer("venue-1", null, { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toHaveLength(0);
  });

  it("keeps an ended coupon visible to a viewer who holds a claim on it, showing the redeemed timestamp", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    const coupon = await couponRepo.createCoupon({
      venueId: "venue-1",
      title: "Past deal",
      description: "...",
      terms: null,
      quantity: 5,
      startAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const claimResult = await couponRepo.claimCoupon(coupon.id, "user-1");
    if (claimResult.status !== "claimed") throw new Error("expected claimed");
    await couponRepo.redeemClaim(claimResult.claim.id, "user-1");

    const result = await listVenueCouponsForViewer("venue-1", "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("ended");
    expect(result[0].claim?.redeemed_at).not.toBeNull();
  });

  it("flags eligible_to_claim only for an active, unclaimed coupon when the viewer has a recent checkin", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    checkinRepo.checkins.push(checkedInJustNow("user-1", "venue-1"));
    await couponRepo.createCoupon({ venueId: "venue-1", title: "T", description: "D", terms: null, quantity: 5, ...ACTIVE_WINDOW });

    const result = await listVenueCouponsForViewer("venue-1", "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toHaveLength(1);
    expect(result[0].eligible_to_claim).toBe(true);
    expect(result[0].claim).toBeNull();
  });
});

describe("listActiveCouponsForVenues", () => {
  it("only returns coupons currently within their active window", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    await couponRepo.createCoupon({ venueId: "venue-1", title: "Active", description: "D", terms: null, quantity: 5, ...ACTIVE_WINDOW });
    await couponRepo.createCoupon({
      venueId: "venue-1",
      title: "Upcoming",
      description: "D",
      terms: null,
      quantity: 5,
      startAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });

    const result = await listActiveCouponsForVenues(["venue-1"], "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Active");
  });

  it("returns nothing for an empty venue id list without querying", async () => {
    const couponRepo = new FakeCouponRepository();
    const checkinRepo = new FakeCheckinRepository([VENUE]);
    const result = await listActiveCouponsForVenues([], "user-1", { coupon: couponRepo, checkin: checkinRepo });
    expect(result).toEqual([]);
  });
});
