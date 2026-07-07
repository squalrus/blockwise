import type { HealthCheckResponse } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { NeighborhoodsSection } from "./NeighborhoodsSection";

const HEALTH_URL = apiUrl("/health");

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
    <div className="flex min-h-screen flex-col items-center gap-6 bg-zinc-50 p-16 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Blockwise
      </h1>

      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium text-black dark:text-zinc-50">
          Discover local. Check in. Connect.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Blockwise helps you find what&apos;s happening in your neighborhood — browse local
          businesses, check in when you visit, and join challenges as you explore.
        </p>
      </div>

      <NeighborhoodsSection />

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
