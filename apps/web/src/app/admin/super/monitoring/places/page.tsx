"use client";

import { MonitoringData } from "../MonitoringContext";
import { PlacesApiCallsChart } from "../PlacesApiCallsChart";
import { PlacesApiByEndpointStats } from "../PlacesApiByEndpointStats";
import { PlacesApiFailuresList } from "../PlacesApiFailuresList";

// Monitoring > Google Places -- outbound Google Places API call volume and
// per-endpoint error rate, split out of the Overview page (see
// ../layout.tsx). Unlike every other chart here, these two aren't scoped by
// the domain/version filters in the header (places_api_call_log has no
// domain/app_version columns -- see InstrumentedPlacesClient), only by days.
export default function MonitoringPlacesPage() {
  return (
    <MonitoringData>
      {(analytics) => (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6 lg:col-span-2">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Google Places API calls</h2>
            <PlacesApiCallsChart data={analytics.places_api_calls_over_time} />
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
