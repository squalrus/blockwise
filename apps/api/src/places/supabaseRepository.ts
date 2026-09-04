import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryRecord } from "./categorize";
import type { NeighborhoodRecord, PlacesRepository, UpsertVenueInput } from "./repository";

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

  // Always a fresh insert -- the caller (review.ts's commitLocationReview
  // "business" classification) only ever reaches here for a place that
  // already went through reviewNeighborhoodLocations's own identity/dedup
  // check, so this is never an existing row. Refreshing an
  // already-known location's data instead goes through LocationRepository's
  // updateLocation/updateLocationCategory/updateLocationIdentity (see
  // locations.ts's refreshLocationBasicInfo), not here.
  async upsertVenue(venue: UpsertVenueInput): Promise<void> {
    const { error } = await this.supabase.from("venue").insert({
      geoapify_place_id: venue.geoapifyPlaceId,
      osm_type: venue.osmType,
      osm_id: venue.osmId,
      name: venue.name,
      category_id: venue.categoryId,
      lat: venue.lat,
      lng: venue.lng,
      address: venue.address,
      neighborhood_id: venue.neighborhoodId,
    });
    if (error) throw new Error(`upsertVenue failed: ${error.message}`);
  }
}
