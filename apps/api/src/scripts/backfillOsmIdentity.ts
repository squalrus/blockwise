import { LiveGeoapifyClient } from "../places/geoapifyClient";
import { MockGeoapifyClient } from "../places/mockGeoapifyClient";
import { getSupabaseClient } from "../supabase";

// This is a local-only entrypoint (unlike apps/api/netlify/functions, where
// Netlify injects environment variables directly) so it loads
// apps/api/.env.local itself -- nothing else in the process does that
// automatically.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local file present -- fine if the environment was set some other way.
}

// One-time backfill (BACKLOG.md, 2026-09-04 osm_type/osm_id foundation fix,
// live-verified against Geoapify: the same real-world business returned
// three different place_id strings from three different Geoapify endpoints
// at the same instant -- see supabase/migrations/20260904010000_venue_osm_identity.sql's
// comment for the full story). That migration only adds the osm_type/osm_id
// columns; it can't populate them for existing rows, since that needs a
// real Place Details call per row. This script does that: for every venue
// that already has a geoapify_place_id (its enrichment-fetch cache -- see
// Venue.osm_type's comment) but no osm_type yet, looks up Place Details and
// fills in the real identity, opportunistically refreshing geoapify_place_id
// to whatever Place Details itself just returned too.
//
// Safe to re-run -- only ever touches rows still missing osm_type, so a
// partial run (interrupted, or some rows failed) picks up cleanly next time.
// Usage: npm run backfill:osm-identity [-- --dry-run]
async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const apiKey = process.env.GEOAPIFY_API_KEY;
  const client = apiKey ? new LiveGeoapifyClient(apiKey) : new MockGeoapifyClient();
  if (!apiKey) {
    console.log("GEOAPIFY_API_KEY not set -- using mock Geoapify responses (won't resolve anything real).\n");
  }
  if (dryRun) {
    console.log("--dry-run: looking up Place Details but not writing anything.\n");
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("venue")
    .select("id, name, geoapify_place_id")
    .not("geoapify_place_id", "is", null)
    .is("osm_type", null)
    .neq("status", "removed");
  if (error) throw new Error(`Failed to list venues needing backfill: ${error.message}`);

  const rows = data ?? [];
  console.log(`${rows.length} location(s) have a geoapify_place_id but no osm_type/osm_id yet.\n`);

  let resolved = 0;
  let noOsmData = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const details = await client.getPlaceDetails(row.geoapify_place_id as string);

      if (details.osmType === null || details.osmId === null) {
        noOsmData++;
        console.log(`- ${row.name}: Place Details has no OSM data for this place -- left blank for now`);
        continue;
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from("venue")
          .update({
            osm_type: details.osmType,
            osm_id: details.osmId,
            // Place Details hands back yet another place_id of its own (see
            // GeoapifyPlace.osmType's comment) -- cache the freshest one seen.
            geoapify_place_id: details.placeId,
          })
          .eq("id", row.id);

        if (updateError) {
          // Postgres unique_violation on venue_osm_ref_neighborhood_id_key --
          // this venue and some other row in the same neighborhood resolve
          // to the identical osm identity, meaning they're themselves an
          // existing duplicate (see LocationIdentityConflictError's
          // comment). Needs a human to reconcile (hide/remove one), not
          // something this script should guess at.
          if (updateError.code === "23505") {
            failed++;
            console.error(
              `✗ ${row.name} (${row.id}): duplicate -- another location in this neighborhood already resolves to ${details.osmType}/${details.osmId}`
            );
            continue;
          }
          throw new Error(updateError.message);
        }
      }

      resolved++;
      console.log(`✓ ${row.name}: ${details.osmType}/${details.osmId}${dryRun ? " (dry run, not saved)" : ""}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${row.name} (${row.id}): ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  console.log(`\nDone. Resolved ${resolved}, no OSM data ${noOsmData}, failed ${failed}.`);

  // Gap report: every location still with no Geoapify link at all,
  // regardless of whether this run touched it -- expected for a manually
  // added location (PoiForm/AddLocationModal), not a failure (see
  // Venue.osm_type's comment on the supported blank state).
  const { count: neverLinked, error: countError } = await supabase
    .from("venue")
    .select("id", { count: "exact", head: true })
    .is("geoapify_place_id", null)
    .neq("status", "removed");
  if (countError) throw new Error(`Failed to count unlinked venues: ${countError.message}`);

  console.log(
    `${neverLinked ?? 0} location(s) have no geoapify_place_id at all (manually added) -- expected, not a failure.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
