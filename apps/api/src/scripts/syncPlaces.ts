import { LiveGeoapifyClient } from "../places/geoapifyClient";
import { MockGeoapifyClient } from "../places/mockGeoapifyClient";
import { SupabasePlacesRepository } from "../places/supabaseRepository";
import { syncNeighborhoodPlaces } from "../places/sync";
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

// Runs the Geoapify Places sync for one neighborhood (BACKLOG "Data layer
// MVP"). Usage: npm run sync:places -- <neighborhood-slug>
// Uses MockGeoapifyClient unless GEOAPIFY_API_KEY is set in the environment.
async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run sync:places -- <neighborhood-slug>");
    process.exit(1);
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  const client = apiKey ? new LiveGeoapifyClient(apiKey) : new MockGeoapifyClient();
  if (!apiKey) {
    console.log("GEOAPIFY_API_KEY not set -- using mock Geoapify Places responses.\n");
  }

  const repository = new SupabasePlacesRepository(getSupabaseClient());
  const report = await syncNeighborhoodPlaces(slug, client, repository);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
