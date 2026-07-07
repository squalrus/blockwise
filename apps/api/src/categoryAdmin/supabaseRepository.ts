import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryStatus } from "@blockwise/types";
import type { CategoryAdminRecord, CategoryAdminRepository } from "./repository";

const COLUMNS = "id, name, parent_category_id, status, source_mapping_json";

function toGoogleTypes(json: Record<string, unknown> | null): string[] {
  const google = (json as { google?: unknown } | null)?.google;
  return Array.isArray(google) ? google.filter((t): t is string => typeof t === "string") : [];
}

function toRecord(row: {
  id: string;
  name: string;
  parent_category_id: string | null;
  status: string;
  source_mapping_json: Record<string, unknown> | null;
}): CategoryAdminRecord {
  return {
    id: row.id,
    name: row.name,
    parentCategoryId: row.parent_category_id,
    status: row.status as CategoryStatus,
    googleTypes: toGoogleTypes(row.source_mapping_json),
  };
}

export class SupabaseCategoryAdminRepository implements CategoryAdminRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listAll(): Promise<CategoryAdminRecord[]> {
    const { data, error } = await this.supabase.from("category").select(COLUMNS).order("name");
    if (error) throw new Error(`listAll failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }

  async getCategory(id: string): Promise<{ id: string; parentCategoryId: string | null } | null> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id, parent_category_id")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getCategory failed: ${error.message}`);
    return data ? { id: data.id, parentCategoryId: data.parent_category_id } : null;
  }

  async createCategory(
    name: string,
    parentCategoryId: string | null,
    googleTypes: string[]
  ): Promise<CategoryAdminRecord> {
    // Group rows (parentCategoryId === null) stay organizational-only, per
    // the seeded taxonomy's convention (category_taxonomy.sql) -- google
    // types only make sense on a leaf.
    const sourceMappingJson = parentCategoryId ? { google: googleTypes } : {};
    const { data, error } = await this.supabase
      .from("category")
      .insert({ name, parent_category_id: parentCategoryId, source_mapping_json: sourceMappingJson })
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`createCategory failed: ${error.message}`);
    return toRecord(data);
  }

  async renameCategory(id: string, name: string): Promise<CategoryAdminRecord> {
    const { data, error } = await this.supabase
      .from("category")
      .update({ name })
      .eq("id", id)
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`renameCategory failed: ${error.message}`);
    return toRecord(data);
  }

  async archiveCategory(id: string): Promise<CategoryAdminRecord> {
    const { data, error } = await this.supabase
      .from("category")
      .update({ status: "archived" })
      .eq("id", id)
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`archiveCategory failed: ${error.message}`);
    return toRecord(data);
  }

  async countVenuesUsingCategory(categoryId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("venue")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (error) throw new Error(`countVenuesUsingCategory failed: ${error.message}`);
    return count ?? 0;
  }

  async countActiveChildCategories(categoryId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("category")
      .select("id", { count: "exact", head: true })
      .eq("parent_category_id", categoryId)
      .eq("status", "active");

    if (error) throw new Error(`countActiveChildCategories failed: ${error.message}`);
    return count ?? 0;
  }
}
