export interface EventRecord {
  id: string;
  // Exactly one of venueId/neighborhoodId is set (BACKLOG.md "Neighborhood
  // profile pages") -- a venue-scoped event, or a neighborhood-wide one.
  venueId: string | null;
  neighborhoodId: string | null;
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
  listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]>;
}
