import type { SupabaseClient } from "@supabase/supabase-js";
import type { NeighborhoodAdminRepository, NeighborhoodAdminSummaryRecord } from "./repository";

interface NeighborhoodEmbed {
  name: string;
  slug: string;
}

export class SupabaseNeighborhoodAdminRepository implements NeighborhoodAdminRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async isNeighborhoodAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("neighborhood_admin")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`isNeighborhoodAdmin failed: ${error.message}`);
    return data !== null;
  }

  async isNeighborhoodAdminFor(userId: string, neighborhoodId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("neighborhood_admin")
      .select("id")
      .eq("user_id", userId)
      .eq("neighborhood_id", neighborhoodId)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`isNeighborhoodAdminFor failed: ${error.message}`);
    return data !== null;
  }

  async listNeighborhoodsForAdmin(userId: string): Promise<NeighborhoodAdminSummaryRecord[]> {
    const { data, error } = await this.supabase
      .from("neighborhood_admin")
      .select("neighborhood_id, neighborhood:neighborhood_id(name, slug)")
      .eq("user_id", userId);

    if (error) throw new Error(`listNeighborhoodsForAdmin failed: ${error.message}`);

    return (data ?? []).map((row) => {
      const embed = row.neighborhood as NeighborhoodEmbed[] | NeighborhoodEmbed | null;
      const neighborhood = Array.isArray(embed) ? embed[0] : embed;
      return {
        neighborhoodId: row.neighborhood_id,
        name: neighborhood?.name ?? "",
        slug: neighborhood?.slug ?? "",
      };
    });
  }

  async addNeighborhoodAdmin(userId: string, neighborhoodId: string): Promise<void> {
    const { error } = await this.supabase
      .from("neighborhood_admin")
      .insert({ user_id: userId, neighborhood_id: neighborhoodId });

    if (error) throw new Error(`addNeighborhoodAdmin failed: ${error.message}`);
  }
}
