import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventFollowRecord, EventFollowRepository, FollowedEvent } from "./repository";

function toRecord(row: { id: string; user_id: string; event_id: string; created_at: string }): EventFollowRecord {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    createdAt: row.created_at,
  };
}

function single<T>(embed: T[] | T | null | undefined): T | null {
  if (embed === undefined || embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

export class SupabaseEventFollowRepository implements EventFollowRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async eventExists(eventId: string): Promise<boolean> {
    const { data, error } = await this.supabase.from("event").select("id").eq("id", eventId).maybeSingle();

    if (error) throw new Error(`eventExists failed: ${error.message}`);
    return data !== null;
  }

  async getFollow(userId: string, eventId: string): Promise<EventFollowRecord | null> {
    const { data, error } = await this.supabase
      .from("event_follow")
      .select("id, user_id, event_id, created_at")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) throw new Error(`getFollow failed: ${error.message}`);
    return data ? toRecord(data) : null;
  }

  async createFollow(userId: string, eventId: string): Promise<EventFollowRecord> {
    const { data, error } = await this.supabase
      .from("event_follow")
      .insert({ user_id: userId, event_id: eventId })
      .select("id, user_id, event_id, created_at")
      .single();

    if (error) throw new Error(`createFollow failed: ${error.message}`);
    return toRecord(data);
  }

  async deleteFollow(userId: string, eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from("event_follow")
      .delete()
      .eq("user_id", userId)
      .eq("event_id", eventId);

    if (error) throw new Error(`deleteFollow failed: ${error.message}`);
  }

  async listFollowedEventsForUser(userId: string): Promise<FollowedEvent[]> {
    // Drops events that have already ended (BACKLOG.md Ref 81 -- a followed
    // event is an upcoming-plans list, not a history), mirroring the
    // end_time >= now filter listEventsForNeighborhoodAndVenues applies to
    // the public Upcoming events tab.
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("event_follow")
      .select(
        "created_at, event:event_id!inner(id, venue_id, neighborhood_id, title, description, start_time, end_time, created_at, source, location, status, end_time, venue:venue_id(name))"
      )
      .eq("user_id", userId)
      .gte("event.end_time", nowIso)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`listFollowedEventsForUser failed: ${error.message}`);

    type JoinedEvent = {
      id: string;
      venue_id: string | null;
      neighborhood_id: string | null;
      title: string;
      description: string;
      start_time: string;
      end_time: string;
      created_at: string;
      source: "manual" | "ical";
      location: string | null;
      status: "active" | "hidden";
      venue: { name: string } | { name: string }[] | null;
    };

    return (data ?? [])
      .map((row) => ({
        event: single(row.event as JoinedEvent | JoinedEvent[] | null),
        followedAt: row.created_at as string,
      }))
      .filter((row): row is { event: JoinedEvent; followedAt: string } => row.event !== null)
      .map((row) => ({
        eventId: row.event.id,
        venueId: row.event.venue_id,
        neighborhoodId: row.event.neighborhood_id,
        venueName: single(row.event.venue)?.name ?? null,
        title: row.event.title,
        description: row.event.description,
        startTime: row.event.start_time,
        endTime: row.event.end_time,
        createdEventAt: row.event.created_at,
        source: row.event.source,
        location: row.event.location,
        status: row.event.status,
        followedAt: row.followedAt,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}
