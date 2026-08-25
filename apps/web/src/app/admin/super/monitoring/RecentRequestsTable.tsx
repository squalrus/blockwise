import type { MonitoringRecentRequest } from "@blockwise/types";

// Same color mapping as StatusCodeBreakdownStats, keyed by the status-code
// digit rather than imported from there to avoid a cross-component coupling
// for four hex strings.
const STATUS_COLOR: Record<"2" | "3" | "4" | "5", string> = {
  "2": "var(--brand-green)",
  "3": "var(--brand-purple)",
  "4": "var(--brand-amber)",
  "5": "var(--brand-orange)",
};

function statusColor(statusCode: number): string {
  const digit = String(Math.floor(statusCode / 100)) as "2" | "3" | "4" | "5";
  return STATUS_COLOR[digit] ?? "var(--muted)";
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// request_log's counterpart to RecentErrorsTable: raw method/path/status/
// duration rows rather than console.error'd exceptions -- a plain 4xx/5xx
// response never reaches error_log, so this is the only place to see which
// request actually produced one. Filtered server-side by the Status codes
// tile the caller has selected (or unfiltered, showing the latest 50 across
// every status class).
export function RecentRequestsTable({ requests }: { requests: MonitoringRecentRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted">No requests in this window.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {requests.map((req) => (
        <li key={req.id} className="flex items-start gap-3 py-2.5">
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-on-accent"
            style={{ background: statusColor(req.status_code) }}
          >
            {req.status_code}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">
              <span className="text-muted">{req.method}</span> {req.path}
            </div>
            <div className="text-[11px] text-muted">
              {formatTimestamp(req.created_at)} · {req.duration_ms}ms
              {req.domain && ` · ${req.domain}`}
              {req.app_version && ` · v${req.app_version}`}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
