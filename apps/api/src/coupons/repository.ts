export interface CouponRecord {
  id: string;
  venueId: string;
  title: string;
  description: string;
  terms: string | null;
  quantity: number;
  quantityRemaining: number;
  startAt: string;
  endAt: string;
  createdAt: string;
}

export interface CreateCouponInput {
  venueId: string;
  title: string;
  description: string;
  terms: string | null;
  quantity: number;
  startAt: string;
  endAt: string;
}

export interface CouponClaimRecord {
  id: string;
  couponId: string;
  userId: string;
  claimedAt: string;
  redeemedAt: string | null;
}

export type ClaimCouponResult =
  | { status: "claimed"; claim: CouponClaimRecord }
  | { status: "already_claimed"; claim: CouponClaimRecord }
  | { status: "unavailable" };

// Abstracts persistence so coupons.ts's claim/redeem/eligibility logic can be
// tested against an in-memory fake, mirroring checkins/repository.ts.
export interface CouponRepository {
  createCoupon(input: CreateCouponInput): Promise<CouponRecord>;
  // Every coupon for a venue, any status -- backs the owner dashboard (which
  // shows upcoming/active/ended alike, mirroring the Events list) and the
  // public venue page (which further filters ended-and-unclaimed ones out in
  // coupons.ts, since a visitor with no claim has no reason to see an
  // expired offer).
  listCouponsForVenue(venueId: string): Promise<CouponRecord[]>;
  // Active coupons across several venues at once -- backs the Spore Feed pin
  // (BACKLOG.md Ref 83's "shown in their Spore feed, pinned to the top"),
  // where the caller already resolved the viewer's favorited venue ids.
  listCouponsForVenues(venueIds: string[]): Promise<CouponRecord[]>;
  getCoupon(couponId: string): Promise<CouponRecord | null>;
  // Atomic check-and-decrement against quantity_remaining plus claim insert,
  // via the claim_coupon() Postgres function (supabase/migrations/
  // 20260720030000_venue_coupons.sql) -- see that migration's comment for
  // why this needs to be a single statement rather than two round trips.
  claimCoupon(couponId: string, userId: string): Promise<ClaimCouponResult>;
  getClaimById(claimId: string): Promise<CouponClaimRecord | null>;
  // Conditional update (redeemed_at is null -> now()) -- returns null if the
  // claim doesn't exist, isn't owned by userId, or was already redeemed
  // (including a concurrent redeem that raced this one), so the caller can't
  // tell "not found" from "not owned" apart, matching claims/repository.ts's
  // getClaimVenueNeighborhoodId not-found-vs-cross-owner convention.
  redeemClaim(claimId: string, userId: string): Promise<CouponClaimRecord | null>;
  // Every claim this user holds across the given coupons, for batching claim
  // state onto a coupon listing instead of one query per coupon.
  listClaimsForCoupons(couponIds: string[], userId: string): Promise<CouponClaimRecord[]>;
}
