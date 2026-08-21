"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonitoringLatencyByDay } from "@blockwise/types";

const AVG_COLOR = "var(--brand-green)";
const P95_COLOR = "var(--brand-amber)";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Two related series (avg vs. p95 latency) over time -- unlike the app's
// other analytics charts, which are all single-series, this genuinely needs
// two distinguishable hues plus a legend (dataviz skill: color follows the
// job the data does).
export function LatencyChart({ data }: { data: MonitoringLatencyByDay[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No requests logged in this window yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          unit="ms"
        />
        <Tooltip
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
          wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
          formatter={(value) => (value === "avg_ms" ? "Avg" : "p95")}
        />
        <Line type="monotone" dataKey="avg_ms" name="avg_ms" stroke={AVG_COLOR} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="p95_ms" name="p95_ms" stroke={P95_COLOR} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
