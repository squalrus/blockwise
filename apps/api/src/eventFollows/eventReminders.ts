import type { AuthRepository } from "../auth/repository";
import type { PushSubscriptionRepository } from "../pushSubscriptions/repository";
import { filterByNotificationPreference, sendPushToUsers, type SendPushSummary } from "../pushSubscriptions/pushSubscriptions";
import type { PushSender } from "../pushSubscriptions/webPushSender";
import type { EventFollowRepository } from "./repository";

// How far ahead of an event's start_time a follower gets their heads-up.
export const EVENT_REMINDER_LEAD_TIME_MS = 15 * 60 * 1000;
// How far *past* an event's start_time a still-unnotified follow is still
// worth notifying for -- covers a missed/delayed sweep without resurfacing
// events that started long ago.
export const EVENT_REMINDER_GRACE_MS = 30 * 60 * 1000;

export interface EventReminderSummary extends SendPushSummary {
  eventsNotified: number;
}

// BACKLOG.md Ref 102: the first time-based (as opposed to request-driven)
// push trigger. Meant to be called on a poll (event-reminders.ts's Netlify
// scheduled function) every few minutes; notified_at on event_follow is
// what makes repeat calls safe -- each pending row is only ever included in
// one sweep's window before it's marked done.
export async function sendEventStartReminders(
  eventFollowRepository: EventFollowRepository,
  subscriptionRepository: PushSubscriptionRepository,
  sender: PushSender,
  authRepository: AuthRepository,
  now: Date = new Date()
): Promise<EventReminderSummary> {
  const windowStart = new Date(now.getTime() - EVENT_REMINDER_GRACE_MS).toISOString();
  const windowEnd = new Date(now.getTime() + EVENT_REMINDER_LEAD_TIME_MS).toISOString();

  const pending = await eventFollowRepository.listPendingEventReminders(windowStart, windowEnd);
  const summary: SendPushSummary = { sent: 0, pruned: 0, failed: 0 };

  for (const event of pending) {
    // Every follow row is marked notified below regardless of preference --
    // an opted-out follower still shouldn't be re-checked on every future
    // sweep for the same already-processed event.
    const enabledUserIds = await filterByNotificationPreference(
      event.follows.map((f) => f.userId),
      "event_reminders",
      authRepository
    );

    if (enabledUserIds.length > 0) {
      const eventSummary = await sendPushToUsers(
        enabledUserIds,
        {
          title: "Event starting soon",
          body: event.venueName ? `${event.eventTitle} at ${event.venueName} is starting soon` : `${event.eventTitle} is starting soon`,
          url: event.venueId ? `/location/${event.venueId}` : "/account",
        },
        subscriptionRepository,
        sender
      );
      summary.sent += eventSummary.sent;
      summary.pruned += eventSummary.pruned;
      summary.failed += eventSummary.failed;
    }

    // Marked regardless of individual send failures -- a webpush error is
    // treated as fire-and-forget everywhere else in pushSubscriptions.ts,
    // and there's no retry path here that a stuck failing subscription
    // wouldn't also just fail again on.
    await eventFollowRepository.markEventRemindersSent(event.follows.map((f) => f.followId));
  }

  return { ...summary, eventsNotified: pending.length };
}
