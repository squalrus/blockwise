import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateEventInput, EventRecord, EventRepository } from "./repository";

function toRecord(
  row: {
    id: string;
    venue_id: string | null;
    neighborhood_id: string | null;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    created_at: string;
  },
  venueName: string | null = null
): EventRecord {
  return {
    id: row.id,
    venueId: row.venue_id,
    neighborhoodId: row.neighborhood_id,
    venueName,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    createdAt: row.created_at,
  };
}

const EVENT_COLUMNS = "id, venue_id, neighborhood_id, title, description, start_time, end_time, created_at";

function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const { data, error } = await this.supabase
      .from("event")
      .insert({
        venue_id: input.venueId ?? null,
        neighborhood_id: input.neighborhoodId ?? null,
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
    return (data ?? []).map((row) => toRecord(row));
  }

  async listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]> {
    const { data, error } = await this.supabase
      .from("event")
      .select(EVENT_COLUMNS)
      .eq("neighborhood_id", neighborhoodId)
      .order("start_time", { ascending: true });

    if (error) throw new Error(`listEventsForNeighborhood failed: ${error.message}`);
    return (data ?? []).map((row) => toRecord(row));
  }

  async listEventsForNeighborhoodAndVenues(neighborhoodId: string): Promise<EventRecord[]> {
    const [neighborhoodEvents, venueEvents] = await Promise.all([
      this.supabase
        .from("event")
        .select(EVENT_COLUMNS)
        .eq("neighborhood_id", neighborhoodId),
      this.supabase
        .from("event")
        .select(`${EVENT_COLUMNS}, venue:venue_id!inner(name, neighborhood_id)`)
        .eq("venue.neighborhood_id", neighborhoodId),
    ]);

    if (neighborhoodEvents.error) {
      throw new Error(`listEventsForNeighborhoodAndVenues (neighborhood) failed: ${neighborhoodEvents.error.message}`);
    }
    if (venueEvents.error) {
      throw new Error(`listEventsForNeighborhoodAndVenues (venues) failed: ${venueEvents.error.message}`);
    }

    const records = [
      ...(neighborhoodEvents.data ?? []).map((row) => toRecord(row)),
      ...(venueEvents.data ?? []).map((row) => {
        const venue = single(row.venue as { name: string } | { name: string }[] | null);
        return toRecord(row, venue?.name ?? null);
      }),
    ];
    records.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return records;
  }
}
