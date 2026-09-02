import type { MonitoringPlacesApiByEndpoint } from "@blockwise/types";
import { MushroomIcon } from "../../../StatTile";
import { estimateCredits, formatCredits } from "./placesApiCredits";

const LABELS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchPlaces: "Places search",
  searchText: "Text search",
  reverseGeocode: "Reverse geocode",
  getPlaceDetails: "Place details",
};
// 4 endpoints, 4 brand colors -- one each, no slot-sharing needed now that
// the Google-only searchNearby/fetchPhotoMedia values are gone (Phase 7 of
// the Geoapify migration).
const COLORS: Record<MonitoringPlacesApiByEndpoint["endpoint"], string> = {
  searchPlaces: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  reverseGeocode: "var(--brand-orange)",
  getPlaceDetails: "var(--brand-green)",
};
const ORDER: MonitoringPlacesApiByEndpoint["endpoint"][] = ["searchPlaces", "searchText", "reverseGeocode", "getPlaceDetails"];

// Not a plain StatTile reuse (unlike ErrorsBySourceStats/StatusCodeBreakdownStats)
// -- each endpoint needs a secondary error count alongside its call count,
// which StatTile's single-value layout doesn't have room for.
export function PlacesApiByEndpointStats({ data }: { data: MonitoringPlacesApiByEndpoint[] }) {
  const byEndpoint = new Map(data.map((d) => [d.endpoint, d]));
  const totalCredits = ORDER.reduce((sum, endpoint) => sum + estimateCredits(byEndpoint.get(endpoint)?.count ?? 0, endpoint), 0);

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
                {formatCredits(estimateCredits(stat?.count ?? 0, endpoint))}
              </div>
              {!!stat?.error_count && (
                <div className="text-[11px] font-bold text-red-600 dark:text-red-400">{stat.error_count} failed</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {formatCredits(totalCredits)} used for this window, at Geoapify&rsquo;s per-request rate (1 credit each) --
        doesn&rsquo;t include the bonus credit Geoapify charges per extra 20 results on a large search, so treat
        this as a lower-bound estimate of real usage, not an exact count.
      </p>
    </div>
  );
}
