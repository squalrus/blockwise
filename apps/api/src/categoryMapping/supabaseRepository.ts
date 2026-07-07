import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryMappingRepository, CategoryRecord, VenueCategoryRecord } from "./repository";

interface CategoryEmbed {
  name: string;
  parent?: CategoryEmbed[] | CategoryEmbed | null;
}

// Without generated Database types passed to createClient (see supabase.ts),
// supabase-js can't tell category_id(name) is a many-to-one embed, so it
// falls back to array cardinality -- normalize to a single row here,
// mirroring venues/supabaseDetailRepository.ts.
function categoryName(embed: CategoryEmbed[] | CategoryEmbed | null): string | null {
  const category = Array.isArray(embed) ? embed[0] : embed;
  return category?.name ?? null;
}

function categoryGroupName(embed: CategoryEmbed[] | CategoryEmbed | null): string | null {
  const category = Array.isArray(embed) ? embed[0] : embed;
  if (!category) return null;
  return categoryName(category.parent ?? null) ?? category.name;
}

const VENUE_COLUMNS = "id, name, address, category:category_id(name, parent:parent_category_id(name))";

function toVenueCategoryRecord(row: {
  id: string;
  name: string;
  address: string;
  category_id: string | null;
  category: CategoryEmbed[] | CategoryEmbed | null;
}): VenueCategoryRecord {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    categoryId: row.category_id,
    categoryName: categoryName(row.category),
    categoryGroup: categoryGroupName(row.category),
  };
}

export class SupabaseCategoryMappingRepository implements CategoryMappingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listVenuesForNeighborhood(neighborhoodId: string, search?: string): Promise<VenueCategoryRecord[]> {
    let query = this.supabase
      .from("venue")
      .select(`${VENUE_COLUMNS}, category_id`)
      .eq("neighborhood_id", neighborhoodId)
      .order("name");
    if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`listVenuesForNeighborhood failed: ${error.message}`);
    return (data ?? []).map(toVenueCategoryRecord);
  }

  async getVenueNeighborhoodId(venueId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("neighborhood_id")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getVenueNeighborhoodId failed: ${error.message}`);
    return data?.neighborhood_id ?? null;
  }

  async listCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id, name, parent:parent_category_id(name)")
      .not("parent_category_id", "is", null)
      .eq("status", "active")
      .order("name");

    if (error) throw new Error(`listCategories failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      groupName: categoryName(row.parent as CategoryEmbed[] | CategoryEmbed | null),
    }));
  }

  async getVenue(venueId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getVenue failed: ${error.message}`);
    return data;
  }

  async getLeafCategory(categoryId: string): Promise<{ id: string } | null> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id")
      .eq("id", categoryId)
      .not("parent_category_id", "is", null)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(`getLeafCategory failed: ${error.message}`);
    return data;
  }

  async updateVenueCategory(venueId: string, categoryId: string): Promise<VenueCategoryRecord> {
    const { data, error } = await this.supabase
      .from("venue")
      .update({ category_id: categoryId })
      .eq("id", venueId)
      .select(`${VENUE_COLUMNS}, category_id`)
      .single();

    if (error) throw new Error(`updateVenueCategory failed: ${error.message}`);
    return toVenueCategoryRecord(data);
  }
}
