"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringErrorsByDayAndSource } from "@blockwise/types";
import { ERROR_LOG_SOURCE_COLORS, ERROR_LOG_SOURCE_LABELS, ERROR_LOG_SOURCE_ORDER } from "./errorSources";

const TOTAL_COLOR = "var(--foreground)";
const TOTAL_LABEL = "Total";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DailyPoint = { date: string; total: number; web: number; api: number; marketing: number };

function toDailyBySource(data: MonitoringErrorsByDayAndSource[]): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const row of data) {
    let point = byDate.get(row.date);
    if (!point) {
      point = { date: row.date, total: 0, web: 0, api: 0, marketing: 0 };
      byDate.set(row.date, point);
    }
    point[row.source] += row.count;
    point.total += row.count;
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Every source (App/API/Marketing) is overlaid on the same axes as its own
// line (not stacked), plus a total area underneath -- same shape as
// PlacesApiCallsChart/RequestVolumeChart's per-category breakdowns, just for
// error_log's own source dimension. A source-specific spike (e.g. Marketing)
// is visible against the overall trend instead of hidden inside one
// aggregate line.
export function ErrorsOverTimeChart({ data }: { data: MonitoringErrorsByDayAndSource[] }) {
  const daily = toDailyBySource(data);

  if (daily.length === 0) {
    return <p className="text-sm text-muted">No errors in this window. 🎉</p>;
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
        <YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
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
        {ERROR_LOG_SOURCE_ORDER.map((source) => (
          <Line
            key={source}
            type="monotone"
            dataKey={source}
            name={ERROR_LOG_SOURCE_LABELS[source]}
            stroke={ERROR_LOG_SOURCE_COLORS[source]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
