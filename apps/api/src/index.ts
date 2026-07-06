import { createApp } from "./app";

// Local-only entrypoint (unlike apps/api/netlify/functions, where Netlify
// injects environment variables directly) so it loads apps/api/.env itself --
// nothing else in the process does that automatically. See scripts/syncPlaces.ts.
try {
  process.loadEnvFile();
} catch {
  // No .env file present -- fine if the environment was set some other way.
}

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

createApp().listen(port, () => {
  console.log(`api listening on http://localhost:${port}/api`);
});
