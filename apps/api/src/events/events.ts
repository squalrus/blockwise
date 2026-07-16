import type { Event, EventStatus } from "@blockwise/types";
import type { EventRecord, EventRepository } from "./repository";

function toEvent(record: EventRecord): Event {
  return {
    id: record.id,
    venue_id: record.venueId,
    neighborhood_id: record.neighborhoodId,
    venue_name: record.venueName,
    title: record.title,
    description: record.description,
    start_time: record.startTime,
    end_time: record.endTime,
    created_at: record.createdAt,
    source: record.source,
    location: record.location,
    status: record.status,
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
  repository: EventRepository,
  includeHidden = false
): Promise<Event[]> {
  const records = await repository.listEventsForVenue(venueId, includeHidden);
  return records.map(toEvent);
}

export async function listEventsForNeighborhood(
  neighborhoodId: string,
  repository: EventRepository
): Promise<Event[]> {
  const records = await repository.listEventsForNeighborhood(neighborhoodId);
  return records.map(toEvent);
}

// Public "Upcoming events" tab (BACKLOG.md Ref 27): neighborhood-authored
// events plus events from businesses within the neighborhood.
export async function listUpcomingEventsForNeighborhood(
  neighborhoodId: string,
  repository: EventRepository
): Promise<Event[]> {
  const records = await repository.listEventsForNeighborhoodAndVenues(neighborhoodId);
  return records.map(toEvent);
}

// Shared by delete/setEventStatus below -- checks the event's actual owner
// against the caller's own venueId/neighborhoodId (venueOwnerGate/
// neighborhoodAdminGate already prove the caller owns *that* venue/
// neighborhood, but not that this particular event id belongs to it) so one
// venue/neighborhood can't act on another's event by guessing an id.
async function verifyEventOwnership(
  owner: { venueId?: string; neighborhoodId?: string },
  eventId: string,
  repository: EventRepository
): Promise<boolean> {
  const actualOwner = await repository.getEventOwner(eventId);
  return (
    actualOwner !== null &&
    (owner.venueId !== undefined
      ? actualOwner.venueId === owner.venueId
      : actualOwner.neighborhoodId === owner.neighborhoodId)
  );
}

export type DeleteEventResult = { status: "not_found" } | { status: "deleted" };

async function deleteEventRecord(
  owner: { venueId?: string; neighborhoodId?: string },
  eventId: string,
  repository: EventRepository
): Promise<DeleteEventResult> {
  if (!(await verifyEventOwnership(owner, eventId, repository))) return { status: "not_found" };

  await repository.deleteEvent(eventId);
  return { status: "deleted" };
}

export async function deleteEventForVenue(
  venueId: string,
  eventId: string,
  repository: EventRepository
): Promise<DeleteEventResult> {
  return deleteEventRecord({ venueId }, eventId, repository);
}

export async function deleteEventForNeighborhood(
  neighborhoodId: string,
  eventId: string,
  repository: EventRepository
): Promise<DeleteEventResult> {
  return deleteEventRecord({ neighborhoodId }, eventId, repository);
}

export type SetEventStatusResult = { status: "not_found" } | { status: "updated"; event: Event };

// Hide/restore (BACKLOG.md Ref 30 follow-up) -- unlike delete, hiding an
// iCal-imported event survives future syncs (upsertImportedEvents never
// writes status on conflict), so this is the way to suppress one specific
// imported event without excluding it from the feed permanently.
async function setEventStatusRecord(
  owner: { venueId?: string; neighborhoodId?: string },
  eventId: string,
  status: EventStatus,
  repository: EventRepository
): Promise<SetEventStatusResult> {
  if (!(await verifyEventOwnership(owner, eventId, repository))) return { status: "not_found" };

  const record = await repository.setEventStatus(eventId, status);
  return { status: "updated", event: toEvent(record) };
}

export async function setEventStatusForVenue(
  venueId: string,
  eventId: string,
  status: EventStatus,
  repository: EventRepository
): Promise<SetEventStatusResult> {
  return setEventStatusRecord({ venueId }, eventId, status, repository);
}

export async function setEventStatusForNeighborhood(
  neighborhoodId: string,
  eventId: string,
  status: EventStatus,
  repository: EventRepository
): Promise<SetEventStatusResult> {
  return setEventStatusRecord({ neighborhoodId }, eventId, status, repository);
}
