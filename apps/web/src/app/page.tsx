import type { HealthCheckResponse } from "@blockwise/types";

// In production the two apps are one same-origin Netlify site
// (netlify.toml), so the API is only reachable through the /api/* redirect
// to the co-located function -- `process.env.URL` is Netlify's own
// auto-injected production site URL, set on every deploy with no dashboard
// configuration needed. Locally (npm run dev, port 4000), apps/api's own
// middleware strips a leading /api the same way the redirect's target does,
// so /api/health resolves correctly against both.
const API_URL = process.env.API_URL ?? process.env.URL ?? "http://localhost:4000";
const HEALTH_URL = `${API_URL}/api/health`;

async function getApiHealth(): Promise<HealthCheckResponse | null> {
  try {
    const res = await fetch(HEALTH_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthCheckResponse;
  } catch {
    return null;
  }
}

export default async function Home() {
  const apiHealth = await getApiHealth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-16 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Blockwise
      </h1>
      <div className="rounded-lg border border-black/[.08] px-6 py-4 text-sm dark:border-white/[.145]">
        <p className="text-zinc-600 dark:text-zinc-400">apps/api health check</p>
        {apiHealth ? (
          <p className="mt-1 font-medium text-green-600 dark:text-green-400">
            {apiHealth.status} — {apiHealth.service} @ {apiHealth.timestamp}
          </p>
        ) : (
          <p className="mt-1 font-medium text-red-600 dark:text-red-400">
            unreachable at {HEALTH_URL} (start apps/api with `npm run dev`)
          </p>
        )}
      </div>
    </div>
  );
}
