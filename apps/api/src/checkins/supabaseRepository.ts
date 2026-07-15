import type { SupabaseClient } from "@supabase/supabase-js";
import type { MushroomCustomization, MushroomSnapshot } from "@blockwise/types";
import type {
  CheckinRecord,
  CheckinRepository,
  CheckinVenue,
  CreateCheckinInput,
  LocationCoords,
} from "./repository";

const CHECKIN_COLUMNS = "id, user_id, venue_id, device_lat, device_lng, checked_in_at, mushroom_snapshot";

function toRecord(row: {
  id: string;
  user_id: string;
  venue_id: string;
  device_lat: number;
  device_lng: number;
  checked_in_at: string;
  mushroom_snapshot: MushroomSnapshot | null;
}): CheckinRecord {
  return {
    id: row.id,
    userId: row.user_id,
    venueId: row.venue_id,
    deviceLat: row.device_lat,
    deviceLng: row.device_lng,
    checkedInAt: row.checked_in_at,
    mushroomSnapshot: row.mushroom_snapshot,
  };
}

export class SupabaseCheckinRepository implements CheckinRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getLocation(locationId: string): Promise<LocationCoords | null> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id, lat, lng")
      .eq("id", locationId)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .maybeSingle();

    if (error) throw new Error(`getLocation failed: ${error.message}`);
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

  async getLastCheckinForLocation(userId: string, locationId: string): Promise<CheckinRecord | null> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select(CHECKIN_COLUMNS)
      .eq("user_id", userId)
      .eq("venue_id", locationId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getLastCheckinForLocation failed: ${error.message}`);
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
        venue_id: input.venueId,
        device_lat: input.deviceLat,
        device_lng: input.deviceLng,
        mushroom_snapshot: input.mushroomSnapshot,
      })
      .select(CHECKIN_COLUMNS)
      .single();

    if (error) throw new Error(`createCheckin failed: ${error.message}`);
    return toRecord(data);
  }

  async getMushroomCustomization(userId: string): Promise<MushroomCustomization | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select("mushroom_customization")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(`getMushroomCustomization failed: ${error.message}`);
    return data?.mushroom_customization ?? null;
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

  async countCheckinsForLocation(locationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", locationId);

    if (error) throw new Error(`countCheckinsForLocation failed: ${error.message}`);
    return count ?? 0;
  }

  async countCheckinsForNeighborhood(neighborhoodId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("checkin")
      .select("id, venue:venue_id!inner(neighborhood_id)", { count: "exact", head: true })
      .eq("venue.neighborhood_id", neighborhoodId);

    if (error) throw new Error(`countCheckinsForNeighborhood failed: ${error.message}`);
    return count ?? 0;
  }

  // PostgREST has no DISTINCT ON, so dedupe by user in application code:
  // over-fetch (10x limit, generous enough that a neighborhood with heavy
  // repeat-visit traffic still surfaces `limit` distinct users) ordered most
  // recent first, keep the first (most recent) row per user, cap at `limit`
  // -- mirrors locations/supabaseRepository.ts's venue-scoped equivalent.
  async listRecentCheckinSnapshotsForNeighborhood(
    neighborhoodId: string,
    limit: number
  ): Promise<MushroomSnapshot[]> {
    const { data, error } = await this.supabase
      .from("checkin")
      .select("user_id, mushroom_snapshot, venue:venue_id!inner(neighborhood_id)")
      .eq("venue.neighborhood_id", neighborhoodId)
      .not("mushroom_snapshot", "is", null)
      .order("checked_in_at", { ascending: false })
      .limit(limit * 10);

    if (error) throw new Error(`listRecentCheckinSnapshotsForNeighborhood failed: ${error.message}`);

    const seenUsers = new Set<string>();
    const snapshots: MushroomSnapshot[] = [];
    for (const row of data ?? []) {
      if (snapshots.length >= limit) break;
      if (seenUsers.has(row.user_id)) continue;
      seenUsers.add(row.user_id);
      snapshots.push(row.mushroom_snapshot as MushroomSnapshot);
    }
    return snapshots;
  }
}
