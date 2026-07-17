export interface EventFollowRecord {
  id: string;
  userId: string;
  eventId: string;
  createdAt: string;
}

export interface FollowedEvent {
  eventId: string;
  venueId: string | null;
  neighborhoodId: string | null;
  venueName: string | null;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  createdEventAt: string;
  source: "manual" | "ical";
  location: string | null;
  status: "active" | "hidden";
  followedAt: string;
}

// Abstracts persistence so followEvent/unfollowEvent (eventFollow.ts) can be
// tested against an in-memory fake, mirroring favorites/repository.ts.
export interface EventFollowRepository {
  eventExists(eventId: string): Promise<boolean>;
  getFollow(userId: string, eventId: string): Promise<EventFollowRecord | null>;
  createFollow(userId: string, eventId: string): Promise<EventFollowRecord>;
  deleteFollow(userId: string, eventId: string): Promise<void>;
  // Backs the "My account" page's Events tab (BACKLOG.md Ref 81) -- event-
  // joined listing for a signed-in user, mirroring
  // favorites/repository.ts's listFavoriteVenuesForUser. Excludes events
  // that have already ended (end_time in the past), same "still relevant"
  // filter listEventsForNeighborhoodAndVenues applies to the public
  // Upcoming events tab.
  listFollowedEventsForUser(userId: string): Promise<FollowedEvent[]>;
}
