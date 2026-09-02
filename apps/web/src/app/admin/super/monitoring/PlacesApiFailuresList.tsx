import type { MonitoringPlacesApiFailure } from "@blockwise/types";

// Same 4 endpoints/labels/colors as PlacesApiByEndpointStats, kept separate
// rather than imported to avoid a cross-component coupling for four strings
// and four hex values.
const LABELS: Record<MonitoringPlacesApiFailure["endpoint"], string> = {
  searchPlaces: "Places search",
  searchText: "Text search",
  reverseGeocode: "Reverse geocode",
  getPlaceDetails: "Place details",
};
const COLORS: Record<MonitoringPlacesApiFailure["endpoint"], string> = {
  searchPlaces: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  reverseGeocode: "var(--brand-orange)",
  getPlaceDetails: "var(--brand-green)",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Pairs with PlacesApiByEndpointStats' per-endpoint "N failed" counts --
// the actual failed calls behind those counts (endpoint + the underlying
// Geoapify API error, from InstrumentedPlacesClient's catch in
// instrumentedClient.ts), so a spike can be investigated instead of just
// observed. request_context/domain/app_version mirror what RecentErrorsTable/
// RecentRequestsTable already show for error_log/request_log rows -- what
// was actually requested (e.g. which place ID), which deployment logged it,
// and which shipped version.
export function PlacesApiFailuresList({ failures }: { failures: MonitoringPlacesApiFailure[] }) {
  if (failures.length === 0) {
    return <p className="text-sm text-muted">No failed calls in this window. 🎉</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {failures.map((failure) => (
        <li key={failure.id} className="flex items-start gap-3 py-2.5">
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-on-accent"
            style={{ background: COLORS[failure.endpoint] }}
          >
            {LABELS[failure.endpoint]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">
              {failure.error_message ?? "No error message recorded"}
            </div>
            {failure.request_context && (
              <div className="truncate text-[11px] font-bold text-muted-strong">{failure.request_context}</div>
            )}
            <div className="text-[11px] text-muted">
              {formatTimestamp(failure.created_at)} · {failure.duration_ms}ms
              {failure.domain && ` · ${failure.domain}`}
              {failure.app_version && ` · v${failure.app_version}`}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
