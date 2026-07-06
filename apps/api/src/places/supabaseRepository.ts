import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryRecord } from "./categorize";
import type {
  ExistingVenue,
  NeighborhoodRecord,
  PlacesRepository,
  UpsertVenueInput,
} from "./repository";

export class SupabasePlacesRepository implements PlacesRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null> {
    const { data, error } = await this.supabase.rpc("get_neighborhood_for_sync", {
      p_slug: slug,
    });

    if (error) throw new Error(`get_neighborhood_for_sync failed: ${error.message}`);

    const row = data?.[0];
    if (!row) return null;

    return {
      id: row.id,
      centerLat: row.center_lat,
      centerLng: row.center_lng,
      boundaryGeojson: row.boundary_geojson,
    };
  }

  async listCategories(): Promise<CategoryRecord[]> {
    const { data, error } = await this.supabase
      .from("category")
      .select("id, name, source_mapping_json");

    if (error) throw new Error(`listCategories failed: ${error.message}`);
    return data ?? [];
  }

  async listVenuesByNeighborhood(neighborhoodId: string): Promise<ExistingVenue[]> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id, google_place_id, name, lat, lng, claimed_by_business")
      .eq("neighborhood_id", neighborhoodId);

    if (error) throw new Error(`listVenuesByNeighborhood failed: ${error.message}`);

    return (data ?? []).map((row) => ({
      id: row.id,
      googlePlaceId: row.google_place_id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      claimedByBusiness: row.claimed_by_business,
    }));
  }

  async upsertVenue(venue: UpsertVenueInput): Promise<void> {
    const { error } = await this.supabase.from("venue").upsert(
      {
        google_place_id: venue.googlePlaceId,
        name: venue.name,
        category_id: venue.categoryId,
        lat: venue.lat,
        lng: venue.lng,
        address: venue.address,
        neighborhood_id: venue.neighborhoodId,
      },
      { onConflict: "google_place_id" }
    );

    if (error) throw new Error(`upsertVenue failed: ${error.message}`);
  }
}
