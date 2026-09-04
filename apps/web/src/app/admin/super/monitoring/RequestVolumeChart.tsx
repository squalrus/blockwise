"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringRequestVolumeByDayAndScope, MonitoringRouteScope } from "@blockwise/types";
import { ROUTE_SCOPE_OPTIONS } from "./MonitoringContext";

const TOTAL_COLOR = "var(--foreground)";
const TOTAL_LABEL = "Total";

// One color per route scope -- ROUTE_SCOPE_OPTIONS (MonitoringContext.tsx)
// already carries the App/Admin/Auth order and labels shared with the
// header's filter pills; colors live here since this chart is the only
// place route scope gets a color instead of a plain pill.
const SCOPE_COLORS: Record<MonitoringRouteScope, string> = {
  app: "var(--brand-green)",
  admin: "var(--brand-purple)",
  auth: "var(--brand-amber)",
};

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DailyPoint = { date: string; total: number } & Record<MonitoringRouteScope, number>;

function toDailyByScope(data: MonitoringRequestVolumeByDayAndScope[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const row of data) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, total: 0, app: 0, admin: 0, auth: 0 };
      byDate.set(row.date, point);
    }
    point[row.scope] += row.count;
    point.total += row.count;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Every route scope (App/Admin/Auth) is overlaid on the same axes as its own
// line (not stacked), plus a total area underneath -- same shape as
// PlacesApiCallsChart's per-endpoint breakdown, just for request_log's own
// categorical dimension instead of Places API endpoint. Deliberately fed
// request_volume_by_day_and_scope (unfiltered by the page's own route-scope
// selector) rather than the plain request_volume_over_time total, so a
// spike in one scope (e.g. Admin) is visible against the overall trend
// instead of being hidden inside a single aggregate line.
export function RequestVolumeChart({ data }: { data: MonitoringRequestVolumeByDayAndScope[] }) {
  const daily = toDailyByScope(data);

  if (daily.length === 0) {
    return <p className="text-sm text-muted">No requests logged in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(value, name) => [Number(value ?? 0).toLocaleString(), name]}
          labelFormatter={(label) => formatDay(String(label ?? ""))}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
          formatter={(value) => <span style={{ color: "var(--muted-strong)" }}>{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="total"
          name={TOTAL_LABEL}
          stroke={TOTAL_COLOR}
          strokeWidth={2}
          fill={TOTAL_COLOR}
          fillOpacity={0.08}
        />
        {ROUTE_SCOPE_OPTIONS.map((opt) => (
          <Line
            key={opt.value}
            type="monotone"
            dataKey={opt.value}
            name={opt.label}
            stroke={SCOPE_COLORS[opt.value]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
