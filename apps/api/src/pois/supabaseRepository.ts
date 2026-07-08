import type { SupabaseClient } from "@supabase/supabase-js";
import type { VenueStatus } from "@blockwise/types";
import type {
  CreateNeighborhoodPoiInput,
  PoiRecord,
  PoiRepository,
  UpdatePoiInput,
} from "./repository";

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
  status: VenueStatus;
  created_at: string;
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
    status: row.status,
    createdAt: row.created_at,
  };
}

const POI_COLUMNS =
  "id, neighborhood_id, name, description, type, lat, lng, google_place_id, address, status, created_at";

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

  async listPoisForNeighborhood(neighborhoodId: string, search?: string): Promise<PoiRecord[]> {
    let query = this.supabase
      .from("poi")
      .select(POI_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .order("name");
    if (search) query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`listPoisForNeighborhood failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }

  async getPoiById(poiId: string): Promise<PoiRecord | null> {
    const { data, error } = await this.supabase
      .from("poi")
      .select(POI_COLUMNS)
      .eq("id", poiId)
      .maybeSingle();

    if (error) throw new Error(`getPoiById failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getPoiNeighborhoodId(poiId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("poi")
      .select("neighborhood_id")
      .eq("id", poiId)
      .maybeSingle();

    if (error) throw new Error(`getPoiNeighborhoodId failed: ${error.message}`);
    return data?.neighborhood_id ?? null;
  }

  async updatePoi(poiId: string, input: UpdatePoiInput): Promise<PoiRecord> {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.type !== undefined) patch.type = input.type;
    if (input.lat !== undefined) patch.lat = input.lat;
    if (input.lng !== undefined) patch.lng = input.lng;
    if (input.address !== undefined) patch.address = input.address;

    const { data, error } = await this.supabase
      .from("poi")
      .update(patch)
      .eq("id", poiId)
      .select(POI_COLUMNS)
      .single();

    if (error) throw new Error(`updatePoi failed: ${error.message}`);
    return toRecord(data);
  }

  async setPoiStatus(poiId: string, status: VenueStatus): Promise<PoiRecord> {
    const { data, error } = await this.supabase
      .from("poi")
      .update({ status })
      .eq("id", poiId)
      .select(POI_COLUMNS)
      .single();

    if (error) throw new Error(`setPoiStatus failed: ${error.message}`);
    return toRecord(data);
  }

  async hasDependentActivity(poiId: string): Promise<boolean> {
    const [checkin, pointEvent, challenge] = await Promise.all([
      this.supabase.from("checkin").select("id").eq("poi_id", poiId).limit(1),
      this.supabase.from("point_event").select("id").eq("poi_id", poiId).limit(1),
      this.supabase.from("challenge").select("id").eq("poi_id", poiId).limit(1),
    ]);
    if (checkin.error) throw new Error(`hasDependentActivity (checkin) failed: ${checkin.error.message}`);
    if (pointEvent.error)
      throw new Error(`hasDependentActivity (point_event) failed: ${pointEvent.error.message}`);
    if (challenge.error)
      throw new Error(`hasDependentActivity (challenge) failed: ${challenge.error.message}`);

    return (
      (checkin.data?.length ?? 0) > 0 ||
      (pointEvent.data?.length ?? 0) > 0 ||
      (challenge.data?.length ?? 0) > 0
    );
  }

  async deletePoi(poiId: string): Promise<void> {
    const { error } = await this.supabase.from("poi").delete().eq("id", poiId);
    if (error) throw new Error(`deletePoi failed: ${error.message}`);
  }
}
