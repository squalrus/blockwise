import type { SupabaseClient } from "@supabase/supabase-js";
import type { FavoriteRecord, FavoriteRepository, FavoriteVenue } from "./repository";

function toRecord(row: {
  id: string;
  user_id: string;
  venue_id: string;
  created_at: string;
}): FavoriteRecord {
  return {
    id: row.id,
    userId: row.user_id,
    venueId: row.venue_id,
    createdAt: row.created_at,
  };
}

export class SupabaseFavoriteRepository implements FavoriteRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async venueExists(venueId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("venue")
      .select("id")
      .eq("id", venueId)
      .maybeSingle();

    if (error) throw new Error(`venueExists failed: ${error.message}`);
    return data !== null;
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

  async getFavorite(userId: string, venueId: string): Promise<FavoriteRecord | null> {
    const { data, error } = await this.supabase
      .from("favorite")
      .select("id, user_id, venue_id, created_at")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .maybeSingle();

    if (error) throw new Error(`getFavorite failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createFavorite(userId: string, venueId: string): Promise<FavoriteRecord> {
    const { data, error } = await this.supabase
      .from("favorite")
      .insert({ user_id: userId, venue_id: venueId })
      .select("id, user_id, venue_id, created_at")
      .single();

    if (error) throw new Error(`createFavorite failed: ${error.message}`);
    return toRecord(data);
  }

  async deleteFavorite(userId: string, venueId: string): Promise<void> {
    const { error } = await this.supabase
      .from("favorite")
      .delete()
      .eq("user_id", userId)
      .eq("venue_id", venueId);

    if (error) throw new Error(`deleteFavorite failed: ${error.message}`);
  }

  async listFavoriteVenuesForUser(userId: string): Promise<FavoriteVenue[]> {
    const { data, error } = await this.supabase
      .from("favorite")
      .select("created_at, venue:venue_id (id, name, address)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listFavoriteVenuesForUser failed: ${error.message}`);

    return (data ?? [])
      .map((row) => ({
        venue: row.venue as unknown as { id: string; name: string; address: string } | null,
        createdAt: row.created_at as string,
      }))
      .filter(
        (row): row is { venue: { id: string; name: string; address: string }; createdAt: string } =>
          row.venue !== null
      )
      .map((row) => ({
        venueId: row.venue.id,
        name: row.venue.name,
        address: row.venue.address,
        createdAt: row.createdAt,
      }));
  }
}
