import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NeighborhoodMemberRecord,
  NeighborhoodMemberRepository,
  NeighborhoodMembershipSummary,
} from "./repository";

function toRecord(row: {
  id: string;
  user_id: string;
  neighborhood_id: string;
  is_primary: boolean;
  created_at: string;
}): NeighborhoodMemberRecord {
  return {
    id: row.id,
    userId: row.user_id,
    neighborhoodId: row.neighborhood_id,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

export class SupabaseNeighborhoodMemberRepository implements NeighborhoodMemberRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async neighborhoodExists(neighborhoodId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .select("id")
      .eq("id", neighborhoodId)
      .maybeSingle();

    if (error) throw new Error(`neighborhoodExists failed: ${error.message}`);
    return data !== null;
  }

  async getMembership(
    userId: string,
    neighborhoodId: string
  ): Promise<NeighborhoodMemberRecord | null> {
    const { data, error } = await this.supabase
      .from("neighborhood_member")
      .select("id, user_id, neighborhood_id, is_primary, created_at")
      .eq("user_id", userId)
      .eq("neighborhood_id", neighborhoodId)
      .maybeSingle();

    if (error) throw new Error(`getMembership failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createMembership(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord> {
    const { data, error } = await this.supabase
      .from("neighborhood_member")
      .insert({ user_id: userId, neighborhood_id: neighborhoodId })
      .select("id, user_id, neighborhood_id, is_primary, created_at")
      .single();

    if (error) throw new Error(`createMembership failed: ${error.message}`);
    return toRecord(data);
  }

  async deleteMembership(userId: string, neighborhoodId: string): Promise<void> {
    const { error } = await this.supabase
      .from("neighborhood_member")
      .delete()
      .eq("user_id", userId)
      .eq("neighborhood_id", neighborhoodId);

    if (error) throw new Error(`deleteMembership failed: ${error.message}`);
  }

  async countMembersForNeighborhood(neighborhoodId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("neighborhood_member")
      .select("id", { count: "exact", head: true })
      .eq("neighborhood_id", neighborhoodId);

    if (error) throw new Error(`countMembersForNeighborhood failed: ${error.message}`);
    return count ?? 0;
  }

  async listMembershipsForUser(userId: string): Promise<NeighborhoodMembershipSummary[]> {
    const { data, error } = await this.supabase
      .from("neighborhood_member")
      .select("is_primary, neighborhood:neighborhood_id (id, name, slug, city, state)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listMembershipsForUser failed: ${error.message}`);

    return (data ?? [])
      .map((row) => ({
        neighborhood: row.neighborhood as unknown as {
          id: string;
          name: string;
          slug: string;
          city: string;
          state: string;
        } | null,
        isPrimary: row.is_primary as boolean,
      }))
      .filter(
        (
          row
        ): row is {
          neighborhood: { id: string; name: string; slug: string; city: string; state: string };
          isPrimary: boolean;
        } => row.neighborhood !== null
      )
      .map((row) => ({
        neighborhoodId: row.neighborhood.id,
        name: row.neighborhood.name,
        slug: row.neighborhood.slug,
        city: row.neighborhood.city,
        state: row.neighborhood.state,
        isPrimary: row.isPrimary,
      }));
  }

  async setPrimary(userId: string, neighborhoodId: string): Promise<NeighborhoodMemberRecord> {
    const { error: clearError } = await this.supabase
      .from("neighborhood_member")
      .update({ is_primary: false })
      .eq("user_id", userId)
      .eq("is_primary", true);

    if (clearError) throw new Error(`setPrimary (clear) failed: ${clearError.message}`);

    const { data, error } = await this.supabase
      .from("neighborhood_member")
      .update({ is_primary: true })
      .eq("user_id", userId)
      .eq("neighborhood_id", neighborhoodId)
      .select("id, user_id, neighborhood_id, is_primary, created_at")
      .single();

    if (error) throw new Error(`setPrimary (set) failed: ${error.message}`);
    return toRecord(data);
  }
}
