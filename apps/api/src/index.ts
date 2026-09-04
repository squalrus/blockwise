import { createApp } from "./app";

// Local-only entrypoint (unlike apps/api/netlify/functions, where Netlify
// injects environment variables directly) so it loads apps/api/.env.local
// itself -- nothing else in the process does that automatically. See
// scripts/backfillOsmIdentity.ts.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local file present -- fine if the environment was set some other way.
}

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

createApp().listen(port, () => {
  console.log(`api listening on http://localhost:${port}/api`);
});
