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

// One event with everyone still owed an "event starting soon" reminder --
// grouped by event (rather than one row per follow) so the reminder sweep
// (eventReminders.ts) sends a single push fan-out per event instead of one
// call per follower.
export interface PendingEventReminder {
  eventId: string;
  eventTitle: string;
  venueId: string | null;
  venueName: string | null;
  startTime: string;
  follows: { followId: string; userId: string }[];
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
  // Reminder sweep's read side (BACKLOG.md Ref 102): every active, not-yet-
  // notified follow whose event starts within [windowStart, windowEnd].
  // Grouped by event so the caller can fan a single push out to all of an
  // event's pending followers at once.
  listPendingEventReminders(windowStart: string, windowEnd: string): Promise<PendingEventReminder[]>;
  // Reminder sweep's write side -- marks every given follow row's
  // notified_at so the next sweep doesn't re-notify the same follower for
  // the same event.
  markEventRemindersSent(followIds: string[]): Promise<void>;
}
