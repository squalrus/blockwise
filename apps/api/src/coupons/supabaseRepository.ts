import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClaimCouponResult,
  CouponClaimRecord,
  CouponRecord,
  CouponRepository,
  CreateCouponInput,
} from "./repository";

const COUPON_COLUMNS =
  "id, venue_id, title, description, terms, quantity, quantity_remaining, start_at, end_at, created_at";
const CLAIM_COLUMNS = "id, coupon_id, user_id, claimed_at, redeemed_at";

function toCouponRecord(row: {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  terms: string | null;
  quantity: number;
  quantity_remaining: number;
  start_at: string;
  end_at: string;
  created_at: string;
}): CouponRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    title: row.title,
    description: row.description,
    terms: row.terms,
    quantity: row.quantity,
    quantityRemaining: row.quantity_remaining,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

function toClaimRecord(row: {
  id: string;
  coupon_id: string;
  user_id: string;
  claimed_at: string;
  redeemed_at: string | null;
}): CouponClaimRecord {
  return {
    id: row.id,
    couponId: row.coupon_id,
    userId: row.user_id,
    claimedAt: row.claimed_at,
    redeemedAt: row.redeemed_at,
  };
}

interface ClaimCouponRow {
  claim_id: string | null;
  claimed_at: string | null;
  redeemed_at: string | null;
  result: "claimed" | "already_claimed" | "unavailable";
}

export class SupabaseCouponRepository implements CouponRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createCoupon(input: CreateCouponInput): Promise<CouponRecord> {
    const { data, error } = await this.supabase
      .from("coupon")
      .insert({
        venue_id: input.venueId,
        title: input.title,
        description: input.description,
        terms: input.terms,
        quantity: input.quantity,
        quantity_remaining: input.quantity,
        start_at: input.startAt,
        end_at: input.endAt,
      })
      .select(COUPON_COLUMNS)
      .single();

    if (error) throw new Error(`createCoupon failed: ${error.message}`);
    return toCouponRecord(data);
  }

  async listCouponsForVenue(venueId: string): Promise<CouponRecord[]> {
    const { data, error } = await this.supabase
      .from("coupon")
      .select(COUPON_COLUMNS)
      .eq("venue_id", venueId)
      .order("start_at", { ascending: false });

    if (error) throw new Error(`listCouponsForVenue failed: ${error.message}`);
    return (data ?? []).map(toCouponRecord);
  }

  async listCouponsForVenues(venueIds: string[]): Promise<CouponRecord[]> {
    if (venueIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("coupon")
      .select(COUPON_COLUMNS)
      .in("venue_id", venueIds)
      .order("start_at", { ascending: false });

    if (error) throw new Error(`listCouponsForVenues failed: ${error.message}`);
    return (data ?? []).map(toCouponRecord);
  }

  async getCoupon(couponId: string): Promise<CouponRecord | null> {
    const { data, error } = await this.supabase
      .from("coupon")
      .select(COUPON_COLUMNS)
      .eq("id", couponId)
      .maybeSingle();

    if (error) throw new Error(`getCoupon failed: ${error.message}`);
    return data ? toCouponRecord(data) : null;
  }

  async claimCoupon(couponId: string, userId: string): Promise<ClaimCouponResult> {
    const { data, error } = await this.supabase.rpc("claim_coupon", {
      p_coupon_id: couponId,
      p_user_id: userId,
    });

    if (error) throw new Error(`claimCoupon failed: ${error.message}`);
    const row = (data as ClaimCouponRow[] | null)?.[0];
    if (!row) throw new Error("claimCoupon failed: no row returned");

    if (row.result === "unavailable") return { status: "unavailable" };

    const claim: CouponClaimRecord = {
      id: row.claim_id!,
      couponId,
      userId,
      claimedAt: row.claimed_at!,
      redeemedAt: row.redeemed_at,
    };
    return row.result === "already_claimed" ? { status: "already_claimed", claim } : { status: "claimed", claim };
  }

  async getClaimById(claimId: string): Promise<CouponClaimRecord | null> {
    const { data, error } = await this.supabase
      .from("coupon_claim")
      .select(CLAIM_COLUMNS)
      .eq("id", claimId)
      .maybeSingle();

    if (error) throw new Error(`getClaimById failed: ${error.message}`);
    return data ? toClaimRecord(data) : null;
  }

  async redeemClaim(claimId: string, userId: string): Promise<CouponClaimRecord | null> {
    const { data, error } = await this.supabase
      .from("coupon_claim")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("id", claimId)
      .eq("user_id", userId)
      .is("redeemed_at", null)
      .select(CLAIM_COLUMNS)
      .maybeSingle();

    if (error) throw new Error(`redeemClaim failed: ${error.message}`);
    return data ? toClaimRecord(data) : null;
  }

  async listClaimsForCoupons(couponIds: string[], userId: string): Promise<CouponClaimRecord[]> {
    if (couponIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from("coupon_claim")
      .select(CLAIM_COLUMNS)
      .eq("user_id", userId)
      .in("coupon_id", couponIds);

    if (error) throw new Error(`listClaimsForCoupons failed: ${error.message}`);
    return (data ?? []).map(toClaimRecord);
  }
}
