"use client";

import type { MonitoringSlowQuery } from "@blockwise/types";

// DB-level query latency (pg_stat_statements via get_slow_queries), pairing
// with SlowestRoutesTable's Express-level latency -- a slow route shows up
// in one or the other depending on whether the bottleneck is the app or the
// query itself.
export function SlowQueriesTable({ queries }: { queries: MonitoringSlowQuery[] }) {
  if (queries.length === 0) {
    return <p className="text-sm text-muted">No queries with 5+ calls in this window yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {queries.map((q, i) => (
        <li key={i} className="py-2.5">
          <pre
            title={q.query}
            className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted-strong"
          >
            {q.query}
          </pre>
          <div className="mt-1 flex gap-3 text-[11px] font-bold text-muted">
            <span>{q.mean_exec_time}ms avg</span>
            <span>{q.total_exec_time}ms total</span>
            <span>{q.calls} calls</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
