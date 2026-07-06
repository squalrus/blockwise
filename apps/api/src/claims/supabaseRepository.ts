import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessClaimStatus } from "@blockwise/types";
import type { ClaimRecord, ClaimRepository, CreateClaimInput, VenueClaimStatus } from "./repository";

function toRecord(row: {
  id: string;
  venue_id: string;
  contact_name: string;
  contact_method: ClaimRecord["contactMethod"];
  contact_value: string;
  note: string | null;
  status: BusinessClaimStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_note: string | null;
}): ClaimRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    contactName: row.contact_name,
    contactMethod: row.contact_method,
    contactValue: row.contact_value,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedNote: row.reviewed_note,
  };
}

const CLAIM_COLUMNS =
  "id, venue_id, contact_name, contact_method, contact_value, note, status, created_at, reviewed_at, reviewed_note";

export class SupabaseClaimRepository implements ClaimRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getVenue(venueId: string): Promise<VenueClaimStatus | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id, claimed_by_business")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getVenue failed: ${error.message}`);
    return data ? { id: data.id, claimedByBusiness: data.claimed_by_business } : null;
  }

  async createClaim(input: CreateClaimInput): Promise<ClaimRecord> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .insert({
        venue_id: input.venueId,
        contact_name: input.contactName,
        contact_method: input.contactMethod,
        contact_value: input.contactValue,
        note: input.note,
      })
      .select(CLAIM_COLUMNS)
      .single();

    if (error) throw new Error(`createClaim failed: ${error.message}`);
    return toRecord(data);
  }

  async listClaims(status?: BusinessClaimStatus): Promise<ClaimRecord[]> {
    let query = this.supabase.from("business_claim").select(CLAIM_COLUMNS).order("created_at", {
      ascending: false,
    });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`listClaims failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }

  async getClaim(claimId: string): Promise<ClaimRecord | null> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select(CLAIM_COLUMNS)
      .eq("id", claimId)
      .maybeSingle();

    if (error) throw new Error(`getClaim failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  // Not wrapped in a single DB transaction (no RPC/stored procedure defined
  // for it yet) -- acceptable at this project's single-admin, low-concurrency
  // scale, but a failure between the two writes would leave the claim marked
  // approved without the venue flag flipped; worth revisiting if claim volume
  // or admin concurrency grows.
  async approveClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const { data: claim, error: claimError } = await this.supabase
      .from("business_claim")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_note: reviewedNote })
      .eq("id", claimId)
      .select(CLAIM_COLUMNS)
      .single();

    if (claimError) throw new Error(`approveClaim (claim) failed: ${claimError.message}`);

    const { error: venueError } = await this.supabase
      .from("venue")
      .update({ claimed_by_business: true })
      .eq("id", claim.venue_id);

    if (venueError) throw new Error(`approveClaim (venue) failed: ${venueError.message}`);

    return toRecord(claim);
  }

  async rejectClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_note: reviewedNote })
      .eq("id", claimId)
      .select(CLAIM_COLUMNS)
      .single();

    if (error) throw new Error(`rejectClaim failed: ${error.message}`);
    return toRecord(data);
  }
}
