"use client";

import { MonitoringData, useMonitoring } from "./MonitoringContext";
import { ErrorsOverTimeChart } from "./ErrorsOverTimeChart";
import { ErrorsBySourceStats } from "./ErrorsBySourceStats";
import { RecentErrorsTable } from "./RecentErrorsTable";
import { RecentRequestsTable } from "./RecentRequestsTable";
import { StatusCodeBreakdownStats } from "./StatusCodeBreakdownStats";

// Monitoring > Overview -- errors and status codes, the "is something on
// fire" view. Request/latency charts live under Performance, outbound
// Geoapify calls under Geoapify (see layout.tsx and
// super/layout.tsx's TABS for the sub-nav).
export default function MonitoringOverviewPage() {
  const { statusClass, setStatusClass } = useMonitoring();

  return (
    <MonitoringData>
      {(analytics) => (
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Errors over time</h2>
            <ErrorsOverTimeChart data={analytics.errors_over_time} />
          </section>

          {/* Summary tiles paired with the list they summarize, rather than
              a separate "Errors by source" card elsewhere on the page. */}
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Errors</h2>
            <ErrorsBySourceStats data={analytics.errors_by_source} />
            <div className="mt-4">
              <RecentErrorsTable errors={analytics.recent_errors} />
            </div>
          </section>

          {/* Same pairing for requests: Status codes tiles double as filters
              for the list right below them (click one, click again to
              clear). */}
          <section className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-extrabold">Requests</h2>
              {statusClass && (
                <button
                  type="button"
                  onClick={() => setStatusClass(null)}
                  className="shrink-0 rounded-full bg-card-alt px-3 py-1 text-xs font-extrabold text-muted-strong hover:text-foreground"
                >
                  {statusClass} only · clear
                </button>
              )}
            </div>
            <StatusCodeBreakdownStats
              data={analytics.status_code_breakdown}
              selected={statusClass}
              onSelect={setStatusClass}
            />
            <p className="mt-4 mb-3 text-xs text-muted">
              Every request&apos;s method, path, and status -- click a tile above to narrow this list to one
              status family and investigate a specific 4xx/5xx.
            </p>
            <RecentRequestsTable requests={analytics.recent_requests} />
          </section>
        </div>
      )}
    </MonitoringData>
  );
}
