import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CheckinRecord,
  CheckinRepository,
  CreateCheckinInput,
  VenueLocation,
} from "./repository";

function toRecord(row: {
  id: string;
  user_id: string;
  venue_id: string;
  device_lat: number;
  device_lng: number;
  checked_in_at: string;
}): CheckinRecord {
  return {
    id: row.id,
    userId: row.user_id,
    venueId: row.venue_id,
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

  async getLastCheckin(userId: string, venueId: string): Promise<CheckinRecord | null> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select("id, user_id, venue_id, device_lat, device_lng, checked_in_at")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getLastCheckin failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createCheckin(input: CreateCheckinInput): Promise<CheckinRecord> {
    const { data, error } = await this.supabase
      .from("checkin")
      .insert({
        user_id: input.userId,
        venue_id: input.venueId,
        device_lat: input.deviceLat,
        device_lng: input.deviceLng,
      })
      .select("id, user_id, venue_id, device_lat, device_lng, checked_in_at")
      .single();

    if (error) throw new Error(`createCheckin failed: ${error.message}`);
    return toRecord(data);
  }
}
