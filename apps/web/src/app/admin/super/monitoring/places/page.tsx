"use client";

import { MonitoringData } from "../MonitoringContext";
import { PlacesApiCallsChart } from "../PlacesApiCallsChart";
import { PlacesApiCostChart } from "../PlacesApiCostChart";
import { PlacesApiByEndpointStats } from "../PlacesApiByEndpointStats";
import { PlacesApiFailuresList } from "../PlacesApiFailuresList";
import { PlacesApiFreeTierStats } from "../PlacesApiFreeTierStats";

// Monitoring > Google Places -- outbound Google Places API call volume,
// estimated cost, and per-endpoint error rate, split out of the Overview
// page (see ../layout.tsx). Unlike every other chart here, most of these
// sections aren't scoped by the domain/version filters in the header
// (places_api_call_log has no domain/app_version columns -- see
// InstrumentedPlacesClient), only by days. The free-tier section is the one
// exception even to the days filter -- it's always this month to date on
// Google's own boundary (midnight Pacific Time on the 1st, not UTC -- see
// places_api_month_to_date_by_endpoint's own comment).
export default function MonitoringPlacesPage() {
  return (
    <MonitoringData>
      {(analytics) => (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="font-heading text-lg font-extrabold">Monthly free tier</h2>
            <p className="mb-3.5 text-xs text-muted">
              Month-to-date, regardless of the days filter above -- Google&rsquo;s free tier resets at midnight
              Pacific Time on the 1st, not UTC midnight.
            </p>
            <PlacesApiFreeTierStats data={analytics.places_api_month_to_date_by_endpoint} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Google Places API calls</h2>
            <PlacesApiCallsChart data={analytics.places_api_calls_over_time} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Estimated cost</h2>
            <PlacesApiCostChart data={analytics.places_api_calls_by_day_and_endpoint} />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Places API calls by endpoint</h2>
            <PlacesApiByEndpointStats data={analytics.places_api_by_endpoint} />
            <div className="mt-4">
              <PlacesApiFailuresList failures={analytics.recent_places_api_failures} />
            </div>
          </section>
        </div>
      )}
    </MonitoringData>
  );
}
