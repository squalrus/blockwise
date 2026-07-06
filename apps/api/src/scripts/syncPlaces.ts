import { LivePlacesClient } from "../places/client";
import { MockPlacesClient } from "../places/mockClient";
import { SupabasePlacesRepository } from "../places/supabaseRepository";
import { syncNeighborhoodPlaces } from "../places/sync";
import { getSupabaseClient } from "../supabase";

// This is a local-only entrypoint (unlike apps/api/netlify/functions, where
// Netlify injects environment variables directly) so it loads apps/api/.env
// itself -- nothing else in the process does that automatically.
try {
  process.loadEnvFile();
} catch {
  // No .env file present -- fine if the environment was set some other way.
}

// Runs the Google Places sync for one neighborhood (BACKLOG "Data layer
// MVP"). Usage: npm run sync:places -- <neighborhood-slug>
// Uses MockPlacesClient unless GOOGLE_PLACES_API_KEY is set in the
// environment (see apps/api/GOOGLE_PLACES_SETUP.md for real-key setup).
async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run sync:places -- <neighborhood-slug>");
    process.exit(1);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const client = apiKey ? new LivePlacesClient(apiKey) : new MockPlacesClient();
  if (!apiKey) {
    console.log("GOOGLE_PLACES_API_KEY not set -- using mock Google Places responses.\n");
  }

  const repository = new SupabasePlacesRepository(getSupabaseClient());
  const report = await syncNeighborhoodPlaces(slug, client, repository);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
