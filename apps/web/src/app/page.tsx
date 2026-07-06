import type { HealthCheckResponse } from "@blockwise/types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function getApiHealth(): Promise<HealthCheckResponse | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
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
            unreachable at {API_URL} (start apps/api with `npm run dev`)
          </p>
        )}
      </div>
    </div>
  );
}
