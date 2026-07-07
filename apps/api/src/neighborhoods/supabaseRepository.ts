import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialLinks } from "@blockwise/types";
import type { NeighborhoodRecord, NeighborhoodRepository } from "./repository";

function toRecord(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  social_links: SocialLinks | null;
}): NeighborhoodRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    city: row.city,
    state: row.state,
    social_links: row.social_links ?? {},
  };
}

const NEIGHBORHOOD_COLUMNS = "id, name, slug, description, city, state, social_links";

export class SupabaseNeighborhoodRepository implements NeighborhoodRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .select(NEIGHBORHOOD_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`getNeighborhoodBySlug failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .select(NEIGHBORHOOD_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getNeighborhoodById failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async updateDescription(id: string, description: string): Promise<NeighborhoodRecord> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .update({ description })
      .eq("id", id)
      .select(NEIGHBORHOOD_COLUMNS)
      .single();

    if (error) throw new Error(`updateDescription failed: ${error.message}`);
    return toRecord(data);
  }

  async updateSocialLinks(id: string, socialLinks: SocialLinks): Promise<NeighborhoodRecord> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .update({ social_links: socialLinks })
      .eq("id", id)
      .select(NEIGHBORHOOD_COLUMNS)
      .single();

    if (error) throw new Error(`updateSocialLinks failed: ${error.message}`);
    return toRecord(data);
  }

  async listAll(): Promise<NeighborhoodRecord[]> {
    const { data, error } = await this.supabase
      .from("neighborhood")
      .select(NEIGHBORHOOD_COLUMNS)
      .order("name");

    if (error) throw new Error(`listAll failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }
}
