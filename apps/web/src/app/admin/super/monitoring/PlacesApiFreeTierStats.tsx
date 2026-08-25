import { PLACES_API_NEAR_LIMIT_THRESHOLD, PLACES_API_PRICING, type MonitoringPlacesApiMonthToDate } from "@blockwise/types";

const LABELS: Record<MonitoringPlacesApiMonthToDate["endpoint"], string> = {
  searchNearby: "Nearby search",
  searchText: "Text search",
  getPlaceDetails: "Place details",
  fetchPhotoMedia: "Photo media",
};
const ORDER: MonitoringPlacesApiMonthToDate["endpoint"][] = [
  "searchNearby",
  "searchText",
  "getPlaceDetails",
  "fetchPhotoMedia",
];
// Mirrors app.ts's getPlacesClient() -- only these two are actually guarded
// (QuotaGuardedPlacesClient), since they're the ones that fire on ordinary
// visitor page views rather than an admin clicking a button.
const GUARDED: Record<MonitoringPlacesApiMonthToDate["endpoint"], boolean> = {
  searchNearby: false,
  searchText: false,
  getPlaceDetails: true,
  fetchPhotoMedia: true,
};

// Month-to-date usage against each endpoint's Google free tier
// (PLACES_API_PRICING) -- independent of the page's days filter, since the
// free tier resets monthly (midnight Pacific Time on the 1st, not UTC --
// see google_places_billing_month_start() in Postgres) regardless of which
// window is selected above.
// Doubles as a live view into the cost guardrail (apps/api/src/places/
// quotaGuard.ts): the same 90% threshold that flips a bar red here is the
// threshold that makes the backend start skipping calls.
export function PlacesApiFreeTierStats({ data }: { data: MonitoringPlacesApiMonthToDate[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d.count]));

  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((endpoint) => {
        const count = byEndpoint.get(endpoint) ?? 0;
        const { freeMonthlyEvents } = PLACES_API_PRICING[endpoint];
        const percent = Math.min((count / freeMonthlyEvents) * 100, 100);
        const nearLimit = count >= freeMonthlyEvents * PLACES_API_NEAR_LIMIT_THRESHOLD;

        return (
          <div key={endpoint}>
            <div className="flex items-center justify-between text-xs font-extrabold">
              <span className="text-foreground">{LABELS[endpoint]}</span>
              <span className={nearLimit ? "text-red-600 dark:text-red-400" : "text-muted"}>
                {count.toLocaleString()} / {freeMonthlyEvents.toLocaleString()} free this month
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full ${nearLimit ? "bg-red-500 dark:bg-red-400" : "bg-brand-green"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {nearLimit && GUARDED[endpoint] && (
              <p className="mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                Guardrail active — {LABELS[endpoint]} calls are being skipped this month to stay within the free tier.
              </p>
            )}
            {nearLimit && !GUARDED[endpoint] && (
              <p className="mt-1 text-[11px] text-muted">
                Near the free tier, but not guardrailed — {LABELS[endpoint]} is admin-triggered, not gated.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
