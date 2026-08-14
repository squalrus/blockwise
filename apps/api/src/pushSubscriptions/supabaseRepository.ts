import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionKeys } from "@blockwise/types";
import type { PushSubscriptionRecord, PushSubscriptionRepository } from "./repository";

type Row = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  created_at: string;
};

function toRecord(row: Row): PushSubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    endpoint: row.endpoint,
    keys: row.keys,
    createdAt: row.created_at,
  };
}

const COLUMNS = "id, user_id, endpoint, keys, created_at";

export class SupabasePushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertSubscription(input: {
    userId: string;
    endpoint: string;
    keys: PushSubscriptionKeys;
  }): Promise<PushSubscriptionRecord> {
    const { data, error } = await this.supabase
      .from("push_subscription")
      .upsert(
        { user_id: input.userId, endpoint: input.endpoint, keys: input.keys },
        { onConflict: "endpoint" }
      )
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`upsertSubscription failed: ${error.message}`);
    return toRecord(data);
  }

  async getSubscription(id: string): Promise<PushSubscriptionRecord | null> {
    const { data, error } = await this.supabase
      .from("push_subscription")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getSubscription failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async deleteSubscription(id: string): Promise<void> {
    const { error } = await this.supabase.from("push_subscription").delete().eq("id", id);
    if (error) throw new Error(`deleteSubscription failed: ${error.message}`);
  }

  async listForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await this.supabase.from("push_subscription").select(COLUMNS).eq("user_id", userId);

    if (error) throw new Error(`listForUser failed: ${error.message}`);
    return ((data ?? []) as Row[]).map(toRecord);
  }

  async listForUsers(userIds: string[]): Promise<PushSubscriptionRecord[]> {
    if (userIds.length === 0) return [];

    const { data, error } = await this.supabase.from("push_subscription").select(COLUMNS).in("user_id", userIds);

    if (error) throw new Error(`listForUsers failed: ${error.message}`);
    return ((data ?? []) as Row[]).map(toRecord);
  }
}
