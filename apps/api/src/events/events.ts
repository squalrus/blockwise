import type { Event } from "@blockwise/types";
import type { EventRecord, EventRepository } from "./repository";

function toEvent(record: EventRecord): Event {
  return {
    id: record.id,
    venue_id: record.venueId,
    neighborhood_id: record.neighborhoodId,
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

// Shared by createEvent/createEventForNeighborhood below -- the owning venue
// or neighborhood is already guaranteed to exist and be owned by the caller
// via the route's gate (requireVenueOwner or requireNeighborhoodAdmin), so
// the only validation left to do here is the one thing the route can't check
// for free: that the event's own time range makes sense.
async function createEventRecord(
  owner: { venueId?: string; neighborhoodId?: string },
  input: CreateEventInput,
  repository: EventRepository
): Promise<CreateEventResult> {
  const start = new Date(input.startTime).getTime();
  const end = new Date(input.endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return { status: "invalid_time_range" };
  }

  const record = await repository.createEvent({
    ...owner,
    title: input.title,
    description: input.description,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  return { status: "created", event: toEvent(record) };
}

export async function createEvent(
  venueId: string,
  input: CreateEventInput,
  repository: EventRepository
): Promise<CreateEventResult> {
  return createEventRecord({ venueId }, input, repository);
}

export async function createEventForNeighborhood(
  neighborhoodId: string,
  input: CreateEventInput,
  repository: EventRepository
): Promise<CreateEventResult> {
  return createEventRecord({ neighborhoodId }, input, repository);
}

export async function listEventsForVenue(
  venueId: string,
  repository: EventRepository
): Promise<Event[]> {
  const records = await repository.listEventsForVenue(venueId);
  return records.map(toEvent);
}

export async function listEventsForNeighborhood(
  neighborhoodId: string,
  repository: EventRepository
): Promise<Event[]> {
  const records = await repository.listEventsForNeighborhood(neighborhoodId);
  return records.map(toEvent);
}
