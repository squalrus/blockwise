import type { Config } from "@netlify/functions";
import { syncNeighborhoodIcalFeed } from "../../src/events/icalSync";
import { SupabaseEventRepository } from "../../src/events/supabaseRepository";
import type { EventRepository } from "../../src/events/repository";
import type { NeighborhoodRepository } from "../../src/neighborhoods/repository";
import { SupabaseNeighborhoodRepository } from "../../src/neighborhoods/supabaseRepository";
import { getSupabaseClient } from "../../src/supabase";

// Nightly counterpart to the neighborhood-admin "Sync now" button -- syncs
// every neighborhood that has ical_auto_sync_enabled on and a feed URL
// configured. Each neighborhood's sync is isolated in its own try/catch so
// one bad feed doesn't block the rest, mirroring event-reminders.ts's
// "one run's failure shouldn't cascade" approach.
//
// business_claim already has its own ical_feed_url/ical_synced_at and its
// own manual-sync function (syncVenueIcalFeed in icalSync.ts) -- it doesn't
// yet have auto-sync/auto-approve columns, so this only covers
// neighborhoods today. Adding business auto-sync later means adding those
// two columns to business_claim and a sibling syncEligibleVenues() step
// here, calling syncVenueIcalFeed per eligible venue -- not a rewrite of
// this file or a second scheduled function/cron entry.
async function syncEligibleNeighborhoods(
  neighborhoodRepository: NeighborhoodRepository,
  eventRepository: EventRepository
) {
  const neighborhoods = (await neighborhoodRepository.listAll()).filter(
    (n) => n.icalAutoSyncEnabled && n.icalFeedUrl
  );

  let synced = 0;
  let failed = 0;
  for (const neighborhood of neighborhoods) {
    try {
      const outcome = await syncNeighborhoodIcalFeed(neighborhood.id, neighborhoodRepository, eventRepository);
      if (outcome.status === "synced") synced++;
      else failed++;
    } catch (err) {
      failed++;
      console.error(`ical-nightly-sync: neighborhood ${neighborhood.id} failed:`, err);
    }
  }
  console.log(
    `ical-nightly-sync: ${neighborhoods.length} neighborhood(s) eligible, ${synced} synced, ${failed} failed`
  );
}

export default async () => {
  const supabase = getSupabaseClient();
  await syncEligibleNeighborhoods(new SupabaseNeighborhoodRepository(supabase), new SupabaseEventRepository(supabase));
};

// 9am UTC ~= 1-2am Pacific, an off-peak nightly slot.
export const config: Config = {
  schedule: "0 9 * * *",
};
