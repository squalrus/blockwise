"use client";

import { MonitoringData } from "./MonitoringContext";
import { StatTile, MushroomIcon } from "../../../StatTile";
import { ErrorsBySourceStats } from "./ErrorsBySourceStats";
import { RecentErrorsTable } from "./RecentErrorsTable";
import { PlacesApiFreeTierStats } from "./PlacesApiFreeTierStats";
import { estimateCredits } from "./placesApiCredits";

// Monitoring > Overview -- a true cross-section summary (one KPI strip plus
// one preview card per sub-page) rather than a fourth full page of charts.
// Errors/Performance/Geoapify each own the detailed view now; this page
// only has to answer "is anything on fire, at a glance" and hand off via
// each card's "View all ->" link. The Errors page used to live at this
// route (see ../errors/page.tsx, which now owns that content).
export default function MonitoringOverviewPage() {
  return (
    <MonitoringData>
      {(analytics) => {
        const totalErrors = analytics.errors_by_source.reduce((sum, d) => sum + d.count, 0);
        const totalRequests = analytics.status_code_breakdown.reduce((sum, d) => sum + d.count, 0);
        const avgLatency = analytics.latency_over_time.length
          ? Math.round(
              analytics.latency_over_time.reduce((sum, d) => sum + d.avg_ms, 0) / analytics.latency_over_time.length
            )
          : 0;
        const creditsToday = analytics.places_api_day_to_date_by_endpoint.reduce(
          (sum, d) => sum + estimateCredits(d.count, d.endpoint),
          0
        );
        const slowestRoute = analytics.slowest_routes[0];

        return (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <StatTile icon={<MushroomIcon color="var(--brand-orange)" />} label="Errors" value={totalErrors} color="var(--brand-orange)" />
              <StatTile icon={<MushroomIcon color="var(--brand-purple)" />} label="Requests" value={totalRequests} color="var(--brand-purple)" />
              <StatTile icon={<MushroomIcon color="var(--brand-green)" />} label="Avg latency (ms)" value={avgLatency} color="var(--brand-green)" />
              <StatTile icon={<MushroomIcon color="var(--brand-amber)" />} label="Geoapify credits today" value={creditsToday} color="var(--brand-amber)" />
            </div>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
              <section className="flex flex-col gap-3.5 rounded-3xl border border-border bg-card p-5.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-[17px] font-extrabold">Errors</h2>
                  <a href="/admin/super/monitoring/errors" className="text-xs font-bold text-brand-purple hover:text-brand-orange">
                    View all →
                  </a>
                </div>
                <ErrorsBySourceStats data={analytics.errors_by_source} />
                <RecentErrorsTable errors={analytics.recent_errors.slice(0, 3)} />
              </section>

              <section className="flex flex-col gap-3.5 rounded-3xl border border-border bg-card p-5.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-[17px] font-extrabold">API Performance</h2>
                  <a href="/admin/super/monitoring/performance" className="text-xs font-bold text-brand-purple hover:text-brand-orange">
                    View all →
                  </a>
                </div>
                <StatTile icon={<MushroomIcon color="var(--brand-green)" />} label="Avg latency" value={avgLatency} color="var(--brand-green)" />
                {slowestRoute ? (
                  <div>
                    <div className="mb-1 text-xs font-extrabold text-muted">Slowest route</div>
                    <div className="flex items-baseline justify-between gap-2 rounded-2xl border border-border bg-card-alt px-3.5 py-2.5">
                      <span className="truncate font-mono text-sm font-bold text-foreground">{slowestRoute.path}</span>
                      <span className="shrink-0 font-mono text-xs font-bold text-brand-amber">
                        {slowestRoute.avg_ms}ms avg
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">No requests logged in this window yet.</p>
                )}
              </section>

              <section className="flex flex-col gap-3.5 rounded-3xl border border-border bg-card p-5.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-[17px] font-extrabold">Geoapify</h2>
                  <a href="/admin/super/monitoring/places" className="text-xs font-bold text-brand-purple hover:text-brand-orange">
                    View all →
                  </a>
                </div>
                <PlacesApiFreeTierStats data={analytics.places_api_day_to_date_by_endpoint} />
              </section>
            </div>
          </div>
        );
      }}
    </MonitoringData>
  );
}
