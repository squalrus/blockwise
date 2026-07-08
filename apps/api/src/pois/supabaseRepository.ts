import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNeighborhoodPoiInput, PoiRecord, PoiRepository } from "./repository";

function toRecord(row: {
  id: string;
  neighborhood_id: string;
  name: string;
  description: string | null;
  type: string;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  address: string | null;
}): PoiRecord {
  return {
    id: row.id,
    neighborhoodId: row.neighborhood_id,
    name: row.name,
    description: row.description,
    type: row.type,
    lat: row.lat,
    lng: row.lng,
    googlePlaceId: row.google_place_id,
    address: row.address,
  };
}

const POI_COLUMNS = "id, neighborhood_id, name, description, type, lat, lng, google_place_id, address";

export class SupabasePoiRepository implements PoiRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createPoiForNeighborhood(input: CreateNeighborhoodPoiInput): Promise<PoiRecord> {
    const { data, error } = await this.supabase
      .from("poi")
      .insert({
        neighborhood_id: input.neighborhoodId,
        name: input.name,
        description: input.description,
        type: input.type,
        lat: input.lat,
        lng: input.lng,
        google_place_id: input.googlePlaceId,
        address: input.address,
      })
      .select(POI_COLUMNS)
      .single();

    if (error) throw new Error(`createPoiForNeighborhood failed: ${error.message}`);
    return toRecord(data);
  }

  async listPoisForNeighborhood(neighborhoodId: string): Promise<PoiRecord[]> {
    const { data, error } = await this.supabase
      .from("poi")
      .select(POI_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .order("name");

    if (error) throw new Error(`listPoisForNeighborhood failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }
}
