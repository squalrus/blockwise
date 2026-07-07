export interface EventRecord {
  id: string;
  venueId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface CreateEventInput {
  venueId: string;
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
}
