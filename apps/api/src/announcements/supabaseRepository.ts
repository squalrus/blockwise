import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnnouncementRecord, AnnouncementRepository, CreateAnnouncementInput } from "./repository";

function toRecord(row: {
  id: string;
  venue_id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
}): AnnouncementRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    title: row.title,
    body: row.body,
    published: row.published,
    createdAt: row.created_at,
  };
}

const ANNOUNCEMENT_COLUMNS = "id, venue_id, title, body, published, created_at";

export class SupabaseAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementRecord> {
    const { data, error } = await this.supabase
      .from("announcement")
      .insert({ venue_id: input.venueId, title: input.title, body: input.body })
      .select(ANNOUNCEMENT_COLUMNS)
      .single();

    if (error) throw new Error(`createAnnouncement failed: ${error.message}`);
    return toRecord(data);
  }

  async listAnnouncementsForVenue(venueId: string): Promise<AnnouncementRecord[]> {
    const { data, error } = await this.supabase
      .from("announcement")
      .select(ANNOUNCEMENT_COLUMNS)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listAnnouncementsForVenue failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }
}
