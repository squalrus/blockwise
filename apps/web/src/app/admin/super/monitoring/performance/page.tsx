"use client";

import { MonitoringData } from "../MonitoringContext";
import { RequestVolumeChart } from "../RequestVolumeChart";
import { LatencyChart } from "../LatencyChart";
import { SlowestRoutesTable } from "../SlowestRoutesTable";
import { SlowQueriesTable } from "../SlowQueriesTable";

// Monitoring > Performance -- request volume, latency, and the slowest
// routes/queries, split out of the Overview page (see ../layout.tsx).
export default function MonitoringPerformancePage() {
  return (
    <MonitoringData>
      {(analytics) => (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Request volume</h2>
            <RequestVolumeChart data={analytics.request_volume_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Latency</h2>
            <LatencyChart data={analytics.latency_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Slowest routes</h2>
            <SlowestRoutesTable routes={analytics.slowest_routes} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Slowest queries</h2>
            <p className="mb-3 text-xs text-muted">
              DB-level latency (pg_stat_statements) — pairs with slowest routes above to tell whether a slow
              route is slow because of the app or the query.
            </p>
            <SlowQueriesTable queries={analytics.slowest_queries} />
          </section>
        </div>
      )}
    </MonitoringData>
  );
}
