"use client";

import type { MonitoringSlowestRoute } from "@blockwise/types";

const COLOR = "var(--brand-amber)";

// Mirrors TopVenuesLeaderboard's plain meter-bar rows -- no link target
// here (a route path isn't a page), so a chart-library bar chart would work
// just as well, but this keeps the same visual language as the rest of the
// admin analytics tabs.
export function SlowestRoutesTable({ routes }: { routes: MonitoringSlowestRoute[] }) {
  if (routes.length === 0) {
    return <p className="text-sm text-muted">No requests logged in this window yet.</p>;
  }

  const max = Math.max(...routes.map((r) => r.avg_ms));

  return (
    <ul className="flex flex-col gap-2.5">
      {routes.map((route) => (
        <li key={route.path}>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate font-mono text-sm font-bold text-foreground">{route.path}</span>
              <span className="shrink-0 font-mono text-xs font-bold" style={{ color: COLOR }}>
                {route.avg_ms}ms avg · {route.request_count} req
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/15">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(4, (route.avg_ms / max) * 100)}%`, background: COLOR }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
