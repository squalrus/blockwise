import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackState, FeedbackType } from "@blockwise/types";
import type { FeedbackRepository, FeedbackSubmissionAdminRecord, FeedbackSubmissionRecord } from "./repository";

type Row = {
  id: string;
  user_id: string;
  type: FeedbackType;
  comment: string;
  state: FeedbackState;
  created_at: string;
};

function toRecord(row: Row): FeedbackSubmissionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    comment: row.comment,
    state: row.state,
    createdAt: row.created_at,
  };
}

function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

const COLUMNS = "id, user_id, type, comment, state, created_at";

export class SupabaseFeedbackRepository implements FeedbackRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createSubmission(input: {
    userId: string;
    type: FeedbackType;
    comment: string;
  }): Promise<FeedbackSubmissionRecord> {
    const { data, error } = await this.supabase
      .from("feedback_submission")
      .insert({ user_id: input.userId, type: input.type, comment: input.comment })
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`createSubmission failed: ${error.message}`);
    return toRecord(data);
  }

  async getSubmission(id: string): Promise<FeedbackSubmissionRecord | null> {
    const { data, error } = await this.supabase
      .from("feedback_submission")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`getSubmission failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async setSubmissionState(id: string, state: FeedbackState): Promise<FeedbackSubmissionRecord> {
    const { data, error } = await this.supabase
      .from("feedback_submission")
      .update({ state })
      .eq("id", id)
      .select(COLUMNS)
      .single();

    if (error) throw new Error(`setSubmissionState failed: ${error.message}`);
    return toRecord(data);
  }

  async listAllForAdmin(): Promise<FeedbackSubmissionAdminRecord[]> {
    const { data, error } = await this.supabase
      .from("feedback_submission")
      .select(`${COLUMNS}, user:user_id(display_name, email)`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listAllForAdmin failed: ${error.message}`);

    type JoinedRow = Row & { user: { display_name: string | null; email: string | null } | null };

    return ((data ?? []) as unknown as JoinedRow[]).map((row) => {
      const user = single(row.user);
      return {
        ...toRecord(row),
        userDisplayName: user?.display_name ?? null,
        userEmail: user?.email ?? null,
      };
    });
  }
}
