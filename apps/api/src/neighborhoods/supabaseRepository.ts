import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeoJsonPolygon, SocialLinks } from "@blockwise/types";
import type {
  CreatedNeighborhood,
  CreateNeighborhoodInput,
  NeighborhoodBoundaryRecord,
  NeighborhoodListCounts,
  NeighborhoodRecord,
  NeighborhoodRepository,
} from "./repository";
import { SlugTakenError } from "./repository";

const UNIQUE_VIOLATION = "23505";

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

  async listCounts(): Promise<NeighborhoodListCounts[]> {
    const { data, error } = await this.supabase.rpc("get_neighborhood_list_counts");

    if (error) throw new Error(`listCounts failed: ${error.message}`);
    return (data as ListCountsRow[] | null ?? []).map((row) => ({
      neighborhood_id: row.neighborhood_id,
      business_count: row.business_count,
      member_count: row.member_count,
    }));
  }

  async getBoundary(id: string): Promise<NeighborhoodBoundaryRecord | null> {
    // .rpc() results aren't row-typed on this untyped SupabaseClient (no
    // generated Database generic) -- indexed access + an explicit row shape
    // mirrors the same pattern places/supabaseRepository.ts already uses for
    // get_neighborhood_for_sync, rather than chaining .maybeSingle()/.single(),
    // which resolve to {}/unknown here instead of the actual row shape.
    const { data, error } = await this.supabase.rpc("get_neighborhood_boundary_for_admin", {
      p_id: id,
    });

    if (error) throw new Error(`getBoundary failed: ${error.message}`);
    const row = (data as BoundaryRow[] | null)?.[0];
    if (!row) return null;
    return {
      boundaryGeojson: row.boundary_geojson,
      centerLat: row.center_lat,
      centerLng: row.center_lng,
    };
  }

  async updateBoundary(id: string, boundaryGeojson: GeoJsonPolygon): Promise<NeighborhoodBoundaryRecord> {
    const { data, error } = await this.supabase.rpc("set_neighborhood_boundary", {
      p_id: id,
      p_boundary_geojson: JSON.stringify(boundaryGeojson),
    });

    if (error) throw new Error(`updateBoundary failed: ${error.message}`);
    const row = (data as BoundaryRow[]).at(0);
    if (!row) throw new Error("updateBoundary failed: neighborhood not found");
    return {
      boundaryGeojson: row.boundary_geojson,
      centerLat: row.center_lat,
      centerLng: row.center_lng,
    };
  }

  async createNeighborhood(input: CreateNeighborhoodInput): Promise<CreatedNeighborhood> {
    const { data, error } = await this.supabase.rpc("create_neighborhood", {
      p_name: input.name,
      p_slug: input.slug,
      p_city: input.city,
      p_state: input.state,
      p_country: input.country,
      p_timezone: input.timezone,
      p_boundary_geojson: JSON.stringify(input.boundaryGeojson),
    });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new SlugTakenError(input.slug);
      throw new Error(`createNeighborhood failed: ${error.message}`);
    }

    const row = (data as CreateNeighborhoodRow[]).at(0);
    if (!row) throw new Error("createNeighborhood failed: no row returned");
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      state: row.state,
      country: row.country,
      timezone: row.timezone,
      status: row.status,
      boundaryGeojson: row.boundary_geojson,
      centerLat: row.center_lat,
      centerLng: row.center_lng,
    };
  }
}

interface ListCountsRow {
  neighborhood_id: string;
  business_count: number;
  member_count: number;
}

interface BoundaryRow {
  boundary_geojson: GeoJsonPolygon | null;
  center_lat: number;
  center_lng: number;
}

interface CreateNeighborhoodRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: string;
  boundary_geojson: GeoJsonPolygon;
  center_lat: number;
  center_lng: number;
}
