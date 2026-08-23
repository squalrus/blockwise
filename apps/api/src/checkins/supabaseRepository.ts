import type { SupabaseClient } from "@supabase/supabase-js";
import type { MushroomCustomization, TopVisitor } from "@blockwise/types";
import { resolveMushroomConfig } from "@blockwise/types";
import {
  RECENT_VISITOR_WINDOW_MS,
  TOP_VISITORS_LIMIT,
  rankRecentVisitors,
  resolveTopVisitors,
  toMushroomConfig,
} from "./checkin";
import type {
  CheckinRecord,
  CheckinRepository,
  CheckinVenue,
  CreateCheckinInput,
  LocationCoords,
  NeighborhoodVisitorMosaic,
} from "./repository";

const CHECKIN_COLUMNS = "id, user_id, venue_id, device_lat, device_lng, checked_in_at";

// Safety bound on the raw rows fetched for the rolling-window mosaic query
// (RECENT_VISITOR_WINDOW_MS already bounds it by date) -- generous relative
// to pilot-scale check-in volume; revisit if a neighborhood's 60-day check-in
// count regularly exceeds this before ranking distinct visitors.
const RECENT_VISITOR_QUERY_LIMIT = 2000;

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

  // BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" --
  // fetch every check-in against the neighborhood's venues within the
  // rolling window (RECENT_VISITOR_QUERY_LIMIT bounds the raw row fetch as a
  // safety valve, not a distinct-user cap), rank into distinct visitors via
  // rankRecentVisitors (most-visits-first, tie-broken by most recent), then
  // resolve each capped visitor's *current* live mushroom with a batched
  // app_user lookup -- mirrors locations/supabaseRepository.ts's venue-scoped
  // equivalent.
  async listRecentVisitorMushroomsForNeighborhood(
    neighborhoodId: string,
    limit: number
  ): Promise<NeighborhoodVisitorMosaic> {
    const windowStart = new Date(Date.now() - RECENT_VISITOR_WINDOW_MS).toISOString();
    const { data, error } = await this.supabase
      .from("checkin")
      .select("user_id, checked_in_at, venue:venue_id!inner(neighborhood_id)")
      .eq("venue.neighborhood_id", neighborhoodId)
      .gte("checked_in_at", windowStart)
      .order("checked_in_at", { ascending: false })
      .limit(RECENT_VISITOR_QUERY_LIMIT);

    if (error) throw new Error(`listRecentVisitorMushroomsForNeighborhood failed: ${error.message}`);

    const ranked = rankRecentVisitors(
      (data ?? []).map((row) => ({ userId: row.user_id, checkedInAt: row.checked_in_at })),
      limit
    );
    if (ranked.length === 0) return { mushrooms: [], topVisitors: [] };

    const { data: users, error: usersError } = await this.supabase
      .from("app_user")
      .select("id, mushroom_customization, username, display_name, visibility")
      .in(
        "id",
        ranked.map((r) => r.userId)
      );
    if (usersError)
      throw new Error(`listRecentVisitorMushroomsForNeighborhood (users) failed: ${usersError.message}`);

    const customizationById = new Map(
      (users ?? []).map((u) => [u.id as string, u.mushroom_customization as MushroomCustomization | null])
    );

    const mushrooms = ranked.map(({ userId, visitCount }) => ({
      mushroom: resolveMushroomConfig(userId, toMushroomConfig(customizationById.get(userId) ?? null)),
      visitCount,
    }));

    const candidatesById = new Map(
      (users ?? []).map((u) => [
        u.id as string,
        {
          username: u.username as string | null,
          displayName: u.display_name as string | null,
          visibility: u.visibility as string,
        },
      ])
    );
    const topVisitors: TopVisitor[] = resolveTopVisitors(ranked, candidatesById, TOP_VISITORS_LIMIT);

    return { mushrooms, topVisitors };
  }
}
