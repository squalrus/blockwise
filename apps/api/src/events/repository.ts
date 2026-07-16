// "manual" is the existing EventForm authoring path; "ical" is a row
// upserted by an iCal/webcal feed sync (BACKLOG.md Ref 30) -- keyed by
// externalUid so re-syncs update rather than duplicate.
export type EventSource = "manual" | "ical";

// "hidden" survives an iCal re-sync (upsertImportedEvents never overwrites
// status on conflict), unlike a hard delete which a re-sync would just
// undo -- the way to suppress one specific imported event without
// excluding it from future syncs.
export type EventStatus = "active" | "hidden";

export interface EventRecord {
  id: string;
  // Exactly one of venueId/neighborhoodId is set (BACKLOG.md "Neighborhood
  // profile pages") -- a venue-scoped event, or a neighborhood-wide one.
  venueId: string | null;
  neighborhoodId: string | null;
  // Set only by listEventsForNeighborhoodAndVenues, which joins in the
  // hosting business's name for venue-scoped events -- null for
  // neighborhood-scoped events and every other query method.
  venueName: string | null;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  source: EventSource;
  // The feed's own iCalendar UID -- null for source "manual". Unique per
  // owner (event_neighborhood_uid_unique/event_venue_uid_unique), which is
  // what makes a re-sync an upsert instead of a duplicate insert.
  externalUid: string | null;
  // Free-text location (BACKLOG.md Ref 30) -- always null for manually
  // created events (EventForm doesn't collect one yet). For imported events,
  // icalSync.ts fills this in: the feed's own per-event LOCATION for
  // neighborhood-owned imports (a neighborhood-wide feed's events can be
  // anywhere), or the venue's own address for venue-owned imports (a
  // business's events are always at that business).
  location: string | null;
  status: EventStatus;
}

export interface CreateEventInput {
  venueId?: string;
  neighborhoodId?: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

// One parsed VEVENT ready to persist -- the shape icalFeed.ts's fetchIcalFeed
// produces and upsertImportedEventsFor{Neighborhood,Venue} consumes.
export interface ImportedEventInput {
  uid: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  // The feed's own VEVENT LOCATION, or null if the feed didn't set one.
  location: string | null;
}

export interface IcalSyncResult {
  imported: number;
  updated: number;
}

// Abstracts persistence so createEvent/listEventsForVenue (events.ts) can be
// tested against an in-memory fake, mirroring announcements/repository.ts.
export interface EventRepository {
  createEvent(input: CreateEventInput): Promise<EventRecord>;
  // GET /venues/:id/events (public) calls this with includeHidden left
  // false; the business owner dashboard (which needs to show hidden events
  // too, so there's something to unhide) explicitly passes true. Default
  // false rather than a second method, since this is the only event list
  // method with both a public and an admin caller.
  listEventsForVenue(venueId: string, includeHidden?: boolean): Promise<EventRecord[]>;
  // Neighborhood-owned events only -- backs the neighborhood-admin dashboard,
  // which only ever edits events the neighborhood itself authored. Admin-only
  // today, so (unlike listEventsForVenue) always includes hidden rows.
  listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]>;
  // Neighborhood-owned events *and* events from businesses within that
  // neighborhood, merged and sorted by start_time -- backs the public
  // Upcoming events tab (BACKLOG.md Ref 27), where a visitor cares about
  // everything happening nearby, not just what the neighborhood itself
  // posted. Excludes events that have already ended (end_time in the past)
  // or are hidden; an event currently in progress is still included, since
  // end_time hasn't passed yet -- that's what lets happeningNow.ts's
  // isLiveNow filter find it.
  listEventsForNeighborhoodAndVenues(neighborhoodId: string): Promise<EventRecord[]>;
  // iCal feed sync (BACKLOG.md Ref 30) -- upserts by (ownerId, uid), so a
  // feed that still lists a previously-imported event updates that same row
  // instead of creating a second one, and manual rows (external_uid always
  // null) are never touched.
  upsertImportedEventsForNeighborhood(
    neighborhoodId: string,
    events: ImportedEventInput[]
  ): Promise<IcalSyncResult>;
  upsertImportedEventsForVenue(venueId: string, events: ImportedEventInput[]): Promise<IcalSyncResult>;
  // Ownership check backing the delete routes below -- null if the event
  // doesn't exist, so a cross-owner id and a missing one both resolve to the
  // same not_found result without leaking which case it was (mirrors
  // claims/repository.ts's getClaimVenueNeighborhoodId).
  getEventOwner(eventId: string): Promise<{ venueId: string | null; neighborhoodId: string | null } | null>;
  // Hard delete -- no dependent rows reference event.id, unlike locations
  // (checkin/point_event/etc.), so there's no soft-hide/hasDependentActivity
  // step to go through first.
  deleteEvent(eventId: string): Promise<void>;
  // Hide/restore (BACKLOG.md Ref 30 follow-up) -- unlike deleteEvent, this
  // survives an iCal re-sync since upsertImportedEvents never writes status.
  setEventStatus(eventId: string, status: EventStatus): Promise<EventRecord>;
}
