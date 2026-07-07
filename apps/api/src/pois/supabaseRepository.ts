import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNeighborhoodPoiInput, PoiRecord, PoiRepository } from "./repository";

function toRecord(row: {
  id: string;
  venue_id: string | null;
  neighborhood_id: string | null;
  name: string;
  description: string | null;
  type: string;
}): PoiRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    neighborhoodId: row.neighborhood_id,
    name: row.name,
    description: row.description,
    type: row.type,
  };
}

const POI_COLUMNS = "id, venue_id, neighborhood_id, name, description, type";

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
