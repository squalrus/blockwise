import type { Event, HappeningNow } from "@blockwise/types";
import type { EnrichmentRepository } from "../enrichment/repository";
import type { EventRepository } from "../events/repository";
import { listUpcomingEventsForNeighborhood } from "../events/events";
import { isOpenNow } from "./hours";

function isLiveNow(event: Event, now: Date): boolean {
  const start = new Date(event.start_time).getTime();
  const end = new Date(event.end_time).getTime();
  const nowMs = now.getTime();
  return nowMs >= start && nowMs <= end;
}

// Happening now tab (BACKLOG.md Ref 27): a mix of events currently in
// progress and businesses/POIs whose cached hours say they're open right
// now. Locations with no cached hours are simply excluded, not guessed at
// (BACKLOG.md Ref 60's photo strip made the same call for missing photos).
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
    live_events: events.filter((event) => isLiveNow(event, now)),
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
