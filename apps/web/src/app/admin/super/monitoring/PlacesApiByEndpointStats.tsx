import type { MonitoringPlacesApiByEndpoint } from "@blockwise/types";
import { MushroomIcon } from "../../../StatTile";
import { estimateCost, formatUsd } from "./placesApiCost";

// searchNearby/fetchPhotoMedia are Google-only and retired as of the
// Geoapify migration's Phase 4 (docs/geoapify-migration-plan.md) -- kept
// here only so historical rows from before the cutover still render a
// label/color; new rows never produce them. searchPlaces is Geoapify's
// replacement for searchNearby, reusing its color slot below since only
// one of the two is ever actively growing at a time. reverseGeocode (Ref
// 114 Phase 5's coordinate-based migration match) is the same Geocoding
// API family as searchText, reusing its slot for the same reason. Full
// rename/cleanup of this list is Phase 7.
const LABELS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchNearby: "Nearby search (retired)",
  searchPlaces: "Places search",
  searchText: "Text search",
  reverseGeocode: "Reverse geocode",
  getPlaceDetails: "Place details",
  fetchPhotoMedia: "Photo media (retired)",
};
// Only 4 brand colors exist -- searchPlaces/reverseGeocode reuse
// searchNearby's/searchText's slots (see comment above) rather than
// introducing a 5th and 6th.
const COLORS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchNearby: "var(--brand-purple)",
  searchPlaces: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  reverseGeocode: "var(--brand-amber)",
  getPlaceDetails: "var(--brand-green)",
  fetchPhotoMedia: "var(--brand-orange)",
};
const ORDER: MonitoringPlacesApiByEndpoint["endpoint"][] = [
  "searchPlaces",
  "searchNearby",
  "searchText",
  "reverseGeocode",
  "getPlaceDetails",
  "fetchPhotoMedia",
];

// Not a plain StatTile reuse (unlike ErrorsBySourceStats/StatusCodeBreakdownStats)
// -- each endpoint needs a secondary error count alongside its call count,
// which StatTile's single-value layout doesn't have room for.
export function PlacesApiByEndpointStats({ data }: { data: MonitoringPlacesApiByEndpoint[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d]));
  const totalCost = ORDER.reduce((sum, endpoint) => sum + estimateCost(byEndpoint.get(endpoint)?.count ?? 0, endpoint), 0);

  return (
    <div className="flex flex-col gap-3">
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
              <div className="text-[11px] font-bold text-muted">
                ≈{formatUsd(estimateCost(stat?.count ?? 0, endpoint))} est.
              </div>
              {!!stat?.error_count && (
                <div className="text-[11px] font-bold text-red-600 dark:text-red-400">{stat.error_count} failed</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        ≈{formatUsd(totalCost)} estimated for this window, at Google&rsquo;s published base-tier rates -- an upper
        bound, not the actual GCP bill (volume discounts and the monthly free tier aren&rsquo;t reflected here).
      </p>
    </div>
  );
}
