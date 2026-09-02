import {
  GEOAPIFY_FREE_DAILY_CREDITS,
  PLACES_API_CREDIT_COST,
  PLACES_API_NEAR_LIMIT_THRESHOLD,
  type MonitoringPlacesApiDayToDate,
} from "@blockwise/types";
import { estimateCredits, formatCredits } from "./placesApiCredits";

const LABELS: Record<MonitoringPlacesApiDayToDate["endpoint"], string> = {
  searchPlaces: "Places search",
  searchText: "Text search",
  reverseGeocode: "Reverse geocode",
  getPlaceDetails: "Place details",
};
const ORDER: MonitoringPlacesApiDayToDate["endpoint"][] = ["searchPlaces", "searchText", "reverseGeocode", "getPlaceDetails"];
// Mirrors app.ts's getPlacesClient() -- only getPlaceDetails is actually
// guarded (QuotaGuardedPlacesClient), since it's the one that fires on
// ordinary visitor page views rather than an admin clicking a button.
// searchPlaces/searchText/reverseGeocode are all admin-triggered (neighborhood
// sync, boundary preview, investigate-missing-venue), so they aren't gated
// -- but their credit usage still counts toward the shared pool below.
const GUARDED_ENDPOINT = "getPlaceDetails";

// Today's usage against Geoapify's *shared* daily free-credit pool
// (GEOAPIFY_FREE_DAILY_CREDITS) -- independent of the page's days filter,
// since the free tier resets daily (midnight UTC -- see
// geoapify_billing_day_start() in Postgres) regardless of which window is
// selected above. Unlike Google's old per-endpoint monthly tiers, Geoapify
// meters one pool across every endpoint, so this shows one overall gauge
// rather than a separate bar per endpoint (a separate bar per endpoint
// would wrongly imply each gets its own 3,000/day).
// Doubles as a live view into the cost guardrail (apps/api/src/places/
// quotaGuard.ts): the same 90% threshold that flips the gauge red here is
// the threshold that makes the backend start skipping getPlaceDetails calls.
export function PlacesApiFreeTierStats({ data }: { data: MonitoringPlacesApiDayToDate[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d.count]));
  const totalCredits = ORDER.reduce((sum, endpoint) => sum + estimateCredits(byEndpoint.get(endpoint) ?? 0, endpoint), 0);
  const percent = Math.min((totalCredits / GEOAPIFY_FREE_DAILY_CREDITS) * 100, 100);
  const nearLimit = totalCredits >= GEOAPIFY_FREE_DAILY_CREDITS * PLACES_API_NEAR_LIMIT_THRESHOLD;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span className="text-foreground">Daily credits</span>
          <span className={nearLimit ? "text-red-600 dark:text-red-400" : "text-muted"}>
            {formatCredits(totalCredits)} / {GEOAPIFY_FREE_DAILY_CREDITS.toLocaleString()} free today
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${nearLimit ? "bg-red-500 dark:bg-red-400" : "bg-brand-green"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {nearLimit && (
          <p className="mt-1 text-[11px] font-bold text-red-600 dark:text-red-400">
            Guardrail active — Place details calls are being skipped today to stay within the free tier.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {ORDER.map((endpoint) => {
          const count = byEndpoint.get(endpoint) ?? 0;
          const credits = estimateCredits(count, endpoint);
          return (
            <div key={endpoint} className="flex items-center justify-between text-xs">
              <span className="font-bold text-muted-strong">
                {LABELS[endpoint]}
                {endpoint === GUARDED_ENDPOINT && <span className="ml-1 text-muted">(guarded)</span>}
              </span>
              <span className="font-bold text-muted">
                {count.toLocaleString()} calls · {formatCredits(credits)}
              </span>
            </div>
          );
        })}
        <p className="text-[11px] text-muted">
          Weighted at {PLACES_API_CREDIT_COST.getPlaceDetails.creditsPerRequest} credit/request -- doesn&rsquo;t
          include Geoapify&rsquo;s bonus credit per extra 20 results on a large search, so real usage may run
          slightly ahead of this total.
        </p>
      </div>
    </div>
  );
}
