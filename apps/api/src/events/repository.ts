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
}

export interface CreateEventInput {
  venueId?: string;
  neighborhoodId?: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
}

// Abstracts persistence so createEvent/listEventsForVenue (events.ts) can be
// tested against an in-memory fake, mirroring announcements/repository.ts.
export interface EventRepository {
  createEvent(input: CreateEventInput): Promise<EventRecord>;
  listEventsForVenue(venueId: string): Promise<EventRecord[]>;
  // Neighborhood-owned events only -- backs the neighborhood-admin dashboard,
  // which only ever edits events the neighborhood itself authored.
  listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]>;
  // Neighborhood-owned events *and* events from businesses within that
  // neighborhood, merged and sorted by start_time -- backs the public
  // Upcoming events tab (BACKLOG.md Ref 27), where a visitor cares about
  // everything happening nearby, not just what the neighborhood itself
  // posted.
  listEventsForNeighborhoodAndVenues(neighborhoodId: string): Promise<EventRecord[]>;
}
