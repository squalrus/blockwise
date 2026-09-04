"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringRequestVolumeByDayAndStatusClass } from "@blockwise/types";
import { STATUS_CLASS_COLORS, STATUS_CLASS_LABELS, STATUS_CLASS_ORDER } from "./statusClasses";

const TOTAL_COLOR = "var(--foreground)";
const TOTAL_LABEL = "Total";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DailyPoint = { date: string; total: number; "2xx": number; "3xx": number; "4xx": number; "5xx": number };

function toDailyByStatusClass(data: MonitoringRequestVolumeByDayAndStatusClass[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const row of data) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, total: 0, "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
      byDate.set(row.date, point);
    }
    point[row.status_class] += row.count;
    point.total += row.count;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Every status class (2xx/3xx/4xx/5xx) is overlaid on the same axes as its
// own line (not stacked), plus a total area underneath -- same shape as
// ErrorsOverTimeChart/PlacesApiCallsChart's per-category breakdowns, just
// for request_log's status-code dimension. Makes a 5xx spike visible against
// overall request volume instead of only showing up as a count in the
// StatusCodeBreakdownStats tiles above.
export function RequestsByStatusClassChart({ data }: { data: MonitoringRequestVolumeByDayAndStatusClass[] }) {
  const daily = toDailyByStatusClass(data);

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
        {STATUS_CLASS_ORDER.map((statusClass) => (
          <Line
            key={statusClass}
            type="monotone"
            dataKey={statusClass}
            name={STATUS_CLASS_LABELS[statusClass]}
            stroke={STATUS_CLASS_COLORS[statusClass]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
