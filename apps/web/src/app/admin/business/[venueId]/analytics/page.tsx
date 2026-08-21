"use client";

import { useEffect, useState } from "react";
import type { VenueAnalytics } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useBusinessAdmin } from "../BusinessAdminContext";
import { CheckinsOverTimeChart } from "./CheckinsOverTimeChart";
import { ActivityByTypeStats } from "./ActivityByTypeStats";
import { CheckinsByDayOfWeekChart } from "./CheckinsByDayOfWeekChart";
import { CouponClaimsChart } from "./CouponClaimsChart";

type State =
  | { status: "loading" }
  | { status: "ready"; analytics: VenueAnalytics }
  | { status: "error"; message: string };

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

// Analytics tab: charts/breakdowns of activity for this venue, backed by a
// single get_venue_analytics RPC (one fetch covers check-ins-over-time,
// activity-by-type, checkins-by-day-of-week, and coupon-claims-over-time) --
// mirrors admin/neighborhood/[neighborhoodSlug]/analytics/page.tsx.
// locations_by_category_group/top_venues don't have a venue-scoped
// equivalent (those are neighborhood-collection concepts), so this tab
// swaps in day-of-week and coupon-claims charts instead. Loading/forbidden
// state lives in layout.tsx, mirroring every other tab.
export default function BusinessAdminAnalyticsPage() {
  const { venueId } = useBusinessAdmin();
  const [days, setDays] = useState(30);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/analytics?days=${days}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load venue analytics" });
        return;
      }
      setState({ status: "ready", analytics: await res.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [venueId, days]);

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-extrabold">Analytics</h1>
          <p className="mt-1 text-[15px] text-body-text">Charts and breakdowns of activity at this venue.</p>
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
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Check-ins over time</h2>
            <CheckinsOverTimeChart data={state.analytics.checkins_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Activity</h2>
            <ActivityByTypeStats data={state.analytics.activity_by_type} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Check-ins by day of week</h2>
            <CheckinsByDayOfWeekChart data={state.analytics.checkins_by_day_of_week} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Coupon claims over time</h2>
            <CouponClaimsChart data={state.analytics.coupon_claims_over_time} />
          </section>
        </div>
      )}
    </div>
  );
}
