import type { ClaimRepository } from "../claims/repository";
import type { LocationRepository } from "../locations/repository";
import type { NeighborhoodRepository } from "../neighborhoods/repository";
import { fetchIcalFeed } from "./icalFeed";
import type { EventRepository, IcalSyncResult } from "./repository";

export type IcalSyncOutcome =
  | { status: "not_found" }
  | { status: "no_feed_configured" }
  | { status: "fetch_error"; message: string }
  | { status: "synced"; result: IcalSyncResult; syncedAt: string };

// Neighborhood-admin "Sync now" action (BACKLOG.md Ref 30) -- fetches the
// neighborhood's configured feed and upserts it into the event table.
// requireNeighborhoodAdmin already proves the caller administers
// req.params.id, but not that the id refers to a real row, so not_found is
// still checked here (mirrors updateNeighborhoodDescription).
export async function syncNeighborhoodIcalFeed(
  neighborhoodId: string,
  neighborhoodRepository: NeighborhoodRepository,
  eventRepository: EventRepository,
  fetchFeed: typeof fetchIcalFeed = fetchIcalFeed
): Promise<IcalSyncOutcome> {
  const neighborhood = await neighborhoodRepository.getNeighborhoodById(neighborhoodId);
  if (!neighborhood) return { status: "not_found" };
  if (!neighborhood.icalFeedUrl) return { status: "no_feed_configured" };

  let parsed;
  try {
    parsed = await fetchFeed(neighborhood.icalFeedUrl);
  } catch (err) {
    return { status: "fetch_error", message: err instanceof Error ? err.message : "Failed to fetch calendar feed" };
  }

  const result = await eventRepository.upsertImportedEventsForNeighborhood(neighborhoodId, parsed);
  const syncedAt = new Date().toISOString();
  await neighborhoodRepository.markIcalSynced(neighborhoodId, syncedAt);
  return { status: "synced", result, syncedAt };
}

// Business owner "Sync now" action -- venueOwnerGate already proves the
// caller holds an approved claim on this venue, so (unlike the neighborhood
// version above) there's no not_found branch to check.
export async function syncVenueIcalFeed(
  venueId: string,
  claimRepository: ClaimRepository,
  eventRepository: EventRepository,
  locationRepository: LocationRepository,
  fetchFeed: typeof fetchIcalFeed = fetchIcalFeed
): Promise<IcalSyncOutcome> {
  const feed = await claimRepository.getApprovedClaimIcalFeed(venueId);
  if (!feed.icalFeedUrl) return { status: "no_feed_configured" };

  let parsed;
  try {
    parsed = await fetchFeed(feed.icalFeedUrl);
  } catch (err) {
    return { status: "fetch_error", message: err instanceof Error ? err.message : "Failed to fetch calendar feed" };
  }

  // A business's events are always at that business's own address, so it's
  // filled in automatically rather than relying on the feed to set LOCATION
  // per event -- falls back to whatever the feed said only if the venue has
  // no address on file.
  const venue = await locationRepository.getLocationById(venueId);
  const venueAddress = venue?.address ?? null;
  const events = venueAddress
    ? parsed.map((event) => ({ ...event, location: venueAddress }))
    : parsed;

  const result = await eventRepository.upsertImportedEventsForVenue(venueId, events);
  const syncedAt = new Date().toISOString();
  await claimRepository.markApprovedClaimIcalSynced(venueId, syncedAt);
  return { status: "synced", result, syncedAt };
}
