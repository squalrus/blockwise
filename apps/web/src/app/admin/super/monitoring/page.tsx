"use client";

import { useEffect, useState } from "react";
import type { MonitoringAnalytics } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { ErrorsOverTimeChart } from "./ErrorsOverTimeChart";
import { ErrorsBySourceStats } from "./ErrorsBySourceStats";
import { RecentErrorsTable } from "./RecentErrorsTable";
import { RequestVolumeChart } from "./RequestVolumeChart";
import { LatencyChart } from "./LatencyChart";
import { StatusCodeBreakdownStats } from "./StatusCodeBreakdownStats";
import { SlowestRoutesTable } from "./SlowestRoutesTable";
import { SlowQueriesTable } from "./SlowQueriesTable";
import { PlacesApiCallsChart } from "./PlacesApiCallsChart";
import { PlacesApiByEndpointStats } from "./PlacesApiByEndpointStats";

type State =
  | { status: "loading" }
  | { status: "ready"; analytics: MonitoringAnalytics }
  | { status: "error"; message: string };

// Shorter default window than the neighborhood/venue Analytics tabs (30
// days) -- errors and request volume are noisier day-to-day, so 24h/7d/30d
// is more useful here than 7/30/90.
const RANGE_OPTIONS = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

// Super-admin Monitoring tab (BACKLOG.md Ref 104): errors (API + web) and
// request volume/latency, rolled on Postgres rather than a third-party
// service -- backed by a single get_monitoring_analytics RPC, mirroring the
// neighborhood-admin/business-admin Analytics tabs' single-RPC pattern.
export default function MonitoringPage() {
  const [days, setDays] = useState(7);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/admin/monitoring/analytics?days=${days}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load monitoring analytics" });
        return;
      }
      setState({ status: "ready", analytics: await res.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-extrabold">Monitoring</h1>
          <p className="mt-1 text-[15px] text-body-text">
            Errors, request activity, DB query latency, and outbound Google Places API calls.
          </p>
        </div>
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setDays(opt.days)}
              className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                days === opt.days
                  ? "bg-foreground text-background"
                  : "border-1.5 border-border bg-card text-muted-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {state.status === "loading" && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      )}

      {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}

      {state.status === "ready" && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Errors over time</h2>
            <ErrorsOverTimeChart data={state.analytics.errors_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Errors by source</h2>
            <ErrorsBySourceStats data={state.analytics.errors_by_source} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Status codes</h2>
            <StatusCodeBreakdownStats data={state.analytics.status_code_breakdown} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Recent errors</h2>
            <RecentErrorsTable errors={state.analytics.recent_errors} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Request volume</h2>
            <RequestVolumeChart data={state.analytics.request_volume_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Latency</h2>
            <LatencyChart data={state.analytics.latency_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Slowest routes</h2>
            <SlowestRoutesTable routes={state.analytics.slowest_routes} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Slowest queries</h2>
            <p className="mb-3 text-xs text-muted">
              DB-level latency (pg_stat_statements) — pairs with slowest routes above to tell whether a slow
              route is slow because of the app or the query.
            </p>
            <SlowQueriesTable queries={state.analytics.slowest_queries} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Google Places API calls</h2>
            <PlacesApiCallsChart data={state.analytics.places_api_calls_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Places API calls by endpoint</h2>
            <PlacesApiByEndpointStats data={state.analytics.places_api_by_endpoint} />
          </section>
        </div>
      )}
    </div>
  );
}
