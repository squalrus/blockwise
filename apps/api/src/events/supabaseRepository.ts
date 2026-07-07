import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateEventInput, EventRecord, EventRepository } from "./repository";

function toRecord(row: {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
}): EventRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at,
  };
}

const EVENT_COLUMNS = "id, venue_id, title, description, start_time, end_time, created_at";

export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const { data, error } = await this.supabase
      .from("event")
      .insert({
        venue_id: input.venueId,
        title: input.title,
        description: input.description,
        start_time: input.startTime,
        end_time: input.endTime,
      })
      .select(EVENT_COLUMNS)
      .single();

    if (error) throw new Error(`createEvent failed: ${error.message}`);
    return toRecord(data);
  }

  async listEventsForVenue(venueId: string): Promise<EventRecord[]> {
    const { data, error } = await this.supabase
      .from("event")
      .select(EVENT_COLUMNS)
      .eq("venue_id", venueId)
      .order("start_time", { ascending: true });

    if (error) throw new Error(`listEventsForVenue failed: ${error.message}`);
    return (data ?? []).map(toRecord);
  }
}
