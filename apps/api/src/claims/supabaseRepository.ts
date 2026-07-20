import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessClaimStatus, SocialLinks } from "@blockwise/types";
import type {
  ClaimedVenue,
  ClaimRecord,
  ClaimRepository,
  ClaimWithVenueRecord,
  CreateClaimInput,
  VenueClaimStatus,
} from "./repository";

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
  claimed_by_user_id: string;
  social_links: SocialLinks | null;
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
    claimedByUserId: row.claimed_by_user_id,
    socialLinks: row.social_links ?? {},
  };
}

const CLAIM_COLUMNS =
  "id, venue_id, contact_name, contact_method, contact_value, note, status, created_at, reviewed_at, reviewed_note, claimed_by_user_id, social_links";

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
        claimed_by_user_id: input.claimedByUserId,
      })
      .select(CLAIM_COLUMNS)
      .single();

    if (error) throw new Error(`createClaim failed: ${error.message}`);
    return toRecord(data);
  }

  async listClaimsForNeighborhood(
    neighborhoodId: string,
    status?: BusinessClaimStatus
  ): Promise<ClaimWithVenueRecord[]> {
    let query = this.supabase
      .from("business_claim")
      .select(
        `${CLAIM_COLUMNS}, venue:venue_id!inner(neighborhood_id, name, address), claimant:claimed_by_user_id(display_name, username, email)`
      )
      .eq("venue.neighborhood_id", neighborhoodId)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`listClaimsForNeighborhood failed: ${error.message}`);
    return (data ?? []).map((row) => {
      const venue = (Array.isArray(row.venue) ? row.venue[0] : row.venue) as {
        name: string;
        address: string;
      };
      const claimant = (Array.isArray(row.claimant) ? row.claimant[0] : row.claimant) as {
        display_name: string | null;
        username: string | null;
        email: string | null;
      } | null;
      return {
        ...toRecord(row),
        venueName: venue.name,
        venueAddress: venue.address,
        claimantDisplayName: claimant?.display_name ?? null,
        claimantUsername: claimant?.username ?? null,
        claimantEmail: claimant?.email ?? null,
      };
    });
  }

  async getClaimVenueNeighborhoodId(claimId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select("venue:venue_id(neighborhood_id)")
      .eq("id", claimId)
      .maybeSingle();

    if (error) throw new Error(`getClaimVenueNeighborhoodId failed: ${error.message}`);
    const venue = (Array.isArray(data?.venue) ? data?.venue[0] : data?.venue) as {
      neighborhood_id: string;
    } | null;
    return venue?.neighborhood_id ?? null;
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

  // Same not-a-single-transaction caveat as approveClaim (see its comment).
  async revokeClaim(claimId: string, reviewedNote: string | null): Promise<ClaimRecord> {
    const { data: claim, error: claimError } = await this.supabase
      .from("business_claim")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_note: reviewedNote })
      .eq("id", claimId)
      .select(CLAIM_COLUMNS)
      .single();

    if (claimError) throw new Error(`revokeClaim (claim) failed: ${claimError.message}`);

    const { error: venueError } = await this.supabase
      .from("venue")
      .update({ claimed_by_business: false })
      .eq("id", claim.venue_id);

    if (venueError) throw new Error(`revokeClaim (venue) failed: ${venueError.message}`);

    return toRecord(claim);
  }

  async listClaimedVenuesForUser(userId: string): Promise<ClaimedVenue[]> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select("venue:venue_id (id, name, address)")
      .eq("claimed_by_user_id", userId)
      .eq("status", "approved");

    if (error) throw new Error(`listClaimedVenuesForUser failed: ${error.message}`);

    return (data ?? [])
      .map((row) => row.venue as unknown as { id: string; name: string; address: string } | null)
      .filter((venue): venue is { id: string; name: string; address: string } => venue !== null)
      .map((venue) => ({ venueId: venue.id, name: venue.name, address: venue.address }));
  }

  async isVenueClaimedByUser(userId: string, venueId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select("id")
      .eq("claimed_by_user_id", userId)
      .eq("venue_id", venueId)
      .eq("status", "approved")
      .maybeSingle();

    if (error) throw new Error(`isVenueClaimedByUser failed: ${error.message}`);
    return data !== null;
  }

  async getApprovedClaimSocialLinks(venueId: string): Promise<SocialLinks> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select("social_links")
      .eq("venue_id", venueId)
      .eq("status", "approved")
      .maybeSingle();

    if (error) throw new Error(`getApprovedClaimSocialLinks failed: ${error.message}`);
    return (data?.social_links as SocialLinks | null) ?? {};
  }

  async updateApprovedClaimSocialLinks(venueId: string, socialLinks: SocialLinks): Promise<SocialLinks> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .update({ social_links: socialLinks })
      .eq("venue_id", venueId)
      .eq("status", "approved")
      .select("social_links")
      .single();

    if (error) throw new Error(`updateApprovedClaimSocialLinks failed: ${error.message}`);
    return (data?.social_links as SocialLinks | null) ?? {};
  }

  async getApprovedClaimIcalFeed(
    venueId: string
  ): Promise<{ icalFeedUrl: string | null; icalSyncedAt: string | null }> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .select("ical_feed_url, ical_synced_at")
      .eq("venue_id", venueId)
      .eq("status", "approved")
      .maybeSingle();

    if (error) throw new Error(`getApprovedClaimIcalFeed failed: ${error.message}`);
    return {
      icalFeedUrl: data?.ical_feed_url ?? null,
      icalSyncedAt: data?.ical_synced_at ?? null,
    };
  }

  async updateApprovedClaimIcalFeedUrl(venueId: string, icalFeedUrl: string | null): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("business_claim")
      .update({ ical_feed_url: icalFeedUrl })
      .eq("venue_id", venueId)
      .eq("status", "approved")
      .select("ical_feed_url")
      .single();

    if (error) throw new Error(`updateApprovedClaimIcalFeedUrl failed: ${error.message}`);
    return data?.ical_feed_url ?? null;
  }

  async markApprovedClaimIcalSynced(venueId: string, syncedAt: string): Promise<void> {
    const { error } = await this.supabase
      .from("business_claim")
      .update({ ical_synced_at: syncedAt })
      .eq("venue_id", venueId)
      .eq("status", "approved");

    if (error) throw new Error(`markApprovedClaimIcalSynced failed: ${error.message}`);
  }
}
