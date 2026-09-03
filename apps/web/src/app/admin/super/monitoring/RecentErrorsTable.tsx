"use client";

import { useState } from "react";
import type { MonitoringRecentError } from "@blockwise/types";

const SOURCE_COLOR: Record<MonitoringRecentError["source"], string> = {
  api: "var(--brand-orange)",
  web: "var(--brand-purple)",
  marketing: "var(--brand-amber)",
};
// "web" reads as "App" here to match ErrorsBySourceStats' tile labeling --
// the underlying source value stays "web" (it's what error_log/the RPC
// already use) since apps/web is this dashboard's original "app" frontend.
const SOURCE_LABEL: Record<MonitoringRecentError["source"], string> = {
  api: "api",
  web: "app",
  marketing: "marketing",
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The only interactive/expandable piece of the tab -- stack traces are long,
// so each row is collapsed to its message by default and expands on click
// rather than a chart or table cell trying to show everything at once.
export function RecentErrorsTable({ errors }: { errors: MonitoringRecentError[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (errors.length === 0) {
    return <p className="text-sm text-muted">No errors in this window. 🎉</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {errors.map((err) => {
        const expanded = expandedId === err.id;
        return (
          <li key={err.id} className="py-2.5">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : err.id)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase text-on-accent"
                style={{ background: SOURCE_COLOR[err.source] }}
              >
                {SOURCE_LABEL[err.source]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{err.message}</div>
                <div className="text-[11px] text-muted">
                  {formatTimestamp(err.created_at)}
                  {err.domain && ` · ${err.domain}`}
                  {err.app_version && ` · v${err.app_version}`}
                </div>
              </div>
            </button>
            {expanded && (err.stack || err.context) && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted/10 p-3 font-mono text-[11px] whitespace-pre-wrap text-muted-strong">
                {err.stack ?? JSON.stringify(err.context, null, 2)}
              </pre>
            )}
          </li>
        );
      })}
    </ul>
  );
}
