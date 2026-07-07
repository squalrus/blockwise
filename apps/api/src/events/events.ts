import type { Event } from "@blockwise/types";
import type { EventRecord, EventRepository } from "./repository";

function toEvent(record: EventRecord): Event {
  return {
    id: record.id,
    venue_id: record.venueId,
    title: record.title,
    description: record.description,
    start_time: record.startTime,
    end_time: record.endTime,
    created_at: record.createdAt,
  };
}

export interface CreateEventInput {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

export type CreateEventResult =
  | { status: "created"; event: Event }
  | { status: "invalid_time_range" };

// The venue itself is already guaranteed to exist and be owned by the caller
// via requireVenueOwner (see claims/requireVenueOwner.ts) on the route that
// calls this, so the only validation left to do here is the one thing the
// route can't check for free: that the event's own time range makes sense.
export async function createEvent(
  venueId: string,
  input: CreateEventInput,
  repository: EventRepository
): Promise<CreateEventResult> {
  const start = new Date(input.startTime).getTime();
  const end = new Date(input.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { status: "invalid_time_range" };
  }

  const record = await repository.createEvent({
    venueId,
    title: input.title,
    description: input.description,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  return { status: "created", event: toEvent(record) };
}

export async function listEventsForVenue(
  venueId: string,
  repository: EventRepository
): Promise<Event[]> {
  const records = await repository.listEventsForVenue(venueId);
  return records.map(toEvent);
}
