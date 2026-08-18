import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MushroomCollectionListItem,
  MushroomCollectionRepository,
  MushroomCollectionSourceType,
} from "./repository";

const LIST_COLUMNS =
  "id, venue_id, connection_user_id, quantity, first_collected_at, revealed_at, venue:venue_id (name), connection_user:connection_user_id (username, display_name)";

type ListRow = {
  id: string;
  venue_id: string | null;
  connection_user_id: string | null;
  quantity: number;
  first_collected_at: string;
  revealed_at: string | null;
  venue: { name: string } | null;
  connection_user: { username: string | null; display_name: string | null } | null;
};

function toListItem(row: ListRow): MushroomCollectionListItem {
  const sourceType: MushroomCollectionSourceType = row.venue_id ? "checkin" : "connection";
  return {
    id: row.id,
    sourceType,
    sourceId: (sourceType === "checkin" ? row.venue_id : row.connection_user_id) as string,
    sourceName:
      sourceType === "checkin"
        ? (row.venue?.name ?? "Unknown venue")
        : (row.connection_user?.display_name ?? row.connection_user?.username ?? "A neighbor"),
    quantity: row.quantity,
    firstCollectedAt: row.first_collected_at,
    revealedAt: row.revealed_at,
  };
}

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

    return (data ?? []).map((row) => toListItem(row as unknown as ListRow));
  }

  async revealCollectionItem(userId: string, id: string): Promise<MushroomCollectionListItem | null> {
    const { data: existing, error: selectError } = await this.supabase
      .from("mushroom_collection")
      .select(LIST_COLUMNS)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) throw new Error(`revealCollectionItem select failed: ${selectError.message}`);
    if (!existing) return null;

    const existingRow = existing as unknown as ListRow;
    if (existingRow.revealed_at !== null) return toListItem(existingRow);

    const { data, error } = await this.supabase
      .from("mushroom_collection")
      .update({ revealed_at: new Date().toISOString() })
      .eq("id", id)
      .select(LIST_COLUMNS)
      .single();

    if (error) throw new Error(`revealCollectionItem update failed: ${error.message}`);
    return toListItem(data as unknown as ListRow);
  }
}
