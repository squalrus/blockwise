"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { MonitoringDailyCount } from "@blockwise/types";

const COLOR = "var(--brand-orange)";

function formatDay(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Mirrors CheckinsOverTimeChart (admin/neighborhood analytics) -- single
// series, so one hue and no legend.
export function ErrorsOverTimeChart({ data }: { data: MonitoringDailyCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">No errors in this window. 🎉</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          width={28}
        />
        <Tooltip
          formatter={(value) => [Number(value ?? 0), "Errors"]}
          labelFormatter={(label) => formatDay(String(label ?? ""))}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)", fontWeight: 700 }}
          itemStyle={{ color: COLOR }}
        />
        <Area type="monotone" dataKey="count" stroke={COLOR} strokeWidth={2} fill={COLOR} fillOpacity={0.1} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
