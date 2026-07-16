import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateEventInput,
  EventRecord,
  EventRepository,
  EventSource,
  EventStatus,
  IcalSyncResult,
  ImportedEventInput,
} from "./repository";

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
    source: EventSource;
    external_uid: string | null;
    location: string | null;
    status: EventStatus;
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
    source: row.source,
    externalUid: row.external_uid,
    location: row.location,
    status: row.status,
  };
}

const EVENT_COLUMNS =
  "id, venue_id, neighborhood_id, title, description, start_time, end_time, created_at, source, external_uid, location, status";

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

  async listEventsForVenue(venueId: string, includeHidden = false): Promise<EventRecord[]> {
    let query = this.supabase.from("event").select(EVENT_COLUMNS).eq("venue_id", venueId);
    if (!includeHidden) query = query.eq("status", "active");
    const { data, error } = await query.order("start_time", { ascending: true });

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
    // "Upcoming" excludes only events that have fully ended (end_time in the
    // past) -- an event currently in progress still has end_time >= now, so
    // it stays visible here and is what lets happeningNow.ts's isLiveNow
    // filter find it.
    const nowIso = new Date().toISOString();
    const [neighborhoodEvents, venueEvents] = await Promise.all([
      this.supabase
        .from("event")
        .select(EVENT_COLUMNS)
        .eq("neighborhood_id", neighborhoodId)
        .eq("status", "active")
        .gte("end_time", nowIso),
      this.supabase
        .from("event")
        .select(`${EVENT_COLUMNS}, venue:venue_id!inner(name, neighborhood_id)`)
        .eq("venue.neighborhood_id", neighborhoodId)
        .eq("status", "active")
        .gte("end_time", nowIso),
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

  async upsertImportedEventsForNeighborhood(
    neighborhoodId: string,
    events: ImportedEventInput[]
  ): Promise<IcalSyncResult> {
    return this.upsertImportedEvents("neighborhood_id", neighborhoodId, events);
  }

  async upsertImportedEventsForVenue(venueId: string, events: ImportedEventInput[]): Promise<IcalSyncResult> {
    return this.upsertImportedEvents("venue_id", venueId, events);
  }

  // Shared by both owner types above -- ownerColumn/ownerId pick which of
  // event_neighborhood_uid_unique/event_venue_uid_unique the upsert's
  // onConflict target matches. Counts imported vs. updated by diffing
  // against the uids already on file for this owner before writing, since
  // Supabase's upsert response doesn't distinguish inserted from updated
  // rows.
  private async upsertImportedEvents(
    ownerColumn: "neighborhood_id" | "venue_id",
    ownerId: string,
    events: ImportedEventInput[]
  ): Promise<IcalSyncResult> {
    if (events.length === 0) return { imported: 0, updated: 0 };

    const { data: existing, error: selectError } = await this.supabase
      .from("event")
      .select("external_uid")
      .eq(ownerColumn, ownerId)
      .eq("source", "ical");
    if (selectError) throw new Error(`upsertImportedEvents (select) failed: ${selectError.message}`);
    const existingUids = new Set((existing ?? []).map((row) => row.external_uid as string));

    const rows = events.map((event) => ({
      [ownerColumn]: ownerId,
      title: event.title,
      description: event.description,
      start_time: event.startTime,
      end_time: event.endTime,
      source: "ical",
      external_uid: event.uid,
      location: event.location,
    }));

    const { error } = await this.supabase
      .from("event")
      .upsert(rows, { onConflict: `${ownerColumn},external_uid` });
    if (error) throw new Error(`upsertImportedEvents failed: ${error.message}`);

    const imported = events.filter((event) => !existingUids.has(event.uid)).length;
    return { imported, updated: events.length - imported };
  }

  async getEventOwner(eventId: string): Promise<{ venueId: string | null; neighborhoodId: string | null } | null> {
    const { data, error } = await this.supabase
      .from("event")
      .select("venue_id, neighborhood_id")
      .eq("id", eventId)
      .maybeSingle();

    if (error) throw new Error(`getEventOwner failed: ${error.message}`);
    if (!data) return null;
    return { venueId: data.venue_id, neighborhoodId: data.neighborhood_id };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await this.supabase.from("event").delete().eq("id", eventId);
    if (error) throw new Error(`deleteEvent failed: ${error.message}`);
  }

  async setEventStatus(eventId: string, status: EventStatus): Promise<EventRecord> {
    const { data, error } = await this.supabase
      .from("event")
      .update({ status })
      .eq("id", eventId)
      .select(EVENT_COLUMNS)
      .single();

    if (error) throw new Error(`setEventStatus failed: ${error.message}`);
    return toRecord(data);
  }
}
