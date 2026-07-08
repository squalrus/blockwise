import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckinRecord,
  CheckinRepository,
  CheckinTarget,
  CheckinVenue,
  CreateCheckinInput,
  PoiLocation,
  VenueLocation,
} from "./repository";

const CHECKIN_COLUMNS = "id, user_id, venue_id, poi_id, device_lat, device_lng, checked_in_at";

function toRecord(row: {
  id: string;
  user_id: string;
  venue_id: string | null;
  poi_id: string | null;
  device_lat: number;
  device_lng: number;
  checked_in_at: string;
}): CheckinRecord {
  return {
    id: row.id,
    userId: row.user_id,
    venueId: row.venue_id,
    poiId: row.poi_id,
    deviceLat: row.device_lat,
    deviceLng: row.device_lng,
    checkedInAt: row.checked_in_at,
  };
}

export class SupabaseCheckinRepository implements CheckinRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getVenueLocation(venueId: string): Promise<VenueLocation | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id, lat, lng")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getVenueLocation failed: ${error.message}`);
    return data;
  }

  async getPoiLocation(poiId: string): Promise<PoiLocation | null> {
    const { data, error } = await this.supabase
      .from("poi")
      .select("id, lat, lng")
      .eq("id", poiId)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .maybeSingle();

    if (error) throw new Error(`getPoiLocation failed: ${error.message}`);
    return data;
  }

  async getOrCreateAnonymousUser(anonymousDeviceId: string): Promise<string> {
    const { data: existing, error: existingError } = await this.supabase
      .from("app_user")
      .select("id")
      .eq("anonymous_device_id", anonymousDeviceId)
      .maybeSingle();

    if (existingError)
      throw new Error(`getOrCreateAnonymousUser (lookup) failed: ${existingError.message}`);
    if (existing) return existing.id;

    const { data: created, error: createError } = await this.supabase
      .from("app_user")
      .insert({ anonymous_device_id: anonymousDeviceId, is_anonymous: true })
      .select("id")
      .single();

    if (createError)
      throw new Error(`getOrCreateAnonymousUser (create) failed: ${createError.message}`);
    return created.id;
  }

  async getLastCheckinForTarget(
    userId: string,
    target: CheckinTarget
  ): Promise<CheckinRecord | null> {
    let query = this.supabase
      .from("checkin")
      .select(CHECKIN_COLUMNS)
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(1);
    query =
      target.kind === "venue" ? query.eq("venue_id", target.id) : query.eq("poi_id", target.id);

    const { data, error } = await query.maybeSingle();

    if (error) throw new Error(`getLastCheckinForTarget failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getLastCheckinAnywhere(userId: string): Promise<CheckinRecord | null> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select(CHECKIN_COLUMNS)
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getLastCheckinAnywhere failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createCheckin(input: CreateCheckinInput): Promise<CheckinRecord> {
    const { data, error } = await this.supabase
      .from("checkin")
      .insert({
        user_id: input.userId,
        venue_id: input.venueId ?? null,
        poi_id: input.poiId ?? null,
        device_lat: input.deviceLat,
        device_lng: input.deviceLng,
      })
      .select(CHECKIN_COLUMNS)
      .single();

    if (error) throw new Error(`createCheckin failed: ${error.message}`);
    return toRecord(data);
  }

  async listCheckinsForUser(userId: string): Promise<CheckinVenue[]> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select("checked_in_at, venue:venue_id (id, name, address)")
      .eq("user_id", userId)
      .order("checked_in_at", { ascending: false });

    if (error) throw new Error(`listCheckinsForUser failed: ${error.message}`);

    return (data ?? [])
      .map((row) => ({
        venue: row.venue as unknown as { id: string; name: string; address: string } | null,
        checkedInAt: row.checked_in_at as string,
      }))
      .filter(
        (row): row is { venue: { id: string; name: string; address: string }; checkedInAt: string } =>
          row.venue !== null
      )
      .map((row) => ({
        venueId: row.venue.id,
        name: row.venue.name,
        address: row.venue.address,
        checkedInAt: row.checkedInAt,
      }));
  }

  async countCheckinsForVenue(venueId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId);

    if (error) throw new Error(`countCheckinsForVenue failed: ${error.message}`);
    return count ?? 0;
  }

  async countCheckinsForPoi(poiId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("poi_id", poiId);

    if (error) throw new Error(`countCheckinsForPoi failed: ${error.message}`);
    return count ?? 0;
  }

  async countCheckinsForNeighborhood(neighborhoodId: string): Promise<number> {
    const [venueScoped, poiScoped] = await Promise.all([
      this.supabase
        .from("checkin")
        .select("id, venue:venue_id!inner(neighborhood_id)", { count: "exact", head: true })
        .eq("venue.neighborhood_id", neighborhoodId),
      this.supabase
        .from("checkin")
        .select("id, poi:poi_id!inner(neighborhood_id)", { count: "exact", head: true })
        .eq("poi.neighborhood_id", neighborhoodId),
    ]);

    if (venueScoped.error)
      throw new Error(`countCheckinsForNeighborhood (venue) failed: ${venueScoped.error.message}`);
    if (poiScoped.error)
      throw new Error(`countCheckinsForNeighborhood (poi) failed: ${poiScoped.error.message}`);

    return (venueScoped.count ?? 0) + (poiScoped.count ?? 0);
  }
}
