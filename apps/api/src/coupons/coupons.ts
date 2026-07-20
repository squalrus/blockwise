import type { Coupon, CouponClaim, CouponStatus, CouponWithClaim } from "@blockwise/types";
import { snapshotMushroomForUser } from "@blockwise/types";
import { CHECKIN_COOLDOWN_MS, toMushroomConfig } from "../checkins/checkin";
import type { CheckinRepository } from "../checkins/repository";
import type { ClaimCouponResult, CouponClaimRecord, CouponRecord, CouponRepository } from "./repository";

export interface CouponRepositories {
  coupon: CouponRepository;
  checkin: CheckinRepository;
}

function toCoupon(record: CouponRecord): Coupon {
  return {
    id: record.id,
    venue_id: record.venueId,
    title: record.title,
    description: record.description,
    terms: record.terms,
    quantity: record.quantity,
    quantity_remaining: record.quantityRemaining,
    start_at: record.startAt,
    end_at: record.endAt,
    created_at: record.createdAt,
  };
}

function toCouponClaim(record: CouponClaimRecord): CouponClaim {
  return {
    id: record.id,
    coupon_id: record.couponId,
    user_id: record.userId,
    claimed_at: record.claimedAt,
    redeemed_at: record.redeemedAt,
  };
}

function couponStatus(record: CouponRecord, now: number): CouponStatus {
  const start = new Date(record.startAt).getTime();
  const end = new Date(record.endAt).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

// The auto-grant case from BACKLOG.md Ref 83: a checkin at this venue within
// the existing per-target cooldown window counts as "physically here" for
// unlocking a coupon, whether that checkin happened before or after the
// coupon's own start_at -- retroactive within the cooldown window, per the
// report's "anyone already at the venue (within the 4 hour cooldown period)
// will be granted the coupon automatically" framing.
async function isEligibleToClaim(
  userId: string,
  venueId: string,
  checkinRepository: CheckinRepository
): Promise<boolean> {
  const lastCheckin = await checkinRepository.getLastCheckinForLocation(userId, venueId);
  if (!lastCheckin) return false;
  return Date.now() - new Date(lastCheckin.checkedInAt).getTime() < CHECKIN_COOLDOWN_MS;
}

async function attachClaimAndEligibility(
  coupons: CouponRecord[],
  viewerId: string | null,
  repositories: CouponRepositories,
  now: number
): Promise<CouponWithClaim[]> {
  const claims = viewerId
    ? await repositories.coupon.listClaimsForCoupons(
        coupons.map((c) => c.id),
        viewerId
      )
    : [];
  const claimsByCouponId = new Map(claims.map((claim) => [claim.couponId, claim]));

  return Promise.all(
    coupons.map(async (record) => {
      const claim = claimsByCouponId.get(record.id) ?? null;
      const eligible =
        viewerId && !claim && couponStatus(record, now) === "active"
          ? await isEligibleToClaim(viewerId, record.venueId, repositories.checkin)
          : false;
      return {
        ...toCoupon(record),
        status: couponStatus(record, now),
        claim: claim ? toCouponClaim(claim) : null,
        eligible_to_claim: eligible,
      };
    })
  );
}

export type CreateCouponResult = { status: "created"; coupon: Coupon } | { status: "invalid_time_range" };

export async function createCoupon(
  venueId: string,
  input: { title: string; description: string; terms: string | null; quantity: number; startAt: string; endAt: string },
  repository: CouponRepository
): Promise<CreateCouponResult> {
  const start = new Date(input.startAt).getTime();
  const end = new Date(input.endAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { status: "invalid_time_range" };
  }

  const record = await repository.createCoupon({ venueId, ...input });
  return { status: "created", coupon: toCoupon(record) };
}

export async function listCouponsForVenue(venueId: string, repository: CouponRepository): Promise<Coupon[]> {
  const records = await repository.listCouponsForVenue(venueId);
  return records.map(toCoupon);
}

// Public venue page listing: every upcoming/active coupon, plus any ended
// coupon the viewer holds a claim on (so a redeemed coupon stays visible
// with its stored redeemed_at instead of disappearing once it expires).
export async function listVenueCouponsForViewer(
  venueId: string,
  viewerId: string | null,
  repositories: CouponRepositories
): Promise<CouponWithClaim[]> {
  const coupons = await repositories.coupon.listCouponsForVenue(venueId);
  const now = Date.now();

  if (!viewerId) {
    return coupons.filter((c) => couponStatus(c, now) !== "ended").map((record) => ({
      ...toCoupon(record),
      status: couponStatus(record, now),
      claim: null,
      eligible_to_claim: false,
    }));
  }

  const claims = await repositories.coupon.listClaimsForCoupons(
    coupons.map((c) => c.id),
    viewerId
  );
  const claimedCouponIds = new Set(claims.map((c) => c.couponId));
  const visible = coupons.filter((c) => couponStatus(c, now) !== "ended" || claimedCouponIds.has(c.id));

  return attachClaimAndEligibility(visible, viewerId, repositories, now);
}

// Spore Feed pin (BACKLOG.md Ref 83): active coupons at every venue the
// viewer favorites (favoriting a venue is the follow relationship, per
// VenueDashboardSummary's own follower_count comment), mirroring the
// followed-events "Today" pin. venueIds is resolved by the caller from
// FavoriteRepository.listFavoriteVenuesForUser.
export async function listActiveCouponsForVenues(
  venueIds: string[],
  viewerId: string,
  repositories: CouponRepositories
): Promise<CouponWithClaim[]> {
  if (venueIds.length === 0) return [];
  const coupons = await repositories.coupon.listCouponsForVenues(venueIds);
  const now = Date.now();
  const active = coupons.filter((c) => couponStatus(c, now) === "active");
  return attachClaimAndEligibility(active, viewerId, repositories, now);
}

export type ClaimResult =
  | { status: "claimed"; claim: CouponClaim }
  | { status: "already_claimed"; claim: CouponClaim }
  | { status: "not_found" }
  | { status: "not_active" }
  | { status: "not_checked_in" }
  | { status: "unavailable" };

export async function claimCoupon(
  couponId: string,
  userId: string,
  repositories: CouponRepositories
): Promise<ClaimResult> {
  const coupon = await repositories.coupon.getCoupon(couponId);
  if (!coupon) return { status: "not_found" };
  if (couponStatus(coupon, Date.now()) !== "active") return { status: "not_active" };

  const eligible = await isEligibleToClaim(userId, coupon.venueId, repositories.checkin);
  if (!eligible) return { status: "not_checked_in" };

  const result: ClaimCouponResult = await repositories.coupon.claimCoupon(couponId, userId);
  if (result.status === "unavailable") return { status: "unavailable" };
  return { status: result.status, claim: toCouponClaim(result.claim) };
}

export type RedeemResult =
  | { status: "redeemed"; claim: CouponClaim }
  | { status: "already_redeemed"; claim: CouponClaim }
  | { status: "not_found" };

// Also writes a Checkin row for the claim's venue when the target-venue
// cooldown has elapsed since the viewer's last one (BACKLOG.md Ref 3:
// redemption is at least as strong evidence of presence as GPS, so it
// should count as a checkin too) -- skipped, not duplicated, if the viewer
// already has a checkin inside the cooldown window (e.g. the very checkin
// that unlocked this claim). Uses the venue's own coordinates as the device
// position, since redemption is an in-person, staff-witnessed action rather
// than a GPS-verified one.
export async function redeemCouponClaim(
  claimId: string,
  userId: string,
  repositories: CouponRepositories
): Promise<RedeemResult> {
  const existing = await repositories.coupon.getClaimById(claimId);
  if (!existing || existing.userId !== userId) return { status: "not_found" };

  if (existing.redeemedAt) {
    return { status: "already_redeemed", claim: toCouponClaim(existing) };
  }

  const redeemed = await repositories.coupon.redeemClaim(claimId, userId);
  if (!redeemed) {
    // Raced by a concurrent redeem -- re-read to return the now-redeemed state.
    const raced = await repositories.coupon.getClaimById(claimId);
    return { status: "already_redeemed", claim: toCouponClaim(raced ?? existing) };
  }

  const coupon = await repositories.coupon.getCoupon(redeemed.couponId);
  if (coupon) {
    const location = await repositories.checkin.getLocation(coupon.venueId);
    const lastCheckin = await repositories.checkin.getLastCheckinForLocation(userId, coupon.venueId);
    const cooldownActive = lastCheckin
      ? Date.now() - new Date(lastCheckin.checkedInAt).getTime() < CHECKIN_COOLDOWN_MS
      : false;
    if (location && !cooldownActive) {
      const customization = await repositories.checkin.getMushroomCustomization(userId);
      await repositories.checkin.createCheckin({
        userId,
        venueId: coupon.venueId,
        deviceLat: location.lat,
        deviceLng: location.lng,
        mushroomSnapshot: snapshotMushroomForUser(userId, toMushroomConfig(customization)),
      });
    }
  }

  return { status: "redeemed", claim: toCouponClaim(redeemed) };
}
