import type { MonitoringPlacesApiByEndpoint } from "@blockwise/types";
import { MushroomIcon } from "../../../StatTile";
import { formatCredits } from "./placesApiCredits";
import { PLACES_API_ENDPOINT_COLORS, PLACES_API_ENDPOINT_LABELS, PLACES_API_ENDPOINT_ORDER } from "./placesApiEndpoints";

// Not a plain StatTile reuse (unlike ErrorsBySourceStats/StatusCodeBreakdownStats)
// -- each endpoint needs a secondary error count alongside its call count,
// which StatTile's single-value layout doesn't have room for.
export function PlacesApiByEndpointStats({ data }: { data: MonitoringPlacesApiByEndpoint[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d]));
  const totalCredits = data.reduce((sum, d) => sum + d.credits, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {PLACES_API_ENDPOINT_ORDER.map((endpoint) => {
          const stat = byEndpoint.get(endpoint);
          return (
            <div key={endpoint} className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4.5 py-4">
              <div className="flex items-center gap-2">
                <MushroomIcon color={PLACES_API_ENDPOINT_COLORS[endpoint]} />
                <span className="text-xs font-extrabold text-muted">{PLACES_API_ENDPOINT_LABELS[endpoint]}</span>
              </div>
              <div className="font-heading text-3xl font-extrabold" style={{ color: PLACES_API_ENDPOINT_COLORS[endpoint] }}>
                {stat?.count ?? 0}
              </div>
              <div className="text-[11px] font-bold text-muted">{formatCredits(stat?.credits ?? 0)}</div>
              {!!stat?.error_count && (
                <div className="text-[11px] font-bold text-red-600 dark:text-red-400">{stat.error_count} failed</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {formatCredits(totalCredits)} used for this window, weighted per call by actual result count -- includes
        Geoapify&rsquo;s bonus credit per extra 20 results on a large search.
      </p>
    </div>
  );
}
