"use client";

import { MonitoringData } from "../MonitoringContext";
import { RequestVolumeChart } from "../RequestVolumeChart";
import { LatencyChart } from "../LatencyChart";
import { CheckinTimingChart } from "../CheckinTimingChart";
import { SlowestRoutesTable } from "../SlowestRoutesTable";
import { SlowQueriesTable } from "../SlowQueriesTable";

// Monitoring > API Performance -- request volume, latency, and the slowest
// routes/queries, split out of the Overview page (see ../layout.tsx). Every
// chart here is apps/api's own backend request timing -- unlike Errors,
// there's no App/Marketing split by *frontend*, since neither's own
// page-render time is instrumented, only what they ask the API to do.
// "API" is prefixed on the page title and every section heading here (see
// super/layout.tsx's nav and ../layout.tsx's SUB_PAGES) because every chart
// on this page -- including the "App" route scope -- is backend request/
// query timing, never frontend page-render time; nothing here is scoped to
// one frontend the way Errors' App/API/Marketing split is. Its own
// route-scope filter (App/Admin/Auth, derived from request_log.path) lives
// in the shared header instead of here -- see layout.tsx's MonitoringHeader
// -- so it gets the same row spacing as Domain/Range/Version, shown only
// while this sub-page is active.
export default function MonitoringPerformancePage() {
  return (
    <MonitoringData>
      {(analytics) => (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">API request volume</h2>
            <RequestVolumeChart data={analytics.request_volume_by_day_and_scope} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">API latency</h2>
            <LatencyChart data={analytics.latency_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">API slowest routes</h2>
            <SlowestRoutesTable routes={analytics.slowest_routes} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Check-in timing</h2>
            <p className="mb-3 text-xs text-muted">
              POST /locations/:id/checkins broken down by phase (geofence/cooldown, then -- only for a
              successful check-in -- rewards, neighbor notifications, and collection), run concurrently
              (BACKLOG.md Ref 116), so Total tracking below their sum is expected. Daily averages the day's
              attempts per phase; Individual plots the (up to 500 most recent, within the selected window)
              attempts one point each, for spotting outliers a daily average would hide.
            </p>
            <CheckinTimingChart daily={analytics.checkin_timing_over_time} recent={analytics.checkin_timing_recent} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">API slowest queries</h2>
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
