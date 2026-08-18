import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MushroomCollectionListItem,
  MushroomCollectionRepository,
  MushroomCollectionSourceType,
} from "./repository";

const LIST_COLUMNS =
  "id, venue_id, connection_user_id, quantity, first_collected_at, venue:venue_id (name), connection_user:connection_user_id (username, display_name)";

export class SupabaseMushroomCollectionRepository implements MushroomCollectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  // No unique constraint spans both venue_id and connection_user_id
  // together, so a plain select-then-write (mirroring
  // favorites/supabaseRepository.ts) rather than an upsert -- each caller
  // targets exactly one column, the other is left null by the table's own
  // check constraint.
  async recordVenueCollection(userId: string, venueId: string): Promise<boolean> {
    return this.recordCollection(userId, "venue_id", venueId);
  }

  async recordConnectionCollection(userId: string, connectionUserId: string): Promise<boolean> {
    return this.recordCollection(userId, "connection_user_id", connectionUserId);
  }

  private async recordCollection(
    userId: string,
    column: "venue_id" | "connection_user_id",
    targetId: string
  ): Promise<boolean> {
    const { data: existing, error: selectError } = await this.supabase
      .from("mushroom_collection")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq(column, targetId)
      .maybeSingle();

    if (selectError) throw new Error(`recordCollection select failed: ${selectError.message}`);

    if (existing) {
      const { error } = await this.supabase
        .from("mushroom_collection")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);
      if (error) throw new Error(`recordCollection update failed: ${error.message}`);
      return false;
    }

    const { error } = await this.supabase
      .from("mushroom_collection")
      .insert({ user_id: userId, [column]: targetId });
    if (error) throw new Error(`recordCollection insert failed: ${error.message}`);
    return true;
  }

  async countCollectionForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("mushroom_collection")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw new Error(`countCollectionForUser failed: ${error.message}`);
    return count ?? 0;
  }

  async listCollectionForUser(userId: string): Promise<MushroomCollectionListItem[]> {
    // Most-collected species first (highest quantity = "most awarded"),
    // ties broken by id since there's no meaningful secondary ordering to
    // prefer over any other.
    const { data, error } = await this.supabase
      .from("mushroom_collection")
      .select(LIST_COLUMNS)
      .eq("user_id", userId)
      .order("quantity", { ascending: false })
      .order("id", { ascending: true });

    if (error) throw new Error(`listCollectionForUser failed: ${error.message}`);

    return (data ?? []).map((row) => {
      const venue = row.venue as unknown as { name: string } | null;
      const connectionUser = row.connection_user as unknown as
        | { username: string | null; display_name: string | null }
        | null;
      const sourceType: MushroomCollectionSourceType = row.venue_id ? "checkin" : "connection";
      return {
        id: row.id as string,
        sourceType,
        sourceId: (sourceType === "checkin" ? row.venue_id : row.connection_user_id) as string,
        sourceName:
          sourceType === "checkin"
            ? (venue?.name ?? "Unknown venue")
            : (connectionUser?.display_name ?? connectionUser?.username ?? "A neighbor"),
        quantity: row.quantity as number,
        firstCollectedAt: row.first_collected_at as string,
      };
    });
  }
}
