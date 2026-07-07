import type { SupabaseClient } from "@supabase/supabase-js";
import type { NeighborhoodAdminRepository } from "./repository";

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
}
