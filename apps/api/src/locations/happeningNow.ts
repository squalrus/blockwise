import type { Event, HappeningNow } from "@blockwise/types";
import type { EnrichmentRepository } from "../enrichment/repository";
import type { EventRepository } from "../events/repository";
import { listUpcomingEventsForNeighborhood } from "../events/events";
import { isOpenNow } from "./hours";

// An event counts as "today" if its start/end range overlaps today's local
// calendar day -- broader than a strict now-in-range check, so an event
// later today (not yet started) or one already in progress both count, not
// just ones happening at this exact instant. listUpcomingEventsForNeighborhood
// already excludes anything whose end_time is in the past (server-side), so
// an event that started earlier today and has already ended won't reach
// this filter either way -- "today" here means "today, and not yet over".
function isToday(event: Event, now: Date): boolean {
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return start < todayEnd && end >= todayStart;
}

// "Today" tab (BACKLOG.md Ref 27, renamed from "Happening now"): a mix of
// events happening today and businesses/POIs whose cached hours say they're
// open right now. Locations with no cached hours are simply excluded, not
// guessed at (BACKLOG.md Ref 60's photo strip made the same call for
// missing photos).
export async function getHappeningNow(
  neighborhoodId: string,
  eventRepository: EventRepository,
  enrichmentRepository: EnrichmentRepository,
  now: Date = new Date()
): Promise<HappeningNow> {
  const [events, openNowCandidates] = await Promise.all([
    listUpcomingEventsForNeighborhood(neighborhoodId, eventRepository),
    enrichmentRepository.listOpenNowCandidates(neighborhoodId),
  ]);

  return {
    today_events: events.filter((event) => isToday(event, now)),
    open_now: openNowCandidates
      .filter((candidate) => isOpenNow(candidate.hours, now))
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        kind: candidate.kind,
        category_name: candidate.categoryName,
      })),
  };
}
