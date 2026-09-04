"use client";

import { MonitoringData, useMonitoring } from "../MonitoringContext";
import { RequestsByStatusClassChart } from "../RequestsByStatusClassChart";
import { RecentRequestsTable } from "../RecentRequestsTable";
import { StatusCodeBreakdownStats } from "../StatusCodeBreakdownStats";

// Monitoring > Requests -- request status-code volume/trend and the raw
// request log, split out of the Errors page (which had grown to cover both
// error_log and request_log content) once request volume got its own
// over-time chart alongside the existing status tiles/table. Request
// latency/route-scope-volume charts stay under Performance -- this page is
// specifically the status-code angle on request_log, the request-log
// counterpart to the Errors page's error-log angle.
export default function MonitoringRequestsPage() {
  const { statusClass, setStatusClass } = useMonitoring();

  return (
    <MonitoringData>
      {(analytics) => (
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Requests over time</h2>
            <RequestsByStatusClassChart data={analytics.request_volume_by_day_and_status_class} />
          </section>

          {/* Tiles double as filters for the list right below them (click
              one, click again to clear). */}
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
