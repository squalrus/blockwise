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
    <div className="flex min-h-screen flex-col items-center gap-6 bg-background p-4 font-sans sm:p-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">Spored</h1>

      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <p className="text-lg font-extrabold text-foreground">Discover local. Check in. Connect.</p>
        <p className="text-sm text-muted">
          Spored helps you find what&apos;s happening in your neighborhood — browse local
          businesses, check in when you visit, and join challenges as you explore.
        </p>
      </div>

      <NeighborhoodsSection />

      <div className="rounded-2xl bg-card-alt px-6 py-4 text-sm">
        <p className="text-muted">apps/api health check</p>
        {apiHealth ? (
          <p className="mt-1 font-bold text-brand-green">
            {apiHealth.status} — {apiHealth.service} @ {apiHealth.timestamp}
          </p>
        ) : (
          <p className="mt-1 font-bold text-brand-orange">
            unreachable at {HEALTH_URL} (start apps/api with `npm run dev`)
          </p>
        )}
      </div>
    </div>
  );
}
