import type { MonitoringPlacesApiFailure } from "@blockwise/types";

const LABELS: Record<MonitoringPlacesApiFailure["endpoint"], string> = {
  searchNearby: "Nearby search",
  searchText: "Text search",
  getPlaceDetails: "Place details",
  fetchPhotoMedia: "Photo media",
};
// Same mapping as PlacesApiByEndpointStats, kept separate rather than
// imported to avoid a cross-component coupling for four hex strings.
const COLORS: Record<MonitoringPlacesApiFailure["endpoint"], string> = {
  searchNearby: "var(--brand-purple)",
  searchText: "var(--brand-amber)",
  getPlaceDetails: "var(--brand-green)",
  fetchPhotoMedia: "var(--brand-orange)",
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
// Google API error, from InstrumentedPlacesClient's catch in
// instrumentedClient.ts), so a spike can be investigated instead of just
// observed.
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
            <div className="text-[11px] text-muted">
              {formatTimestamp(failure.created_at)} · {failure.duration_ms}ms
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
