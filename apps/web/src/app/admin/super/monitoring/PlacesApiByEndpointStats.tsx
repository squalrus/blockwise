import type { MonitoringPlacesApiByEndpoint } from "@blockwise/types";
import { MushroomIcon } from "../../../StatTile";

const LABELS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchNearby: "Nearby search",
  searchText: "Text search",
  getPlaceDetails: "Place details",
  fetchPhotoMedia: "Photo media",
};
// Exactly 4 endpoints, exactly 4 brand colors -- one each, no reuse needed.
const COLORS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchNearby: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  getPlaceDetails: "var(--brand-green)",
  fetchPhotoMedia: "var(--brand-orange)",
};
const ORDER: MonitoringPlacesApiByEndpoint["endpoint"][] = [
  "searchNearby",
  "searchText",
  "getPlaceDetails",
  "fetchPhotoMedia",
];

// Not a plain StatTile reuse (unlike ErrorsBySourceStats/StatusCodeBreakdownStats)
// -- each endpoint needs a secondary error count alongside its call count,
// which StatTile's single-value layout doesn't have room for.
export function PlacesApiByEndpointStats({ data }: { data: MonitoringPlacesApiByEndpoint[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d]));

  return (
    <div className="grid grid-cols-2 gap-3">
      {ORDER.map((endpoint) => {
        const stat = byEndpoint.get(endpoint);
        return (
          <div key={endpoint} className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4.5 py-4">
            <div className="flex items-center gap-2">
              <MushroomIcon color={COLORS[endpoint]} />
              <span className="text-xs font-extrabold text-muted">{LABELS[endpoint]}</span>
            </div>
            <div className="font-heading text-3xl font-extrabold" style={{ color: COLORS[endpoint] }}>
              {stat?.count ?? 0}
            </div>
            {!!stat?.error_count && (
              <div className="text-[11px] font-bold text-red-600 dark:text-red-400">{stat.error_count} failed</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
