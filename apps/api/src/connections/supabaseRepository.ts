import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarStyle, MushroomConfig, MushroomCustomization, MushroomSnapshot, SpotShape } from "@blockwise/types";
import { snapshotMushroomForUser } from "@blockwise/types";
import type {
  ConnectionListItem,
  ConnectionRepository,
  ConnectionStatus,
  ConnectionUserSummary,
  UserConnectionRecord,
} from "./repository";

type UserRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  avatar_style: AvatarStyle;
  mushroom_customization: MushroomCustomization | null;
};

// MushroomCustomization's spotShape is a plain string (packages/types has no
// dependency on the SpotShape union it validates against server-side, per
// app.ts's isValidMushroomCustomization) -- narrow it for
// snapshotMushroomForUser, mirroring apps/web's Avatar.tsx and
// checkins/checkin.ts.
function toMushroomConfig(customization: MushroomCustomization | null): MushroomConfig | null {
  return customization ? { ...customization, spotShape: customization.spotShape as SpotShape } : null;
}

function toUserSummary(row: UserRow, mushroomSnapshot: MushroomSnapshot | null = null): ConnectionUserSummary {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    avatarStyle: row.avatar_style,
    mushroomCustomization: row.mushroom_customization,
    mushroomSnapshot,
  };
}

function toRecord(row: {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  requester_mushroom_snapshot: MushroomSnapshot | null;
  recipient_mushroom_snapshot: MushroomSnapshot | null;
}): UserConnectionRecord {
  return {
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status as ConnectionStatus,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    requesterMushroomSnapshot: row.requester_mushroom_snapshot,
    recipientMushroomSnapshot: row.recipient_mushroom_snapshot,
  };
}

const CONNECTION_COLUMNS =
  "id, requester_id, recipient_id, status, created_at, responded_at, requester_mushroom_snapshot, recipient_mushroom_snapshot";
const USER_COLUMNS = "id, username, display_name, avatar_url, avatar_style, mushroom_customization";

export class SupabaseConnectionRepository implements ConnectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getUserIdByUsername(username: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (error) throw new Error(`getUserIdByUsername failed: ${error.message}`);
    return data?.id ?? null;
  }

  async findConnectionBetween(userIdA: string, userIdB: string): Promise<UserConnectionRecord | null> {
    const { data, error } = await this.supabase
      .from("user_connection")
      .select(CONNECTION_COLUMNS)
      .or(
        `and(requester_id.eq.${userIdA},recipient_id.eq.${userIdB}),and(requester_id.eq.${userIdB},recipient_id.eq.${userIdA})`
      )
      .maybeSingle();

    if (error) throw new Error(`findConnectionBetween failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async getConnectionById(id: string): Promise<UserConnectionRecord | null> {
    const { data, error } = await this.supabase
      .from("user_connection")
      .select(CONNECTION_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getConnectionById failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createConnectionRequest(requesterId: string, recipientId: string): Promise<UserConnectionRecord> {
    const { data, error } = await this.supabase
      .from("user_connection")
      .insert({ requester_id: requesterId, recipient_id: recipientId })
      .select(CONNECTION_COLUMNS)
      .single();

    if (error) throw new Error(`createConnectionRequest failed: ${error.message}`);
    return toRecord(data);
  }

  // BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins" --
  // stamped here (not in connections.ts's service function) since
  // sendConnectionRequest's mutual-interest auto-accept branch calls this
  // repository method directly, bypassing that service function entirely.
  async acceptConnectionRequest(id: string): Promise<UserConnectionRecord> {
    const { data: existing, error: lookupError } = await this.supabase
      .from("user_connection")
      .select("requester_id, recipient_id")
      .eq("id", id)
      .single();
    if (lookupError) throw new Error(`acceptConnectionRequest (lookup) failed: ${lookupError.message}`);

    const [requesterCustomization, recipientCustomization] = await Promise.all([
      this.getMushroomCustomization(existing.requester_id),
      this.getMushroomCustomization(existing.recipient_id),
    ]);

    const { data, error } = await this.supabase
      .from("user_connection")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        requester_mushroom_snapshot: snapshotMushroomForUser(
          existing.requester_id,
          toMushroomConfig(requesterCustomization)
        ),
        recipient_mushroom_snapshot: snapshotMushroomForUser(
          existing.recipient_id,
          toMushroomConfig(recipientCustomization)
        ),
      })
      .eq("id", id)
      .select(CONNECTION_COLUMNS)
      .single();

    if (error) throw new Error(`acceptConnectionRequest failed: ${error.message}`);
    return toRecord(data);
  }

  private async getMushroomCustomization(userId: string): Promise<MushroomCustomization | null> {
    const { data, error } = await this.supabase
      .from("app_user")
      .select("mushroom_customization")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(`getMushroomCustomization failed: ${error.message}`);
    return data?.mushroom_customization ?? null;
  }

  async deleteConnection(id: string): Promise<void> {
    const { error } = await this.supabase.from("user_connection").delete().eq("id", id);
    if (error) throw new Error(`deleteConnection failed: ${error.message}`);
  }

  async listConnectionsForUser(userId: string, status?: ConnectionStatus): Promise<ConnectionListItem[]> {
    let query = this.supabase
      .from("user_connection")
      .select(
        `id, status, requester_id, recipient_id, created_at, requester_mushroom_snapshot, recipient_mushroom_snapshot, requester:requester_id (${USER_COLUMNS}), recipient:recipient_id (${USER_COLUMNS})`
      )
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(`listConnectionsForUser failed: ${error.message}`);

    return (data ?? []).map((row) => {
      const isRequester = row.requester_id === userId;
      const other = (isRequester ? row.recipient : row.requester) as unknown as UserRow;
      // The *other* party's snapshot, mirroring the isRequester branch above.
      const otherSnapshot = (
        isRequester ? row.recipient_mushroom_snapshot : row.requester_mushroom_snapshot
      ) as MushroomSnapshot | null;
      return {
        id: row.id as string,
        status: row.status as ConnectionStatus,
        direction: isRequester ? ("outgoing" as const) : ("incoming" as const),
        createdAt: row.created_at as string,
        user: toUserSummary(other, otherSnapshot),
      };
    });
  }

  async countAcceptedConnectionsForUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("user_connection")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);

    if (error) throw new Error(`countAcceptedConnectionsForUser failed: ${error.message}`);
    return count ?? 0;
  }
}
